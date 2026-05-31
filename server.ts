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
      return res.status(400).json({ error: "Invalid Reddit username format. Standard Reddit usernames are 3-20 alphanumeric characters." });
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    console.log(`[REDDIT SERVER API] Req for username: @${cleanUser}. OAuth client provided: ${!!clientId}`);

    // Approach 1: If Reddit credentials are provided, use Reddit OAuth client_credentials flow
    if (clientId && clientSecret) {
      try {
        console.log(`[REDDIT SERVER API] Attempting OAuth Client Credentials token exchange...`);
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
            console.log(`[REDDIT SERVER API] OAuth token acquired successfully. Fetching user info via oauth.reddit.com...`);
            const userRes = await fetch(`https://oauth.reddit.com/user/${cleanUser}/about`, {
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "User-Agent": "InfluencerVerseRedditSync/1.0.0 (by /u/kallol_admin)"
              }
            });

            if (userRes.status === 404) {
              console.warn(`[REDDIT SERVER API] Reddit returned 404: @${cleanUser} not found via OAuth.`);
              return res.status(404).json({ error: "USER_NOT_FOUND", message: `The Reddit username @${cleanUser} does not exist.` });
            }

            if (userRes.status === 429) {
              console.warn(`[REDDIT SERVER API] Reddit returned 429: OAuth rate-limited.`);
              throw new Error("RATE_LIMIT_REACHED");
            }

            if (userRes.ok) {
              const userData: any = await userRes.json();
              const d = userData?.data;
              const totalKarma = d?.total_karma;
              if (typeof totalKarma === 'number') {
                console.log(`[REDDIT SERVER API] Successfully fetched karma via OAuth: ${totalKarma}`);
                return res.json({
                  total_karma: totalKarma,
                  link_karma: typeof d?.link_karma === 'number' ? d.link_karma : 0,
                  comment_karma: typeof d?.comment_karma === 'number' ? d.comment_karma : 0,
                  method: "OAuth"
                });
              }
            }
          }
        } else {
          console.warn(`[REDDIT SERVER API] OAuth token exchange failed with status: ${tokenRes.status}`);
        }
      } catch (oauthErr) {
        console.error(`[REDDIT SERVER API] OAuth flow failed, falling back to public endpoint...`, oauthErr);
      }
    }

    // Approach 2: Direct query to Reddit's user/about.json with a robust User-Agent (No CORS on server side!)
    try {
      console.log(`[REDDIT SERVER API] Attempting direct fetch to reddit.com user about.json...`);
      const directRes = await fetch(`https://www.reddit.com/user/${cleanUser}/about.json`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 (InfluencerVerseRedditSyncClient/1.0; contact: admin@example.com)",
          "Accept": "application/json"
        }
      });

      if (directRes.status === 404) {
        console.warn(`[REDDIT SERVER API] Direct fetch returned 404: user @${cleanUser} not found.`);
        return res.status(404).json({ error: "USER_NOT_FOUND", message: `The Reddit username @${cleanUser} does not exist.` });
      }

      if (directRes.status === 429) {
        console.warn(`[REDDIT SERVER API] Direct fetch returned 429: Rate limited.`);
        throw new Error("RATE_LIMIT_REACHED");
      }

      if (directRes.ok) {
        const data: any = await directRes.json();
        const d = data?.data;
        const totalKarma = d?.total_karma;
        if (typeof totalKarma === 'number') {
          console.log(`[REDDIT SERVER API] Successfully fetched karma directly: ${totalKarma}`);
          return res.json({
            total_karma: totalKarma,
            link_karma: typeof d?.link_karma === 'number' ? d.link_karma : 0,
            comment_karma: typeof d?.comment_karma === 'number' ? d.comment_karma : 0,
            method: "Direct"
          });
        }
      }
      console.warn(`[REDDIT SERVER API] Direct fetch returned status ${directRes.status}. Trying proxy fallbacks...`);
    } catch (directErr: any) {
      if (directErr.message === "RATE_LIMIT_REACHED") {
        return res.status(429).json({ error: "RATE_LIMIT_REACHED", message: "Reddit API rate limit reached." });
      }
      console.error(`[REDDIT SERVER API] Direct fetch failed.`, directErr);
    }

    // Approach 3: Public proxy fallbacks from server-side
    const proxyUrls = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`
    ];

    for (const proxyUrl of proxyUrls) {
      try {
        console.log(`[REDDIT SERVER API] Fetching via proxy: ${proxyUrl}`);
        const proxyRes = await fetch(proxyUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/json"
          }
        });

        if (proxyRes.ok) {
          let data = await proxyRes.json();
          if (data && typeof data.contents === 'string') {
            try {
              data = JSON.parse(data.contents);
            } catch (e) {
              console.warn("[REDDIT SERVER API] Failed to parse wrapped AllOrigins data:", e);
            }
          }

          if (data && (data.error === 404 || data.message === "Not Found")) {
            return res.status(404).json({ error: "USER_NOT_FOUND", message: `The Reddit username @${cleanUser} does not exist.` });
          }
          if (data && (data.error === 429 || data.message === "Too Many Requests" || data.error === "RATE_LIMIT_REACHED")) {
            return res.status(429).json({ error: "RATE_LIMIT_REACHED", message: "Proxy or Reddit API rate limit reached." });
          }

          const dataObj = data?.data || data;
          const totalKarma = dataObj?.total_karma;
          if (typeof totalKarma === 'number') {
            console.log(`[REDDIT SERVER API] Successfully fetched karma via proxy: ${totalKarma}`);
            return res.json({
              total_karma: totalKarma,
              link_karma: typeof dataObj?.link_karma === 'number' ? dataObj.link_karma : 0,
              comment_karma: typeof dataObj?.comment_karma === 'number' ? dataObj.comment_karma : 0,
              method: "Proxy"
            });
          }
        }
      } catch (proxyErr) {
        console.warn(`[REDDIT SERVER API] Proxy failed: ${proxyUrl}`, proxyErr);
      }
    }

    // All failed
    res.status(503).json({ error: "API_UNAVAILABLE", message: "Reddit API and all available proxies are currently offline." });
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
