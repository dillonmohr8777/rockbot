function denied() {
  return new Response("Not found", {
    status: 404,
    headers: { "cache-control": "no-store" },
  });
}

function unavailable() {
  return Response.json(
    { ok: false, error: "rockbot_unavailable" },
    { status: 503, headers: { "cache-control": "no-store", "retry-after": "15" } },
  );
}

export default {
  async fetch(request, env) {
    const suppliedSecret = request.headers.get("x-rockbot-gateway");
    if (!env.ROCKBOT_GATEWAY_SECRET || suppliedSecret !== env.ROCKBOT_GATEWAY_SECRET) {
      return denied();
    }

    const incomingUrl = new URL(request.url);
    const privateUrl = new URL(incomingUrl.pathname + incomingUrl.search, "http://127.0.0.1:3434");
    const headers = new Headers(request.headers);
    headers.delete("x-rockbot-gateway");
    headers.set("host", "127.0.0.1:3434");

    try {
      return await env.ROCKBOT_LOCAL.fetch(
        new Request(privateUrl, { method: request.method, headers, body: request.body, redirect: "manual" }),
      );
    } catch {
      return unavailable();
    }
  },
};
