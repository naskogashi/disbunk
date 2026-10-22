import { brandedEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" },405);
  try {
    const base = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !anon || !service) return json({ error: "Notification service is not configured." },503);
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" },401);
    const auth = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: authorization }, signal: AbortSignal.timeout(10000) });
    if (!auth.ok) return json({ error: "Unauthorized" },401);
    const caller = await auth.json();
    if (typeof caller.id !== "string" || !/^[a-f0-9-]{36}$/i.test(caller.id)) return json({ error: "Unauthorized" },401);
    const headers = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
    const call = (path: string, options: RequestInit = {}) => fetch(`${base}${path}`, { ...options, headers, signal: AbortSignal.timeout(10000) });
    const [rolesResponse, callerProfileResponse] = await Promise.all([
      call(`/rest/v1/user_roles?user_id=eq.${caller.id}&role=eq.admin&select=role`), call(`/rest/v1/profiles?user_id=eq.${caller.id}&select=status`),
    ]);
    if (!rolesResponse.ok || !(await rolesResponse.json()).length || !callerProfileResponse.ok || (await callerProfileResponse.json())[0]?.status !== "approved") return json({ error: "Admin access required." },403);
    const { userId, approved } = await req.json();
    if (typeof userId !== "string" || !/^[a-f0-9-]{36}$/i.test(userId) || typeof approved !== "boolean") return json({ error: "Invalid registration notification." },400);
    const profileResponse = await call(`/rest/v1/profiles?user_id=eq.${userId}&select=full_name,status`);
    const profiles = profileResponse.ok ? await profileResponse.json() : [];
    const expectedStatus = approved ? "approved" : "rejected";
    if (profiles[0]?.status !== expectedStatus) return json({ error: "Save the matching approval decision before notifying the user." },409);
    const message = approved ? "Your account has been approved. You can now sign in to DISBUNK.org." : "Your DISBUNK.org registration has not been approved. Contact info@disbunk.org if you have questions.";
    const notification = await call("/rest/v1/notifications", { method: "POST", body: JSON.stringify({ user_id: userId, type: "registration", payload: { action: expectedStatus, message } }) });
    if (!notification.ok) return json({ error: "The decision was saved, but the in-app notification failed." },500);
    const apiKey = Deno.env.get("SMTP2GO_API_KEY");
    if (!apiKey) return json({ success: true, emailAccepted: false, warning: "Account decision saved. Configure SMTP2GO_API_KEY to send approval email." });
    const targetResponse = await call(`/auth/v1/admin/users/${userId}`);
    const target = targetResponse.ok ? await targetResponse.json() : null;
    const email = target?.email ?? target?.user?.email;
    if (typeof email !== "string") return json({ success: true, emailAccepted: false, warning: "No email address is available for this account." });
    const sent = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Smtp2go-Api-Key": apiKey },
      body: JSON.stringify({ sender: Deno.env.get("AUTH_EMAIL_FROM") || "DISBUNK.org <no-reply@disbunk.org>", to: [email], subject: approved ? "Your DISBUNK.org account is approved" : "Your DISBUNK.org registration", ...brandedEmail({ title: approved ? "Your workspace is ready." : "An update on your registration", message, name: profiles[0]?.full_name || undefined, actionLabel: "Open your workspace", actionUrl: approved ? "https://disbunk.org/login" : undefined }) }), signal: AbortSignal.timeout(15000),
    });
    const result = await sent.json().catch(() => null);
    if (!sent.ok || result?.data?.succeeded !== 1 || result?.data?.failed) return json({ success: true, emailAccepted: false, warning: "Account decision saved, but SMTP2GO did not accept the email. Check the verified sender and provider activity log." });
    return json({ success: true, emailAccepted: true });
  } catch { return json({ error: "Registration notification failed. Check server configuration and provider activity." },500); }
});
