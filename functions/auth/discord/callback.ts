export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

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

  if (!code) {
    return new Response(
      generateDiscordHTMLResponse({
        success: false,
        error: "Missing login verification code from Discord authentication response."
      }),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = env.DISCORD_CLIENT_ID;
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  const botToken = env.DISCORD_BOT_TOKEN;
  const guildId = env.DISCORD_GUILD_ID;
  const redirectUri = env.DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !botToken || !guildId || !redirectUri) {
    return new Response(
      generateDiscordHTMLResponse({
        success: false,
        error: "Discord authentication is not fully configured on the server (missing environment variables)."
      }),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
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
      return new Response(
        generateDiscordHTMLResponse({
          success: false,
          error: "Failed to exchange authorization code with Discord."
        }),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const tokenData = await tokenResponse.json() as any;
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return new Response(
        generateDiscordHTMLResponse({
          success: false,
          error: "Token request succeeded but returned no access token from Discord."
        }),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // 2. Fetch the user's Discord identity profile
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      return new Response(
        generateDiscordHTMLResponse({
          success: false,
          error: "Failed to fetch user metadata from Discord API."
        }),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const userData = await userResponse.json() as any;
    const discordUserId = userData.id;
    const discordUsername = userData.username || userData.global_name;

    if (!discordUserId || !discordUsername) {
      return new Response(
        generateDiscordHTMLResponse({
          success: false,
          error: "Unable to retrieve unique Discord ID or username."
        }),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // 3. Request Guild Membership status using our BOT Token
    const memberResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${discordUserId}`, {
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });

    if (memberResponse.status === 404) {
      return new Response(
        generateDiscordHTMLResponse({
          success: false,
          error: "Please join our Discord server before creating an account.",
          fallbackText: "Please join our Discord server and verify again."
        }),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (!memberResponse.ok) {
      return new Response(
        generateDiscordHTMLResponse({
          success: false,
          error: "Error verifying Discord server membership status."
        }),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Success!
    return new Response(
      generateDiscordHTMLResponse({
        success: true,
        discordUserId,
        discordUsername,
        discordVerifiedAt: new Date().toISOString()
      }),
      { headers: { "Content-Type": "text/html" } }
    );

  } catch (err: any) {
    return new Response(
      generateDiscordHTMLResponse({
        success: false,
        error: `Core server error: ${err.message || err}`
      }),
      { headers: { "Content-Type": "text/html" } }
    );
  }
};

export const onRequest = onRequestGet;
