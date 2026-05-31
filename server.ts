import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";

dotenv.config();

// Read firebase configuration dynamically to support server container
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf8")
);

// Initialize Firebase SDK internally on server
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

interface KarmaResult {
  total_karma: number;
  link_karma: number;
  comment_karma: number;
  awarder_karma: number;
  awardee_karma: number;
  method: string;
}

// Global Tier Rule Matching
function getKarmaTier(karma: number) {
  const k = Math.max(0, karma);
  const tiers = [
    { name: "Bronze", min: 400, max: 999 },
    { name: "Silver", min: 1000, max: 4999 },
    { name: "Gold", min: 5000, max: 9999 },
    { name: "Platinum", min: 10000, max: Infinity }
  ];
  const found = tiers.find(t => k >= t.min && k <= t.max);
  if (found) return found;
  if (k < 400) return tiers[0];
  return tiers[tiers.length - 1];
}

// Scrape helper with rotating proxy pool
async function fetchRedditKarmaInternal(cleanUser: string): Promise<KarmaResult> {
  const inspectResponseError = (status: number, text: string): string => {
    if (status === 429) return "RATE_LIMIT_REACHED";
    if (status === 403) return "PRIVATE_PROFILE";
    
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {}

    if (parsed?.error === 404 || status === 404) {
      if (parsed?.reason === "suspended" || parsed?.reason === "deleted" || 
          (parsed?.message && /suspended|deleted|deactivated/i.test(parsed.message))) {
        return "DELETED_OR_SUSPENDED";
      }
      return "USER_NOT_FOUND";
    }

    if (parsed?.error === 403) return "PRIVATE_PROFILE";
    if (parsed?.error === 429) return "RATE_LIMIT_REACHED";

    return "API_UNAVAILABLE";
  };

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  // Approach 1: OAuth client credentials flow
  if (clientId && clientSecret) {
    try {
      console.log(`[REDDIT SERVER API] Fetching via Reddit OAuth client credentials...`);
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "InfluencerVerseRedditSync/1.0.0 (by /u/kallol_admin)"
        },
        body: "grant_type=client_credentials"
      });

      if (tokenRes.ok) {
        const tokenData: any = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (accessToken) {
          const targetUrl = `https://oauth.reddit.com/user/${cleanUser}/about?raw_json=1&t=${Date.now()}`;
          const userRes = await fetch(targetUrl, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "User-Agent": "InfluencerVerseRedditSync/1.0.0 (by /u/kallol_admin)"
            }
          });

          const text = await userRes.text();
          if (!userRes.ok) {
            const errCode = inspectResponseError(userRes.status, text);
            throw new Error(errCode);
          }

          const userData = JSON.parse(text);
          const d = userData?.data;
          if (d) {
            if (d.is_suspended === true) {
              throw new Error("DELETED_OR_SUSPENDED");
            }
            const link_karma = typeof d.link_karma === 'number' ? d.link_karma : 0;
            const comment_karma = typeof d.comment_karma === 'number' ? d.comment_karma : 0;
            const awarder_karma = typeof d.awarder_karma === 'number' ? d.awarder_karma : 0;
            const awardee_karma = typeof d.awardee_karma === 'number' ? d.awardee_karma : 0;
            const total_karma = link_karma + comment_karma + awarder_karma + awardee_karma;

            return { total_karma, link_karma, comment_karma, awarder_karma, awardee_karma, method: "OAuth" };
          }
        }
      }
    } catch (err: any) {
      const errStr = err.message || "";
      if (["USER_NOT_FOUND", "DELETED_OR_SUSPENDED", "PRIVATE_PROFILE", "RATE_LIMIT_REACHED"].includes(errStr)) {
        throw err;
      }
      console.warn(`[REDDIT SERVER API] OAuth failed, attempting public fallback: ${errStr}`);
    }
  }

  // Approach 2: Direct public fetch with cache buster
  const directUrl = `https://www.reddit.com/user/${cleanUser}/about.json?raw_json=1&t=${Date.now()}`;
  try {
    console.log(`[REDDIT SERVER API] Fetching public Reddit profile: ${directUrl}`);
    const response = await fetch(directUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 (InfluencerVerseRedditSyncClient/1.0)",
        "Accept": "application/json"
      }
    });

    const text = await response.text();
    if (!response.ok) {
      const errCode = inspectResponseError(response.status, text);
      throw new Error(errCode);
    }

    const parsed = JSON.parse(text);
    const d = parsed?.data;
    if (d) {
      if (d.is_suspended === true) {
        throw new Error("DELETED_OR_SUSPENDED");
      }
      const link_karma = typeof d.link_karma === 'number' ? d.link_karma : 0;
      const comment_karma = typeof d.comment_karma === 'number' ? d.comment_karma : 0;
      const awarder_karma = typeof d.awarder_karma === 'number' ? d.awarder_karma : 0;
      const awardee_karma = typeof d.awardee_karma === 'number' ? d.awardee_karma : 0;
      const total_karma = link_karma + comment_karma + awarder_karma + awardee_karma;

      return { total_karma, link_karma, comment_karma, awarder_karma, awardee_karma, method: "Direct" };
    }
  } catch (err: any) {
    const errStr = err.message || "";
    if (["USER_NOT_FOUND", "DELETED_OR_SUSPENDED", "PRIVATE_PROFILE", "RATE_LIMIT_REACHED"].includes(errStr)) {
      throw err;
    }
    console.warn(`[REDDIT SERVER API] Direct fetch failed, attempting backup proxies: ${errStr}`);
  }

  // Approach 3: Rotating CORS proxy fallback pool
  const proxyUrls = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`
  ];

  for (const proxyUrl of proxyUrls) {
    try {
      console.log(`[REDDIT SERVER API] Checking backup proxy: ${proxyUrl}`);
      const response = await fetch(proxyUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json"
        }
      });

      if (!response.ok) continue;

      const bodyText = await response.text();
      let payload: any = null;
      try {
        payload = JSON.parse(bodyText);
      } catch (e) {
        continue;
      }

      if (payload && typeof payload.contents === 'string') {
        const contentsStr = payload.contents.trim();
        if (contentsStr.startsWith("<") || contentsStr.toLowerCase().includes("<!doctype")) {
          continue;
        }
        try {
          payload = JSON.parse(contentsStr);
        } catch (e) {
          continue;
        }
      }

      if (payload && (payload.error === 404 || payload.message === "Not Found")) {
        throw new Error("USER_NOT_FOUND");
      }
      if (payload && (payload.error === 403 || payload.message === "Forbidden" || payload.reason === "private")) {
        throw new Error("PRIVATE_PROFILE");
      }
      if (payload && (payload.error === 429 || payload.message === "Too Many Requests")) {
        throw new Error("RATE_LIMIT_REACHED");
      }

      const dataObj = payload?.data || payload;
      if (dataObj) {
        if (dataObj.is_suspended === true) {
          throw new Error("DELETED_OR_SUSPENDED");
        }
        const link_karma = typeof dataObj.link_karma === 'number' ? dataObj.link_karma : 0;
        const comment_karma = typeof dataObj.comment_karma === 'number' ? dataObj.comment_karma : 0;
        const awarder_karma = typeof dataObj.awarder_karma === 'number' ? dataObj.awarder_karma : 0;
        const awardee_karma = typeof dataObj.awardee_karma === 'number' ? dataObj.awardee_karma : 0;
        const total_karma = link_karma + comment_karma + awarder_karma + awardee_karma;

        return { total_karma, link_karma, comment_karma, awarder_karma, awardee_karma, method: "Proxy" };
      }
    } catch (proxyErr: any) {
      const pMsg = proxyErr.message || "";
      if (["USER_NOT_FOUND", "DELETED_OR_SUSPENDED", "PRIVATE_PROFILE", "RATE_LIMIT_REACHED"].includes(pMsg)) {
        throw proxyErr;
      }
    }
  }

  // Absolute limit fallback
  throw new Error("RATE_LIMIT_REACHED");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Pure HTTP Proxy GET endpoint (preserves compatibility)
  app.get("/api/reddit/karma", async (req, res) => {
    const usernameQuery = req.query.username as string;
    if (!usernameQuery) {
      return res.status(400).json({ error: "Missing username" });
    }

    const cleanUser = usernameQuery.replace(/^\/?u\//i, '').replace(/^\/user\//i, '').replace(/^\//, '').trim();
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
      return res.status(400).json({ error: "USER_NOT_FOUND", message: "Invalid Reddit username format." });
    }

    try {
      const result = await fetchRedditKarmaInternal(cleanUser);
      return res.json(result);
    } catch (err: any) {
      const errStr = err.message || "API_UNAVAILABLE";
      const statusCode = errStr === "RATE_LIMIT_REACHED" ? 429 : errStr === "PRIVATE_PROFILE" ? 403 : 404;
      return res.status(statusCode).json({ error: errStr });
    }
  });

  // 2. Pure Cloud Function Endpoint (called syncRedditKarma on Server side)
  // Fetches, saves correct karma directly to Firebase, and returns payload to frontend
  app.post("/api/syncRedditKarma", async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId parameter." });
    }

    try {
      console.log(`[CLOUD FUNCTION RECEIVED] Syncing Reddit Karma for user: ${userId}`);
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return res.status(404).json({ error: "USER_NOT_FOUND", message: "Your user profile does not exist in the database." });
      }

      const userData = userSnap.data();
      const rawUser = userData.redditUsername || "";
      const cleanUser = rawUser.replace(/^\/?u\//i, '').replace(/^\/user\//i, '').replace(/^\//, '').trim();

      if (!rawUser.trim() || !cleanUser) {
        return res.status(400).json({ error: "USERNAME_REQUIRED", message: "Please enter your Reddit username in profile settings." });
      }

      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
        return res.status(400).json({ error: "USERNAME_INVALID", message: "Invalid Reddit username format. Standard Reddit usernames are 3-20 characters." });
      }

      // Fetch Reddit stats
      const result = await fetchRedditKarmaInternal(cleanUser);

      // Save the correct karma properties directly to Firebase Firestore
      const tier = getKarmaTier(result.total_karma);
      const badgeName = tier.name;
      const timestampIso = new Date().toISOString();

      await updateDoc(userRef, {
        karma: result.total_karma,
        redditKarma: result.total_karma,
        total_karma: result.total_karma,
        comment_karma: result.comment_karma,
        link_karma: result.link_karma,
        karmaBadge: badgeName,
        karmaTier: badgeName,
        karmaYesterday: userData.karma ?? result.total_karma,
        karmaLastSynced: timestampIso,
        lastRedditSync: timestampIso,
        linkKarma: result.link_karma,
        commentKarma: result.comment_karma,
        redditLinkKarma: result.link_karma,
        redditCommentKarma: result.comment_karma
      });

      console.log(`[CLOUD FUNCTION COMPLETED] Updated user ${userId} to total karma: ${result.total_karma}`);
      return res.json({
        total_karma: result.total_karma,
        link_karma: result.link_karma,
        comment_karma: result.comment_karma,
        awarder_karma: result.awarder_karma,
        awardee_karma: result.awardee_karma,
        karmaBadge: badgeName,
        karmaTier: badgeName,
        karmaLastSynced: timestampIso,
        method: result.method
      });

    } catch (err: any) {
      const errStr = err.message || "API_UNAVAILABLE";
      const statusCode = errStr === "RATE_LIMIT_REACHED" ? 429 : errStr === "PRIVATE_PROFILE" ? 403 : 404;
      return res.status(statusCode).json({ error: errStr, message: `Sync failed: ${errStr}` });
    }
  });

  // Scheduled 24-Hours Auto Sync Task Loop (simulates Firebase active scheduler in Express container bounds)
  const runScheduledKarmaSync = async () => {
    console.log("[SCHEDULED SYNC TRIGGER] Starting 24-hour routine sync of all active Reddit profiles...");
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      for (const uDoc of usersSnap.docs) {
        const u = uDoc.data();
        const rawUser = u.redditUsername;
        if (rawUser && rawUser.trim()) {
          const cleanUser = rawUser.replace(/^\/?u\//i, '').replace(/^\/user\//i, '').replace(/^\//, '').trim();
          if (/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
            try {
              const res = await fetchRedditKarmaInternal(cleanUser);
              const tier = getKarmaTier(res.total_karma);
              const badgeName = tier.name;
              const dateIso = new Date().toISOString();

              await updateDoc(doc(db, "users", uDoc.id), {
                karma: res.total_karma,
                redditKarma: res.total_karma,
                total_karma: res.total_karma,
                comment_karma: res.comment_karma,
                link_karma: res.link_karma,
                karmaBadge: badgeName,
                karmaTier: badgeName,
                karmaLastSynced: dateIso,
                lastRedditSync: dateIso,
                linkKarma: res.link_karma,
                commentKarma: res.comment_karma,
                redditLinkKarma: res.link_karma,
                redditCommentKarma: res.comment_karma
              });
              console.log(`[SCHEDULED AUTOMATION] Successfully auto-synced u/${cleanUser} karma to ${res.total_karma}`);
            } catch (autoErr: any) {
              console.error(`[SCHEDULED AUTOMATION] Skip u/${cleanUser} failures:`, autoErr.message || autoErr);
            }
          }
        }
      }
      console.log("[SCHEDULED SYNC RECONCILIATION] Completed successfully.");
    } catch (schedErr: any) {
      console.error("[SCHEDULED CRIT] Unable to pull database list for scheduler:", schedErr.message || schedErr);
    }
  };

  // Run automatically every 24 hours
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  setInterval(runScheduledKarmaSync, TWENTY_FOUR_HOURS_MS);

  // Run initial test sync 30s after server booted up to verify runtime stability 
  setTimeout(runScheduledKarmaSync, 30000);

  // Vite middleware / SPA serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running internally on port ${PORT}`);
  });
}

startServer();
