const allowedOrigins = [
  Deno.env.get("ALLOWED_ORIGIN") || "",
  "https://nakul-chatapp.lovable.app",
  "https://id-preview--6300774f-6324-430e-bfda-0cf47e3a0632.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
].filter(Boolean);

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}
