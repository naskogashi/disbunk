// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { expect, it, vi } from "vitest";
const code = ts.transpileModule(readFileSync("supabase/functions/translate-content/index.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function harness(admin = true, configured = true) {
  let handler: (req: Request) => Promise<Response>;
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/auth/v1/user")) return Response.json({ id: "00000000-0000-4000-8000-000000000001" });
    if (url.includes("profiles?")) return Response.json([{ status: "approved", deleted_at: null }]);
    if (url.includes("user_roles?")) return Response.json([{ role: admin ? "admin" : "analyst" }]);
    return Response.json({ data: { translations: [{ translatedText: "Përkthim", detectedSourceLanguage: "en" }] } });
  });
  runInNewContext(code, { Deno: { env: { get: (key: string) => key === "GOOGLE_TRANSLATION_API_KEY" ? configured ? "test-provider-key" : undefined : key === "SUPABASE_URL" ? "https://test.supabase.co" : "test-key" }, serve: (fn: typeof handler) => { handler = fn; } }, fetch: fetchMock, Response, AbortSignal });
  return { fetchMock, invoke: (body: unknown, auth = true) => handler!(new Request("https://test/translate-content", { method: "POST", headers: auth ? { Authorization: "Bearer test-token" } : {}, body: JSON.stringify(body) })) };
}
const request = { action: "translate", text: "Original evidence", source: "auto", target: "sq", consent: true };
it("rejects anonymous and nonadmin callers before contacting Google", async () => {
  const app = harness(false); expect((await app.invoke(request, false)).status).toBe(401); expect((await app.invoke(request)).status).toBe(403);
  expect(app.fetchMock.mock.calls.some(([url]) => url.includes("googleapis"))).toBe(false);
});
it("requires consent and bounds translation content", async () => {
  const app = harness(); expect((await app.invoke({ ...request, consent: false })).status).toBe(400);
  expect((await app.invoke({ ...request, text: "x".repeat(5001) })).status).toBe(400);
  expect(app.fetchMock.mock.calls.some(([url]) => url.includes("googleapis"))).toBe(false);
});
it("reports missing configuration without leaking or transmitting text", async () => {
  const app = harness(true, false); expect((await app.invoke(request)).status).toBe(503);
  expect(app.fetchMock.mock.calls.some(([url]) => url.includes("googleapis"))).toBe(false);
});
it("sends plain text to the fixed provider endpoint and returns a labeled draft", async () => {
  const app = harness(); const response = await app.invoke(request);
  expect(await response.json()).toMatchObject({ text: "Përkthim", machineTranslated: true });
  const providerCall = app.fetchMock.mock.calls.find(([url]) => url.includes("googleapis")) as unknown as [string, RequestInit];
  expect(providerCall[0]).toBe("https://translation.googleapis.com/language/translate/v2");
  expect(JSON.parse(providerCall[1].body as string)).toMatchObject({ q: request.text, format: "text", target: "sq" });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
