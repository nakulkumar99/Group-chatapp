export default function handler(req, res) {
  res.status(200).json({
    authorization: Boolean(req.headers.authorization),
    customAuthorization: Boolean(req.headers["x-supabase-authorization"]),
    authHeaders: Object.keys(req.headers).filter((name) => name.includes("auth")),
  });
}
