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

    console.log(`[REDDIT SERVER API] Request username: @${cleanUser}. OAuth client provided: ${!!clientId}`);

    // Helper to validate and parse standard JSON fetch
    const safeFetchRedditJson = async (url: string, options: any) => {
      const response = await fetch(url, options);
      const contentType = response.headers.get("content-type") || "";

      console.log(`[REDDIT SERVER API] Fetched: ${url} | Status: ${response.status} | Content-Type: ${contentType}`);

      // If non-ok status for user not found
      if (response.status === 404) {
        throw new Error("USER_NOT_FOUND");
      }
      if (response.status === 429) {
        throw new Error("RATE_LIMIT_REACHED");
      }
      if (!response.ok) {
        throw new Error(`HTTP_STATUS_${response.status}`);
      }

      // 5. Add validation: Verify content-type is application/json
      if (!contentType.toLowerCase().includes("application/json")) {
        const responseText = await response.text();
        console.error(`[REDDIT SERVER API ERROR] Content-Type for ${url} is not application/json. Got "${contentType}". HTML signature: ${responseText.slice(0, 150)}`);
        throw new Error(`Invalid content-type: ${contentType}. Server returned non-JSON payload.`);
      }

      const responseText = await response.text();
      const trimmed = responseText.trim();
      if (trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype")) {
        console.error(`[REDDIT SERVER API ERROR] HTML content detected in response from ${url}: ${trimmed.slice(0, 150)}`);
        throw new Error("HTML content-type spoof/misclassification on Reddit payload.");
      }

      try {
        return JSON.parse(responseText);
      } catch (jsonErr: any) {
         console.error(`[REDDIT SERVER API ERROR] Failed to parse JSON from ${url}: ${jsonErr.message}`);
         throw new Error(`JSON parse error: ${jsonErr.message}`);
      }
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
            console.log(`[REDDIT SERVER API] OAuth token acquired. Fetching user info...`);
            const userData = await safeFetchRedditJson(`https://oauth.reddit.com/user/${cleanUser}/about`, {
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "User-Agent": "InfluencerVerseRedditSync/1.0.0 (by /u/kallol_admin)"
              }
            });

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
        } else {
          console.warn(`[REDDIT SERVER API] OAuth token exchange returned status: ${tokenRes.status}`);
        }
      } catch (err: any) {
        if (err.message === "USER_NOT_FOUND") {
          return res.status(404).json({ error: "USER_NOT_FOUND", message: `The Reddit username @${cleanUser} does not exist.` });
        }
        if (err.message === "RATE_LIMIT_REACHED") {
          return res.status(429).json({ error: "RATE_LIMIT_REACHED", message: "Reddit API rate limit reached." });
        }
        console.error(`[REDDIT SERVER API] OAuth flow failed, fallback to next method`, err.message || err);
      }
    }

    // Approach 2: Direct public Reddit API (Server-side fetch, not browser)
    try {
      console.log(`[REDDIT SERVER API] Fetching from direct public about.json...`);
      const data = await safeFetchRedditJson(`https://www.reddit.com/user/${cleanUser}/about.json`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 (InfluencerVerseRedditSyncClient/1.0; contact: admin@example.com)",
          "Accept": "application/json"
        }
      });

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
    } catch (err: any) {
      if (err.message === "USER_NOT_FOUND") {
        return res.status(404).json({ error: "USER_NOT_FOUND", message: `The Reddit username @${cleanUser} does not exist.` });
      }
      if (err.message === "RATE_LIMIT_REACHED") {
        return res.status(429).json({ error: "RATE_LIMIT_REACHED", message: "Reddit API rate limit reached." });
      }
      console.error(`[REDDIT SERVER API] Direct fetch failed, trying proxy fallbacks:`, err.message || err);
    }

    // Approach 3: CORS/IP-rotation Fallback Proxies (Fetch as standard JSON, then check content)
    const proxyUrls = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`
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

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok) continue;

        // Verify JSON content type
        if (!contentType.toLowerCase().includes("application/json")) {
          console.warn(`[REDDIT SERVER API] Skipping proxy ${proxyUrl} - returned non-JSON Content-Type: ${contentType}`);
          continue;
        }

        let payload = await response.json();
        // If AllOrigins wrapped response
        if (payload && typeof payload.contents === 'string') {
          const contentsStr = payload.contents.trim();
          if (contentsStr.startsWith("<") || contentsStr.toLowerCase().includes("<!doctype")) {
            console.warn(`[REDDIT SERVER API] Skip proxy ${proxyUrl} - wrapped content is HTML structure.`);
            continue;
          }
          try {
            payload = JSON.parse(contentsStr);
          } catch (e) {
            console.warn(`[REDDIT SERVER API] Skip proxy ${proxyUrl} - nested contents parsing failed.`);
            continue;
          }
        }

        const dataObj = payload?.data || payload;
        const totalKarma = dataObj?.total_karma;
        if (typeof totalKarma === 'number') {
          console.log(`[REDDIT SERVER API] Successfully sync via proxy: ${totalKarma}`);
          return res.json({
            total_karma: totalKarma,
            link_karma: typeof dataObj?.link_karma === 'number' ? dataObj.link_karma : 0,
            comment_karma: typeof dataObj?.comment_karma === 'number' ? dataObj.comment_karma : 0,
            method: "Proxy"
          });
        }
      } catch (proxyErr: any) {
        console.warn(`[REDDIT SERVER API] Proxy failed: ${proxyUrl}`, proxyErr.message || proxyErr);
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
