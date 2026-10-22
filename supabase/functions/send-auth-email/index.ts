import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

interface HookPayload {
  user: { email: string; new_email?: string };
  email_data: { email_action_type: string; token_hash: string; token_hash_new?: string; token: string; token_new?: string; redirect_to?: string };
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" },405);
  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  const apiKey = Deno.env.get("SMTP2GO_API_KEY");
  const base = Deno.env.get("SUPABASE_URL");
  if (!secret || !apiKey || !base) return json({ error: { http_code: 503, message: "Authentication email delivery is not configured." } },503);
  let payload: HookPayload;
  try {
    const text = await req.text();
    if (text.length > 100_000) return json({ error: "Payload too large" },413);
    payload = new Webhook(secret.replace(/^v1,whsec_/, "")).verify(text, Object.fromEntries(req.headers)) as HookPayload;
  } catch { return json({ error: { http_code: 401, message: "Invalid email hook signature." } },401); }
  try {
    const { user, email_data: data } = payload;
    if (!user?.email || !data || (!data.token_hash && data.email_action_type !== "reauthentication") || !["signup","invite","magiclink","recovery","email_change","reauthentication"].includes(data.email_action_type)) return json({ error: { http_code: 400, message: "Unsupported authentication email." } },400);
    const app = new URL(Deno.env.get("APP_URL") || "https://disbunk.org");
    let redirect = new URL("/dashboard", app).href;
    if (data.redirect_to) {
      const candidate = new URL(data.redirect_to);
      if (candidate.origin === app.origin) redirect = candidate.href;
    }
    const messages = data.email_action_type === "email_change"
      ? data.token_hash_new
        ? [{ email: user.email, hash: data.token_hash_new, token: data.token }, { email: user.new_email, hash: data.token_hash, token: data.token_new || data.token }]
        : [{ email: user.new_email, hash: data.token_hash, token: data.token_new || data.token }]
      : [{ email: user.email, hash: data.token_hash, token: data.token }];
    for (const message of messages) {
      if (!message.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) throw new Error("Invalid recipient");
      const link = new URL("/auth/v1/verify", base);
      link.searchParams.set("token", message.hash);
      link.searchParams.set("type", data.email_action_type);
      link.searchParams.set("redirect_to", redirect);
      const subject = data.email_action_type === "invite" ? "You are invited to DISBUNK.org" : data.email_action_type === "recovery" ? "Recover your DISBUNK.org account" : data.email_action_type === "email_change" ? "Confirm your DISBUNK.org email change" : "Sign in to DISBUNK.org";
      const text = data.email_action_type === "reauthentication" ? `Your DISBUNK.org confirmation code is: ${message.token}` : `${subject}\n\nContinue securely using this link:\n${link.href}\n\nYour one-time code: ${message.token}\n\nIf you did not request this, you can ignore this email.\n\nDISBUNK.org`;
      const response = await fetch("https://api.smtp2go.com/v3/email/send", { method: "POST", headers: { "Content-Type": "application/json", "X-Smtp2go-Api-Key": apiKey }, body: JSON.stringify({ sender: Deno.env.get("AUTH_EMAIL_FROM") || "DISBUNK.org <no-reply@disbunk.org>", to: [message.email], subject, text_body: text }), signal: AbortSignal.timeout(15000) });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.data?.succeeded !== 1 || result?.data?.failed) return json({ error: { http_code: 502, message: "SMTP2GO did not accept the authentication email. Check sender verification and provider activity." } },502);
    }
    return json({});
  } catch { return json({ error: { http_code: 502, message: "Authentication email delivery failed." } },502); }
});
