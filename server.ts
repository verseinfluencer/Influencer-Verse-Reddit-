import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route first: proxy to Reddit
  app.get("/api/reddit/karma", async (req, res) => {
    const usernameQuery = req.query.username as string;
    if (!usernameQuery) {
      return res.status(400).json({ error: "Missing username" });
    }

    const cleanUser = usernameQuery.replace(/^\/?u\//i, '').replace(/^\/user\//i, '').replace(/^\//, '').trim();
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
      return res.status(400).json({ error: "USER_NOT_FOUND", message: "Invalid Reddit username format. Standard Reddit usernames are 3-20 alphanumeric characters." });
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    console.log(`[REDDIT SERVER API] Request username: @${cleanUser}. OAuth client provided: ${!!clientId}`);

    // Helper to evaluate error from response status & body text
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

    // Approach 1: If Reddit credentials are provided, use Reddit OAuth client_credentials flow
    if (clientId && clientSecret) {
      try {
        console.log(`[REDDIT SERVER API] Trying Reddit OAuth client_credentials flow...`);
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
            console.log(`[REDDIT SERVER API] OAuth token acquired. Fetching: ${targetUrl}`);
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
                return res.status(404).json({ error: "DELETED_OR_SUSPENDED", message: "This Reddit profile is deactivated, suspended, or deleted." });
              }
              const link_karma = typeof d.link_karma === 'number' ? d.link_karma : 0;
              const comment_karma = typeof d.comment_karma === 'number' ? d.comment_karma : 0;
              const awarder_karma = typeof d.awarder_karma === 'number' ? d.awarder_karma : 0;
              const awardee_karma = typeof d.awardee_karma === 'number' ? d.awardee_karma : 0;
              const calculatedTotal = link_karma + comment_karma + awarder_karma + awardee_karma;

              console.log(`[REDDIT SERVER API] Successfully fetched karma via OAuth: ${calculatedTotal}`);
              return res.json({
                total_karma: calculatedTotal,
                link_karma,
                comment_karma,
                awarder_karma,
                awardee_karma,
                method: "OAuth"
              });
            }
          }
        }
      } catch (err: any) {
        const errStr = err.message || "";
        if (["USER_NOT_FOUND", "DELETED_OR_SUSPENDED", "PRIVATE_PROFILE", "RATE_LIMIT_REACHED"].includes(errStr)) {
          return res.status(errStr === "RATE_LIMIT_REACHED" ? 429 : errStr === "PRIVATE_PROFILE" ? 403 : 404).json({ error: errStr });
        }
        console.error(`[REDDIT SERVER API] OAuth flow failed, fallback to direct fetch method.`, errStr);
      }
    }

    // Approach 2: Direct public Reddit API (Server-side fetch with raw_json=1 and anti-caching timestamp)
    const directUrl = `https://www.reddit.com/user/${cleanUser}/about.json?raw_json=1&t=${Date.now()}`;
    try {
      console.log(`[REDDIT SERVER API] Fetching from direct public: ${directUrl}`);
      const response = await fetch(directUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 (InfluencerVerseRedditSyncClient/1.0; contact: admin@example.com)",
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
          return res.status(404).json({ error: "DELETED_OR_SUSPENDED", message: "This Reddit profile is deactivated, suspended, or deleted." });
        }
        const link_karma = typeof d.link_karma === 'number' ? d.link_karma : 0;
        const comment_karma = typeof d.comment_karma === 'number' ? d.comment_karma : 0;
        const awarder_karma = typeof d.awarder_karma === 'number' ? d.awarder_karma : 0;
        const awardee_karma = typeof d.awardee_karma === 'number' ? d.awardee_karma : 0;
        const calculatedTotal = link_karma + comment_karma + awarder_karma + awardee_karma;

        console.log(`[REDDIT SERVER API] Successfully fetched karma directly: ${calculatedTotal}`);
        return res.json({
          total_karma: calculatedTotal,
          link_karma,
          comment_karma,
          awarder_karma,
          awardee_karma,
          method: "Direct"
        });
      }
    } catch (err: any) {
      const errStr = err.message || "";
      if (["USER_NOT_FOUND", "DELETED_OR_SUSPENDED", "PRIVATE_PROFILE", "RATE_LIMIT_REACHED"].includes(errStr)) {
        return res.status(errStr === "RATE_LIMIT_REACHED" ? 429 : errStr === "PRIVATE_PROFILE" ? 403 : 404).json({ error: errStr });
      }
      console.error(`[REDDIT SERVER API] Direct fetch failed, trying proxy fallbacks:`, errStr);
    }

    // Approach 3: CORS/IP-rotation Fallback Proxies (Fetch and enforce computed total karma)
    const targetQueryUrl = `https://www.reddit.com/user/${cleanUser}/about.json?raw_json=1&t=${Date.now()}`;
    const proxyUrls = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(targetQueryUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetQueryUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(targetQueryUrl)}`
    ];

    for (const proxyUrl of proxyUrls) {
      try {
        console.log(`[REDDIT SERVER API] Querying backup proxy: ${proxyUrl}`);
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

        // If AllOrigins wrapped response
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

        // Verify nested responses and codes wrapping inside success responses
        if (payload && (payload.error === 404 || payload.message === "Not Found")) {
          const errCode = inspectResponseError(payload.error || 404, JSON.stringify(payload));
          return res.status(404).json({ error: errCode });
        }
        if (payload && (payload.error === 403 || payload.message === "Forbidden" || payload.reason === "private")) {
          return res.status(403).json({ error: "PRIVATE_PROFILE" });
        }
        if (payload && (payload.error === 429 || payload.message === "Too Many Requests")) {
          return res.status(429).json({ error: "RATE_LIMIT_REACHED" });
        }

        const dataObj = payload?.data || payload;
        if (dataObj) {
          if (dataObj.is_suspended === true) {
            return res.status(404).json({ error: "DELETED_OR_SUSPENDED" });
          }
          const link_karma = typeof dataObj.link_karma === 'number' ? dataObj.link_karma : 0;
          const comment_karma = typeof dataObj.comment_karma === 'number' ? dataObj.comment_karma : 0;
          const awarder_karma = typeof dataObj.awarder_karma === 'number' ? dataObj.awarder_karma : 0;
          const awardee_karma = typeof dataObj.awardee_karma === 'number' ? dataObj.awardee_karma : 0;
          const calculatedTotal = link_karma + comment_karma + awarder_karma + awardee_karma;

          console.log(`[REDDIT SERVER API] Successfully fetched karma via proxy: ${calculatedTotal}`);
          return res.json({
            total_karma: calculatedTotal,
            link_karma,
            comment_karma,
            awarder_karma,
            awardee_karma,
            method: "Proxy"
          });
        }
      } catch (proxyErr: any) {
        console.warn(`[REDDIT SERVER API] Proxy failed: ${proxyUrl}`, proxyErr.message || proxyErr);
      }
    }

    // All resources failed
    res.status(503).json({ error: "RATE_LIMIT_REACHED", message: "Reddit API and all available proxies are temporarily offline or rate-limited. Please retry shortly." });
  });

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
