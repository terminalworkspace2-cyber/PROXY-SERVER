const http = require("node:http");
const https = require("node:https");
const { timingSafeEqual } = require("node:crypto");

const PORT = process.env.PORT || 10000;
const GATEWAY_KEY = process.env.GATEWAY_API_KEY;
const UPSTREAM = process.env.UPSTREAM_BASE_URL;
const CF_ID = process.env.CF_ACCESS_CLIENT_ID;
const CF_SECRET = process.env.CF_ACCESS_CLIENT_SECRET;

if (!GATEWAY_KEY || !UPSTREAM || !CF_ID || !CF_SECRET) {
  console.error("Missing required gateway or Cloudflare Access configuration.");
  process.exit(1);
}

function authorized(req) {
  const supplied = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(GATEWAY_KEY);
  return a.length === b.length && timingSafeEqual(a, b);
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  if (!authorized(req)) {
    res.writeHead(401, { "content-type": "application/json" });
    return res.end(JSON.stringify({ error: "Unauthorized" }));
  }

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.authorization;

  headers["X-OmniRoute-Mode"] = headers["x-omniroute-mode"] || "quality";
  headers["X-OmniRoute-Effort"] = headers["x-omniroute-effort"] || "auto";
  headers["X-OmniRoute-Budget"] = headers["x-omniroute-budget"] || "0.05";
  headers["X-OmniRoute-Budget-Fallback"] =
    headers["x-omniroute-budget-fallback"] || "strict";

  headers["CF-Access-Client-Id"] = CF_ID;
  headers["CF-Access-Client-Secret"] = CF_SECRET;

  const target = new URL(req.url, UPSTREAM);
  const transport = target.protocol === "https:" ? https : http;

  const upstream = transport.request(target, {
    method: req.method,
    headers
  }, (response) => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });

  upstream.on("error", (error) => {
    console.error("Upstream connection failed:", error.message);
    if (!res.headersSent) res.writeHead(502);
    res.end("Upstream unavailable");
  });

  req.pipe(upstream);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Gateway listening on ${PORT}`);
});
