const configuredOrigins = [
  Deno.env.get("ALLOWED_ORIGINS") || "",
  Deno.env.get("ALLOWED_ORIGIN") || "",
]
  .flatMap((value) => value.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultOrigins = [
  "https://nakul-chatapp.lovable.app",
  "https://id-preview--6300774f-6324-430e-bfda-0cf47e3a0632.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const allowedOrigins = [...new Set([...configuredOrigins, ...defaultOrigins])];

function isAllowedOrigin(origin: string) {
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { protocol, hostname } = new URL(origin);
    // Allow Vercel production and preview deployments. Edge functions still
    // require a valid Supabase JWT and enforce their own authorization.
    return (
      protocol === "https:" &&
      (hostname === "vercel.app" || hostname.endsWith(".vercel.app"))
    );
  } catch {
    return false;
  }
}

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}
