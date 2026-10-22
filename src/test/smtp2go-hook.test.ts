// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { Webhook } from "standardwebhooks";
import { describe, expect, it, vi } from "vitest";

const emailCode=readFileSync("supabase/functions/_shared/email.ts","utf8").replace(/export function/g,"function");
const code = ts.transpileModule(emailCode + "\n" + readFileSync("supabase/functions/send-auth-email/index.ts", "utf8").replace(/^import .*;\r?\n/gm,""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const secret = Buffer.from("test-secret-for-webhook-verification").toString("base64");
function harness(accepted = true) {
  let handler: (request: Request) => Promise<Response>;
  const fetchMock = vi.fn().mockImplementation(async () => Response.json({ data: { succeeded: accepted ? 1 : 0, failed: accepted ? 0 : 1 } }));
  runInNewContext(code, { Webhook, Deno: { env: { get: (key: string) => ({ SEND_EMAIL_HOOK_SECRET: `v1,whsec_${secret}`, SMTP2GO_API_KEY: "test-provider-key", SUPABASE_URL: "https://test.supabase.co", APP_URL: "https://disbunk.org" } as Record<string,string>)[key] }, serve: (callback: typeof handler) => { handler = callback; } }, Response, URL, AbortSignal, fetch: fetchMock });
  return { fetchMock, invoke: (action = "invite", valid = true, emailChange = false) => {
    const body = JSON.stringify({ user: { email: "old@example.org", new_email: "new@example.org" }, email_data: { email_action_type: action, token_hash: "new-email-hash", token_hash_new: emailChange ? "old-email-hash" : undefined, token: "123456", token_new: "789012", redirect_to: "https://evil.example/phishing" } });
    const now = new Date();
    return handler!(new Request("https://test/functions/v1/send-auth-email", { method: "POST", body, headers: { "webhook-id": "test-message", "webhook-timestamp": String(Math.floor(now.getTime()/1000)), "webhook-signature": valid ? new Webhook(secret).sign("test-message",now,body) : "v1,invalid" } }));
  } };
}
describe("SMTP2GO authentication email hook", () => {
  it("rejects forged requests without contacting the provider", async () => { const app = harness(); expect((await app.invoke("invite",false)).status).toBe(401); expect(app.fetchMock).not.toHaveBeenCalled(); });
  it("uses the requested sender and refuses a redirect outside the app", async () => {
    const app = harness(); expect((await app.invoke()).status).toBe(200);
    const payload = JSON.parse(app.fetchMock.mock.calls[0][1].body);
    expect(payload.sender).toBe("DISBUNK.org <no-reply@disbunk.org>");
    expect(payload.to).toEqual(["old@example.org"]);
    expect(payload.html_body).toContain("https://disbunk.org/email-logo.png");
    expect(payload.html_body).toContain("#a14b2b");
    expect(payload.text_body).not.toContain("evil.example");
    expect(payload.text_body).toContain("type=invite");
    expect(payload.text_body).toContain("disbunk.org");
  });
  it("handles provider rejection even when the HTTP response is 200", async () => { const app = harness(false); expect((await app.invoke()).status).toBe(502); });
  it("uses Supabase's correct old/new token mapping for secure email changes", async () => {
    const app = harness(); expect((await app.invoke("email_change",true,true)).status).toBe(200);
    const payloads = app.fetchMock.mock.calls.map(call => JSON.parse(call[1].body));
    expect(payloads[0].to).toEqual(["old@example.org"]); expect(payloads[0].text_body).toContain("token=old-email-hash");
    expect(payloads[1].to).toEqual(["new@example.org"]); expect(payloads[1].text_body).toContain("token=new-email-hash");
  });
});

it("sends recovery links to the self-service password page with a one-time token hash", async()=>{
  const app=harness();expect((await app.invoke("recovery")).status).toBe(200);
  const payload=JSON.parse(app.fetchMock.mock.calls[0][1].body);
  expect(payload.text_body).toContain("https://disbunk.org/reset-password?token_hash=new-email-hash&type=recovery");
  expect(payload.html_body).toContain("Reset your password");
});
