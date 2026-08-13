const offlinePage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Rockbot is offline</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #090b0f; color: #f5f2e8; }
    main { width: min(34rem, calc(100% - 3rem)); }
    p { color: #a8adb7; line-height: 1.65; }
    small { color: #737986; }
  </style>
</head>
<body>
  <main>
    <h1>Rockbot is offline.</h1>
    <p>The private home runtime is not reachable right now. Make sure Dillon's computer is on and connected, then refresh this page.</p>
    <small>The URL is permanent. The local operating team comes back automatically when the computer reconnects.</small>
  </main>
</body>
</html>`;

function unavailable(request, detail) {
  const wantsHtml = request.headers.get("accept")?.includes("text/html");
  if (wantsHtml) {
    return new Response(offlinePage, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": "15",
      },
    });
  }

  return Response.json(
    { ok: false, error: "rockbot_unavailable", detail },
    { status: 503, headers: { "cache-control": "no-store", "retry-after": "15" } },
  );
}

export default {
  async fetch(request, env) {
    const rockbot = env?.CUSTOMER_HTTP_ROCKBOT;
    if (!rockbot || typeof rockbot.fetch !== "function") {
      return unavailable(request, "The private Rockbot binding is not configured.");
    }

    try {
      return await rockbot.fetch(request);
    } catch {
      return unavailable(request, "The private Rockbot runtime is temporarily unreachable.");
    }
  },
};
