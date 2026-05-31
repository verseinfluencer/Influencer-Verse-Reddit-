import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

interface KarmaResult {
  total_karma: number;
  link_karma: number;
  comment_karma: number;
  awarder_karma: number;
  awardee_karma: number;
  method: string;
}

// Helper to determine the karma tier based on total karma
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

  // Direct fetch URL
  const directUrl = `https://www.reddit.com/user/${cleanUser}/about.json?raw_json=1&t=${Date.now()}`;
  try {
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
  }

  // Backup Proxy rotate fallback
  const proxyUrls = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`
  ];

  for (const proxyUrl of proxyUrls) {
    try {
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
        try {
          payload = JSON.parse(payload.contents);
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

  throw new Error("RATE_LIMIT_REACHED");
}

/**
 * syncRedditKarma (OnRequest) Cloud Function
 * Fetches user Reddit stats via server-side logic and updates firestore.
 */
export const syncRedditKarma = onRequest({ cors: true }, async (req, res) => {
  const userId = req.body.userId || req.query.userId;
  if (!userId) {
    res.status(400).json({ error: "Missing userId parameter" });
    return;
  }

  try {
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      res.status(404).json({ error: "USER_NOT_FOUND", message: "User profile not found in Firebase" });
      return;
    }

    const userData = userSnap.data();
    if (!userData) {
      res.status(404).json({ error: "USER_EMPTY" });
      return;
    }

    const rawUser = userData.redditUsername || "";
    const cleanUser = rawUser.replace(/^\/?u\//i, '').replace(/^\/user\//i, '').replace(/^\//, '').trim();

    if (!cleanUser) {
      res.status(400).json({ error: "USERNAME_REQUIRED", message: "Reddit username is required." });
      return;
    }

    const result = await fetchRedditKarmaInternal(cleanUser);

    const tier = getKarmaTier(result.total_karma);
    const badgeName = tier.name;
    const timeIso = new Date().toISOString();

    const dataUpdates = {
      karma: result.total_karma,
      redditKarma: result.total_karma,
      total_karma: result.total_karma,
      comment_karma: result.comment_karma,
      link_karma: result.link_karma,
      karmaBadge: badgeName,
      karmaTier: badgeName,
      karmaYesterday: userData.karma ?? result.total_karma,
      karmaLastSynced: timeIso,
      lastRedditSync: timeIso,
      linkKarma: result.link_karma,
      commentKarma: result.comment_karma,
      redditLinkKarma: result.link_karma,
      redditCommentKarma: result.comment_karma
    };

    await userRef.update(dataUpdates);

    res.status(200).json({
      total_karma: result.total_karma,
      link_karma: result.link_karma,
      comment_karma: result.comment_karma,
      karmaBadge: badgeName,
      karmaTier: badgeName,
      karmaLastSynced: timeIso,
      method: result.method
    });

  } catch (err: any) {
    const errStr = err.message || "API_UNAVAILABLE";
    const statusCode = errStr === "RATE_LIMIT_REACHED" ? 429 : errStr === "PRIVATE_PROFILE" ? 403 : 404;
    res.status(statusCode).json({ error: errStr, message: `Sync failed: ${errStr}` });
  }
});

/**
 * Scheduled Auto Sync (Every 24 Hours) Scheduler
 */
export const scheduledKarmaSync = onSchedule("every 24 hours", async (event) => {
  const usersSnap = await db.collection("users").get();
  
  for (const doc of usersSnap.docs) {
    const u = doc.data();
    const rawUser = u.redditUsername;
    if (rawUser && rawUser.trim()) {
      const cleanUser = rawUser.replace(/^\/?u\//i, '').replace(/^\/user\//i, '').replace(/^\//, '').trim();
      if (/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
        try {
          const res = await fetchRedditKarmaInternal(cleanUser);
          const tier = getKarmaTier(res.total_karma);
          const dateIso = new Date().toISOString();

          await doc.ref.update({
            karma: res.total_karma,
            redditKarma: res.total_karma,
            total_karma: res.total_karma,
            comment_karma: res.comment_karma,
            link_karma: res.link_karma,
            karmaBadge: tier.name,
            karmaTier: tier.name,
            karmaLastSynced: dateIso,
            lastRedditSync: dateIso,
            linkKarma: res.link_karma,
            commentKarma: res.comment_karma,
            redditLinkKarma: res.link_karma,
            redditCommentKarma: res.comment_karma
          });
          console.log(`[Scheduled Sync] u/${cleanUser} karma auto-updated to ${res.total_karma}`);
        } catch (autoErr: any) {
          console.error(`[Scheduled Sync] Error sync u/${cleanUser}:`, autoErr.message);
        }
      }
    }
  }
});
