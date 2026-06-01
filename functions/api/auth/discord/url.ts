export const onRequestGet = async (context: any) => {
  const { env } = context;
  const clientId = env.DISCORD_CLIENT_ID;
  const redirectUri = env.DISCORD_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return new Response(
      JSON.stringify({
        error: "Discord authentication is not fully configured in environment variables (missing DISCORD_CLIENT_ID or DISCORD_REDIRECT_URI)."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify"
  });
  
  const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  return new Response(
    JSON.stringify({ url: authUrl }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
};

export const onRequest = onRequestGet;
