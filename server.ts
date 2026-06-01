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

  // API route to resolve the visitor's real client IP
  app.get("/api/ip", (req, res) => {
    const forwardHeader = req.headers['x-forwarded-for'];
    const remoteIp = req.socket.remoteAddress;
    let ip = '';
    if (forwardHeader) {
      ip = Array.isArray(forwardHeader) ? forwardHeader[0] : forwardHeader.split(',')[0].trim();
    } else if (remoteIp) {
      ip = remoteIp;
    }
    // Clean loopback dual stack notation
    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('127.0.0.1')) {
      return res.json({ ip: "Not Configured" });
    }
    return res.json({ ip });
  });

  // Requirement 1: Create a backend endpoint /api/reddit-karma?username={redditUsername}
  app.get("/api/reddit-karma", async (req, res) => {
    const rawUsername = req.query.username;
    if (!rawUsername || typeof rawUsername !== 'string') {
      return res.status(400).json({ success: false, message: "Username query parameter is required." });
    }

    const username = rawUsername.trim().replace(/^u\//, "");
    const targetUrl = `https://www.reddit.com/user/${username}/about.json`;

    console.log(`[REDDIT KARMA PROXY] Received sync request. Username: "${username}", Request URL: "${targetUrl}"`);

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });

      const statusCode = response.status;
      const contentType = response.headers.get("content-type") || "";

      console.log(`[REDDIT KARMA PROXY] Fetch complete. Status: ${statusCode}, Content-Type: "${contentType}"`);

      if (statusCode === 404) {
        return res.status(404).json({ success: false, message: "Reddit account not found." });
      }

      if (statusCode === 429) {
        return res.status(429).json({ success: false, message: "Reddit temporarily unavailable. Please try again later." });
      }

      if (statusCode !== 200) {
        return res.status(statusCode).json({ success: false, message: "Unable to sync Reddit karma." });
      }

      const isContentTypeJson = contentType.toLowerCase().includes("application/json");
      if (!isContentTypeJson) {
        console.warn(`[REDDIT KARMA PROXY] Rejected: Content-Type does not contain application/json: "${contentType}"`);
        return res.status(415).json({ success: false, message: "Unable to sync Reddit karma." });
      }

      const bodyText = await response.text();
      const isHtmlResponse = bodyText.trim().startsWith("<") || 
                             bodyText.toLowerCase().includes("<!doctype") || 
                             bodyText.toLowerCase().includes("<html");

      if (isHtmlResponse) {
        console.warn(`[REDDIT KARMA PROXY] Rejected: Extracted HTML content instead of expected JSON.`);
        return res.status(415).json({ success: false, message: "Unable to sync Reddit karma." });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(bodyText);
      } catch (jsonErr) {
        console.error(`[REDDIT KARMA PROXY] Failed to parse JSON response:`, jsonErr);
        return res.status(500).json({ success: false, message: "Unable to sync Reddit karma." });
      }

      const data = parsed?.data;
      if (!data) {
        console.warn(`[REDDIT KARMA PROXY] Missing data segment in parsed payload.`);
        return res.status(500).json({ success: false, message: "Reddit account not found." });
      }

      if (data.is_suspended === true) {
        console.warn(`[REDDIT KARMA PROXY] User profile is suspended or inactive.`);
        return res.status(404).json({ success: false, message: "Reddit account not found." });
      }

      const totalKarma = typeof data.total_karma === 'number' ? data.total_karma : 
                         (typeof data.link_karma === 'number' ? data.link_karma : 0) + 
                         (typeof data.comment_karma === 'number' ? data.comment_karma : 0);
      const commentKarma = typeof data.comment_karma === 'number' ? data.comment_karma : 0;
      const linkKarma = typeof data.link_karma === 'number' ? data.link_karma : 0;
      const createdUtc = data.created_utc || null;

      console.log(`[REDDIT KARMA PROXY] Successfully processed. Username: "${username}", total_karma: ${totalKarma}, comment_karma: ${commentKarma}, link_karma: ${linkKarma}, created_utc: ${createdUtc}`);

      return res.json({
        success: true,
        totalKarma,
        commentKarma,
        linkKarma,
        lastSync: new Date().toISOString()
      });

    } catch (fetchErr) {
      console.error(`[REDDIT KARMA PROXY] Network error during request dispatch:`, fetchErr);
      return res.status(500).json({ success: false, message: "Unable to sync Reddit karma." });
    }
  });

  // 1. Pure HTTP Proxy GET endpoint (preserves backwards compatibility)
  app.get("/api/reddit/karma", (req, res) => {
    res.redirect(`/api/reddit-karma?username=${encodeURIComponent(String(req.query.username || ''))}`);
  });

  // ================= DISCORD CLIENT MANDATORY VERIFICATION =================
  // HTML template generator for communicating callback result to opener window
  function generateDiscordHTMLResponse(data: {
    success: boolean;
    discordUserId?: string;
    discordUsername?: string;
    discordVerifiedAt?: string;
    error?: string;
    fallbackText?: string;
  }) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Discord Server Verification</title>
        <style>
          body {
            background-color: #09090b;
            color: #f4f4f5;
            font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji";
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
            padding: 16px;
          }
          .container {
            background-color: #181124;
            border: 1px solid rgba(147, 51, 234, 0.2);
            border-radius: 20px;
            padding: 36px 24px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(147, 51, 234, 0.15);
          }
          .icon {
            font-size: 40px;
            line-height: 1;
            margin-bottom: 16px;
          }
          h2 {
            margin-top: 0;
            margin-bottom: 12px;
            color: ${data.success ? '#34d399' : '#f87171'};
            font-weight: 900;
            font-size: 22px;
            letter-spacing: -0.025em;
          }
          p {
            color: #d4d4d8;
            font-size: 13.5px;
            line-height: 1.6;
            margin-bottom: 24px;
            font-weight: 500;
          }
          .spinner {
            border: 3.5px solid rgba(255, 255, 255, 0.08);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border-left-color: #a855f7;
            animation: spin 0.8s linear infinite;
            margin: 8px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${data.success ? '✅' : '❌'}</div>
          <h2>${data.success ? 'Discord Verified' : 'Verification Denied'}</h2>
          <p>${data.success ? 'Your Discord account was successfully linked. This secure window will exit shortly...' : (data.error || 'Failed to authenticate membership.')}</p>
          <div class="spinner"></div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'DISCORD_VERIFICATION_RESULT',
                success: ${data.success},
                discordUserId: ${data.discordUserId ? `'${data.discordUserId}'` : 'null'},
                discordUsername: ${data.discordUsername ? `'${data.discordUsername.replace(/'/g, "\\'")}'` : 'null'},
                discordVerifiedAt: ${data.discordVerifiedAt ? `'${data.discordVerifiedAt}'` : 'null'},
                error: ${data.error ? `'${data.error.replace(/'/g, "\\'")}'` : 'null'},
                fallbackText: ${data.fallbackText ? `'${data.fallbackText.replace(/'/g, "\\'")}'` : 'null'}
              }, '*');
              setTimeout(() => {
                window.close();
              }, 1600);
            } else {
              document.querySelector('.spinner').style.display = 'none';
              const fallback = document.createElement('p');
              fallback.style.color = '#71717a';
              fallback.style.fontSize = '12px';
              fallback.innerHTML = 'Secure session ended. Please re-verify inside the main application tab.';
              document.querySelector('.container').appendChild(fallback);
            }
          </script>
        </div>
      </body>
      </html>
    `;
  }

  // Discord Authorization URL request endpoint
  app.get("/api/auth/discord/url", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      return res.status(500).json({ error: "Discord authentication is not fully configured in environment variables (missing DISCORD_CLIENT_ID or DISCORD_REDIRECT_URI)." });
    }
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify"
    });
    
    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    return res.json({ url: authUrl });
  });

  // Discord OAuth Redirect & Callback verification
  app.get(["/auth/discord/callback", "/auth/discord/callback/"], async (req, res) => {
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      return res.send(generateDiscordHTMLResponse({
        success: false,
        error: "Missing login verification code from Discord authentication response."
      }));
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    if (!clientId || !clientSecret || !botToken || !guildId || !redirectUri) {
      return res.send(generateDiscordHTMLResponse({
        success: false,
        error: "Discord authentication is not fully configured on the server (missing environment variables)."
      }));
    }

    try {
      console.log("[DISCORD CALLBACK] Initiating Token Exchange for code...");
      
      // 1. Exchange OAuth code for an access token
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        console.error("[DISCORD CALLBACK] Token exchange failed with status:", tokenResponse.status, errText);
        return res.send(generateDiscordHTMLResponse({
          success: false,
          error: "Failed to exchange authorization code with Discord."
        }));
      }

      const tokenData = await tokenResponse.json() as any;
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        return res.send(generateDiscordHTMLResponse({
          success: false,
          error: "Token request succeeded but returned no access token from Discord."
        }));
      }

      console.log("[DISCORD CALLBACK] Retrieving user profile...");
      // 2. Fetch the user's Discord identity profile
      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!userResponse.ok) {
        const errText = await userResponse.text();
        console.error("[DISCORD CALLBACK] Profile retrieval failed with status:", userResponse.status, errText);
        return res.send(generateDiscordHTMLResponse({
          success: false,
          error: "Failed to fetch user metadata from Discord API."
        }));
      }

      const userData = await userResponse.json() as any;
      const discordUserId = userData.id;
      const discordUsername = userData.username || userData.global_name;

      if (!discordUserId || !discordUsername) {
        return res.send(generateDiscordHTMLResponse({
          success: false,
          error: "Unable to retrieve unique Discord ID or username."
        }));
      }

      console.log(`[DISCORD CALLBACK] Verifying membership in guild ID ${guildId} for User: ${discordUsername} (${discordUserId})...`);
      // 3. Request Guild Membership status using our BOT Token
      const memberResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${discordUserId}`, {
        headers: {
          Authorization: `Bot ${botToken}`
        }
      });

      if (memberResponse.status === 404) {
        console.warn(`[DISCORD CALLBACK] User NOT found in Guild ID ${guildId}`);
        return res.send(generateDiscordHTMLResponse({
          success: false,
          error: "Please join our Discord server before creating an account.",
          fallbackText: "Please join our Discord server and verify again."
        }));
      }

      if (!memberResponse.ok) {
        const errText = await memberResponse.text();
        console.error("[DISCORD CALLBACK] Guild member check returned error:", memberResponse.status, errText);
        return res.send(generateDiscordHTMLResponse({
          success: false,
          error: "Error verifying Discord server membership status."
        }));
      }

      // Verification fully successful!
      console.log(`[DISCORD SERVER] Access verification confirmed. User: ${discordUsername}`);
      return res.send(generateDiscordHTMLResponse({
        success: true,
        discordUserId,
        discordUsername,
        discordVerifiedAt: new Date().toISOString()
      }));

    } catch (err: any) {
      console.error("[DISCORD CALLBACK] Critical verification exception:", err);
      return res.send(generateDiscordHTMLResponse({
        success: false,
        error: `Core server error: ${err.message || err}`
      }));
    }
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
