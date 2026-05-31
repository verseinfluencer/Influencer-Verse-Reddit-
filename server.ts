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
    console.log("[REDDIT PROXY] Reddit api sync is temporarily disabled.");
    return res.status(503).json({ error: "DISABLED", message: "Reddit karma live sync is temporarily disabled." });
  });

  // 2. Pure Cloud Function Endpoint (called syncRedditKarma on Server side)
  // Fetches, saves correct karma directly to Firebase, and returns payload to frontend
  app.post("/api/syncRedditKarma", async (req, res) => {
    console.log("[REDDIT SYNC] Reddit api sync is temporarily disabled.");
    return res.status(503).json({ error: "DISABLED", message: "Reddit karma live sync is temporarily disabled." });
  });

  // Scheduled 24-Hours Auto Sync Task Loop (simulates Firebase active scheduler in Express container bounds)
  const runScheduledKarmaSync = async () => {
    console.log("[SCHEDULED SYNC TRIGGER] Live Reddit sync is disabled. Skipping automations.");
  };

  // Run automatically every 24 hours (No-Op)
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  // setInterval(runScheduledKarmaSync, TWENTY_FOUR_HOURS_MS);

  // Run initial test sync 30s after server booted up (No-Op)
  // setTimeout(runScheduledKarmaSync, 30000);

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
