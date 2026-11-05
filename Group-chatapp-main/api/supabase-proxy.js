const SUPABASE_URL = (
  process.env.VITE_SUPABASE_URL || "https://pfgawailqryusmyjdlqw.supabase.co"
).replace(/\/+$/, "");

const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const FORWARDED_HEADERS = [
  "authorization",
  "apikey",
  "content-type",
  "x-client-info",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
];

/**
 * Same-origin proxy for Supabase Edge Functions.
 *
 * Vercel's external rewrites do not reliably forward the Authorization header,
 * which caused authenticated edge-function calls to return 401. This function
 * forwards the auth/apikey headers explicitly and keeps the browser request
 * same-origin, so no CORS preflight is required.
 */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const rawPath = Array.isArray(req.query.path)
    ? req.query.path.join("/")
    : req.query.path;

  if (!rawPath) {
    res.status(400).json({ error: "Missing function name" });
    return;
  }

  const functionPath = String(rawPath)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  const headers = {};
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name];
    if (value) headers[name] = Array.isArray(value) ? value.join(",") : value;
  }

  if (!headers.apikey && SUPABASE_PUBLISHABLE_KEY) {
    headers.apikey = SUPABASE_PUBLISHABLE_KEY;
  }
  if (!headers["content-type"] && req.method !== "GET" && req.method !== "HEAD") {
    headers["content-type"] = "application/json";
  }

  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (req.body !== undefined && req.body !== null) {
      body = JSON.stringify(req.body);
    }
  }

  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/${functionPath}`, {
      method: req.method,
      headers,
      body,
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    res.send(await upstream.text());
  } catch (error) {
    console.error("Supabase function proxy failed", error);
    res.status(502).json({
      error: "The group service is temporarily unavailable. Please try again.",
    });
  }
}
