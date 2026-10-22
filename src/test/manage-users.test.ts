// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const code = ts.transpileModule(readFileSync("supabase/functions/manage-users/index.ts","utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const callerId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
function harness(admin = true, mailAccepted = true) {
  let handler: (request: Request) => Promise<Response>;
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: callerId });
    if (url.includes("/profiles?")) return Response.json([{ status: "approved" }]);
    if (url.includes("/user_roles?")) return Response.json([{ role: admin ? "admin" : "analyst" }]);
    if (url.includes("find_managed_user")) return Response.json(null);
    if (url.endsWith("/auth/v1/admin/users")) return Response.json({ id: targetId });
    if (url.includes("/auth/v1/otp")) return Response.json({ msg: "SMTP sender not authorized" }, { status: mailAccepted ? 200 : 500 });
    return new Response(null, { status: 204 });
  });
  runInNewContext(code, { Deno: { env: { get: (key: string) => key === "SUPABASE_URL" ? "https://test.supabase.co" : key === "APP_URL" ? "https://disbunk.org" : "test-key" }, serve: (callback: typeof handler) => { handler = callback; } }, fetch: fetchMock, Response, URL, AbortSignal, console: { error: vi.fn() } });
  return { fetchMock, invoke: (body: Record<string,unknown>, auth = true) => handler!(new Request("https://test/functions/v1/manage-users",{ method: "POST", headers: auth ? { Authorization: "Bearer test-token" } : {}, body: JSON.stringify(body) })) };
}
describe("Administrative account creation and invitations", () => {
  it("requires authentication", async () => { const app=harness(); expect((await app.invoke({ action:"create" },false)).status).toBe(401); expect(app.fetchMock).not.toHaveBeenCalled(); });
  it("does not permit analysts to create accounts or elevate roles", async () => { const app=harness(false); expect((await app.invoke({ action:"create", email:"user@example.org", role:"admin", approved:true })).status).toBe(403); expect(app.fetchMock.mock.calls.some(([url]) => url.endsWith("/auth/v1/admin/users"))).toBe(false); });
  it("creates a manual account without marking email verified or sending mail", async () => {
    const app=harness(); const response=await app.invoke({ action:"create", email:"user@example.org", fullName:"User", role:"analyst", approved:true });
    expect(response.status).toBe(200); expect((await response.json()).emailAccepted).toBe(false);
    const call=app.fetchMock.mock.calls.find(([url]) => url.endsWith("/auth/v1/admin/users"));
    const options=(call as unknown as [string,RequestInit])[1];
    expect(JSON.parse(options.body as string)).toMatchObject({ email_confirm:false });
    expect(app.fetchMock.mock.calls.some(([url]) => url.includes("/auth/v1/otp"))).toBe(false);
  });
  it("does not claim that an invitation was sent when the mail request fails", async () => {
    const app=harness(true,false); const response=await app.invoke({ action:"invite", email:"user@example.org" });
    expect(response.status).toBe(502); expect(await response.json()).toMatchObject({ emailAccepted:false, error:"SMTP sender not authorized" });
    expect(app.fetchMock.mock.calls.some(([url]) => url.includes("/rest/v1/team_members"))).toBe(false);
  });
});
