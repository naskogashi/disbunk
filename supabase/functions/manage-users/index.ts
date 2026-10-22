const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const uuid = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" },405);
  try {
    const base = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !anon || !service) return json({ error: "User management service is not configured." },503);
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" },401);
    const callerHeaders = { apikey: anon, Authorization: authorization };
    const serviceHeaders = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
    const call = (path: string, options: RequestInit = {}) => fetch(`${base}${path}`, { ...options, headers: { ...serviceHeaders, ...options.headers }, signal: AbortSignal.timeout(15000) });
    const auth = await fetch(`${base}/auth/v1/user`, { headers: callerHeaders, signal: AbortSignal.timeout(15000) });
    if (!auth.ok) return json({ error: "Unauthorized" },401);
    const caller = await auth.json();
    if (!uuid(caller.id)) return json({ error: "Unauthorized" },401);
    const [profileResponse, rolesResponse] = await Promise.all([
      call(`/rest/v1/profiles?user_id=eq.${caller.id}&select=status`), call(`/rest/v1/user_roles?user_id=eq.${caller.id}&select=role`),
    ]);
    if (!profileResponse.ok || !rolesResponse.ok) return json({ error: "Unable to verify access." },503);
    const profiles = await profileResponse.json(); const roles = await rolesResponse.json();
    const admin = roles.some((row: { role: string }) => row.role === "admin");
    if (profiles[0]?.status !== "approved") return json({ error: "Approval required." },403);
    const body = await req.json();
    if (body.action === "email-status") {
      if (!admin) return json({ error: "Admin access required." },403);
      const api = !!Deno.env.get("SMTP2GO_API_KEY"); const sender = !!Deno.env.get("AUTH_EMAIL_FROM");
      return json({ provider: "SMTP2GO", credentialsConfigured: api && sender, apiKeyPresent: api, senderPresent: sender, hookSecretPresent: !!Deno.env.get("SEND_EMAIL_HOOK_SECRET"), smtpConfigurationVerified: false, hookActivationVerified: false });
    }
    if (!["create", "invite"].includes(body.action)) return json({ error: "Invalid action." },400);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || name.length > 150) return json({ error: "A valid email and name are required." },400);
    const teamId = body.teamId;
    if (teamId && !uuid(teamId)) return json({ error: "Invalid team." },400);
    if (!admin) {
      if (body.action !== "invite" || !teamId) return json({ error: "Admin access required." },403);
      const membership = await call(`/rest/v1/team_members?team_id=eq.${teamId}&user_id=eq.${caller.id}&role=eq.lead&select=id`);
      if (!membership.ok || !(await membership.json()).length) return json({ error: "Team lead access required." },403);
    }
    if (teamId) {
      const team = await call(`/rest/v1/teams?id=eq.${teamId}&select=id`);
      if (!team.ok || !(await team.json()).length) return json({ error: "Team not found." },404);
    }
    const role = body.role ?? "analyst";
    if (body.action === "create" && !["visitor","analyst","editor","team_lead","admin"].includes(role)) return json({ error: "Invalid role." },400);
    const lookup = await call("/rest/v1/rpc/find_managed_user", { method: "POST", body: JSON.stringify({ user_email: email }) });
    if (!lookup.ok) return json({ error: "Apply the registration and teams migration before managing users." },503);
    let userId = await lookup.json();
    if (body.action === "create") {
      if (userId) return json({ error: "An account already exists for this address. Add it to a team or send an invitation instead." },409);
      const created = await call("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, email_confirm: false, user_metadata: { full_name: name } }) });
      const result = await created.json();
      if (!created.ok) return json({ error: result.msg || result.message || "Account creation failed." },400);
      userId = result.id ?? result.user?.id;
      if (!uuid(userId)) throw new Error("Account creation returned an invalid user identifier.");
      const configured = await call("/rest/v1/rpc/configure_managed_user", { method: "POST", body: JSON.stringify({ target_user_id: userId, user_name: name, user_role: role, approve_user: body.approved === true }) });
      if (!configured.ok) return json({ error: "The authentication account was created, but profile configuration failed. Review it in Admin before retrying.", userId },500);
    } else {
      // OTP supports new and existing accounts, making invitations resendable.
      // Supabase Auth delivers this through its configured SMTP2GO SMTP transport.
      const appUrl = new URL(Deno.env.get("APP_URL") || "https://disbunk.org");
      if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost" && appUrl.hostname !== "127.0.0.1") throw new Error("APP_URL must use HTTPS.");
      const redirect = new URL("/dashboard", appUrl).href;
      const sent = await call(`/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", body: JSON.stringify({ email, create_user: true, ...(userId ? {} : { data: { full_name: name } }) }) });
      const result = await sent.json().catch(() => ({}));
      if (!sent.ok) return json({ error: result.msg || result.error_description || result.message || "Email delivery was rejected. Check SMTP2GO SMTP settings, the verified sender, and Auth email rate limits.", emailAccepted: false }, sent.status === 429 ? 429 : 502);
      const found = await call("/rest/v1/rpc/find_managed_user", { method: "POST", body: JSON.stringify({ user_email: email }) });
      userId = found.ok ? await found.json() : null;
      if (!uuid(userId)) return json({ error: "The email request was accepted, but the user profile could not be linked. Review the account before retrying.", emailAccepted: true },500);
    }
    if (teamId) {
      // Ignore an existing membership without downgrading an existing lead.
      const added = await call("/rest/v1/team_members?on_conflict=team_id,user_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" }, body: JSON.stringify({ team_id: teamId, user_id: userId, role: "member" }) });
      if (!added.ok) return json({ error: "The account was processed, but team membership could not be saved. Review the account before retrying.", userId, emailAccepted: body.action === "invite" },500);
    }
    const audit = await call("/rest/v1/audit_logs", { method: "POST", body: JSON.stringify({ admin_id: caller.id, action: body.action === "create" ? "user_created" : "user_invited", target_type: "user", target_id: userId, metadata: { team_id: teamId || null, email_accepted: body.action === "invite" } }) });
    if (!audit.ok) return json({ success: true, userId, emailAccepted: body.action === "invite", warning: "The action completed, but audit logging failed." });
    return json({ success: true, userId, emailAccepted: body.action === "invite" });
  } catch (error) { console.error("User management failed"); return json({ error: error instanceof Error ? error.message : "User management failed." },500); }
});
