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

// Scrape helper with retry-once and validation rules
async function fetchRedditKarmaInternal(cleanUser: string): Promise<KarmaResult> {
  const directUrl = `https://www.reddit.com/user/${cleanUser}/about.json?raw_json=1&t=${Date.now()}`;

  const attemptFetch = async (): Promise<any> => {
    console.log(`[REDDIT SERVER API] Dispatching request with User-Agent: Mozilla/5.0 and Accept: application/json to: ${directUrl}`);
    const response = await fetch(directUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const statusCode = response.status;
    const bodyText = (await response.text()).trim();

    if (!response.ok) {
      if (statusCode === 429) {
        throw new Error("RATE_LIMIT_REACHED");
      }
      if (statusCode === 403) {
        throw new Error("PRIVATE_PROFILE");
      }
      if (statusCode === 404) {
        throw new Error("USER_NOT_FOUND");
      }
      throw new Error(`HTTP_ERROR_${statusCode}`);
    }

    if (!bodyText) {
      throw new Error("EMPTY_RESPONSE");
    }

    if (bodyText.startsWith("<") || bodyText.toLowerCase().includes("<!doctype") || bodyText.toLowerCase().includes("<html")) {
      throw new Error("HTML_RESPONSE");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(bodyText);
    } catch (e) {
      throw new Error("INVALID_JSON");
    }

    if (parsed && (parsed.error === 404 || parsed.error === 403 || parsed.error === 429)) {
      if (parsed.error === 404) throw new Error("USER_NOT_FOUND");
      if (parsed.error === 403) throw new Error("PRIVATE_PROFILE");
      if (parsed.error === 429) throw new Error("RATE_LIMIT_REACHED");
    }

    const d = parsed?.data;
    if (!d) {
      throw new Error("INVALID_REDDIT_PAYLOAD");
    }

    if (d.is_suspended === true) {
      throw new Error("DELETED_OR_SUSPENDED");
    }

    return d;
  };

  try {
    const data = await attemptFetch();
    const link_karma = typeof data.link_karma === 'number' ? data.link_karma : 0;
    const comment_karma = typeof data.comment_karma === 'number' ? data.comment_karma : 0;
    const awarder_karma = typeof data.awarder_karma === 'number' ? data.awarder_karma : 0;
    const awardee_karma = typeof data.awardee_karma === 'number' ? data.awardee_karma : 0;
    const total_karma = link_karma + comment_karma + awarder_karma + awardee_karma;

    return { total_karma, link_karma, comment_karma, awarder_karma, awardee_karma, method: "Primary" };
  } catch (err: any) {
    const errMessage = err.message || "";
    // Terminal exceptions should not be retried (avoid useless waits)
    if (["USER_NOT_FOUND", "DELETED_OR_SUSPENDED", "PRIVATE_PROFILE"].includes(errMessage)) {
      throw err;
    }

    console.warn(`[REDDIT SERVER API] Primary attempt failed (${errMessage}). Retrying once after 2 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const data = await attemptFetch();
      const link_karma = typeof data.link_karma === 'number' ? data.link_karma : 0;
      const comment_karma = typeof data.comment_karma === 'number' ? data.comment_karma : 0;
      const awarder_karma = typeof data.awarder_karma === 'number' ? data.awarder_karma : 0;
      const awardee_karma = typeof data.awardee_karma === 'number' ? data.awardee_karma : 0;
      const total_karma = link_karma + comment_karma + awarder_karma + awardee_karma;

      return { total_karma, link_karma, comment_karma, awarder_karma, awardee_karma, method: "Retry" };
    } catch (retryErr: any) {
      console.error(`[REDDIT SERVER API] Retry attempt failed: ${retryErr.message}`);
      throw retryErr;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Pure HTTP Proxy GET endpoint (preserves backwards compatibility)
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
      return res.status(statusCode).json({ error: errStr, message: `Sync failed: ${errStr}` });
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
