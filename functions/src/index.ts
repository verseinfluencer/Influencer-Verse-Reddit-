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

// Scrape helper with rotating proxy pool and retry logic
async function fetchRedditKarmaInternal(cleanUser: string): Promise<KarmaResult> {
  const directUrl = `https://www.reddit.com/user/${cleanUser}/about.json?raw_json=1&t=${Date.now()}`;

  const attemptFetch = async (): Promise<any> => {
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
    if (["USER_NOT_FOUND", "DELETED_OR_SUSPENDED", "PRIVATE_PROFILE"].includes(errMessage)) {
      throw err;
    }

    console.warn(`[Functions Reddit Sync] Primary fetch failed: ${errMessage}. Retrying once after 2 seconds...`);
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
      console.error(`[Functions Reddit Sync] Retry fetch failed: ${retryErr.message}`);
      throw retryErr;
    }
  }
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
