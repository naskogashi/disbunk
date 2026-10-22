const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const base = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!base || !anon || !service) return json({ error: "Translation service unavailable" }, 503);
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const auth = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: authorization }, signal: AbortSignal.timeout(10000) });
    if (!auth.ok) return json({ error: "Unauthorized" }, 401);
    const user = await auth.json();
    if (typeof user.id !== "string" || !/^[a-f0-9-]{36}$/i.test(user.id)) return json({ error: "Unauthorized" }, 401);
    const headers = { apikey: service, Authorization: `Bearer ${service}` };
    const [profile, roles] = await Promise.all([
      fetch(`${base}/rest/v1/profiles?user_id=eq.${user.id}&select=status,deleted_at`, { headers, signal: AbortSignal.timeout(10000) }),
      fetch(`${base}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`, { headers, signal: AbortSignal.timeout(10000) }),
    ]);
    if (!profile.ok || !roles.ok) return json({ error: "Unable to verify admin access" }, 503);
    const profiles = await profile.json(), userRoles = await roles.json();
    if (profiles[0]?.status !== "approved" || profiles[0]?.deleted_at || !userRoles.some((role: {role:string}) => role.role === "admin")) return json({ error: "Admin access required" }, 403);
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request" }, 400);
    const key = Deno.env.get("GOOGLE_TRANSLATION_API_KEY");
    if (body.action === "status") return json({ provider: "google", configured: !!key });
    if (body.action !== "translate" || typeof body.text !== "string" || !body.text.trim() || body.text.length > 5000 || !["en","sq","sr"].includes(body.target) || !["auto","en","sq","sr"].includes(body.source) || body.consent !== true) return json({ error: "Provide up to 5000 characters, supported languages, and explicit sharing consent" }, 400);
    if (!key) return json({ error: "Google Cloud Translation is not configured. An administrator must add the server secret." }, 503);
    const result = await fetch("https://translation.googleapis.com/language/translate/v2", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key }, body: JSON.stringify({ q: body.text, target: body.target, format: "text", ...(body.source === "auto" ? {} : { source: body.source }) }), signal: AbortSignal.timeout(20000) });
    if (!result.ok) return json({ error: result.status === 429 ? "Translation quota reached. Try again later." : "Translation provider rejected the request. Check API configuration, billing, and language support." }, result.status === 429 ? 429 : 502);
    const data = await result.json();
    const translation = data.data?.translations?.[0];
    if (typeof translation?.translatedText !== "string") return json({ error: "Translation provider returned no text" }, 502);
    return json({ text: translation.translatedText, detectedLanguage: translation.detectedSourceLanguage ?? body.source, target: body.target, provider: "google", machineTranslated: true });
  } catch { return json({ error: "Translation failed. Try again later." }, 502); }
});
