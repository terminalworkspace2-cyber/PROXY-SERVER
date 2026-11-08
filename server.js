const http = require("node:http");
const https = require("node:https");
const { timingSafeEqual } = require("node:crypto");

const PORT = process.env.PORT || 10000;
const KEY = process.env.GATEWAY_API_KEY;
const UPSTREAM = process.env.UPSTREAM_BASE_URL;

if (!KEY || !UPSTREAM) {
  console.error("Set GATEWAY_API_KEY and UPSTREAM_BASE_URL.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  const supplied = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(KEY);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
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

  const target = new URL(req.url, UPSTREAM);
  const transport = target.protocol === "https:" ? https : http;

  const proxy = transport.request(target, {
    method: req.method,
    headers
  }, response => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });

  proxy.on("error", error => {
    console.error("Upstream error:", error.message);
    if (!res.headersSent) res.writeHead(502);
    res.end("Upstream unavailable");
  });

  req.pipe(proxy);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Gateway listening on ${PORT}`);
});
