// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const code = ts.transpileModule(readFileSync("supabase/functions/crawl-sbunker/index.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const uid = "a1b2c3d4-0001-4000-8000-000000000001";
interface HarnessOptions { approved?: boolean; cached?: Record<string, unknown>[]; failSource?: boolean; date?: string }
function harness({ approved = true, cached = [], failSource = false, date = "not a date" }: HarnessOptions = {}) {
  let handler: (request: Request) => Promise<Response>;
  let stored = cached;
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/auth/v1/user")) return Response.json({ id: uid });
    if (url.includes("/profiles?")) return Response.json([{ status: approved ? "approved" : "pending_approval" }]);
    if (url.includes("/user_roles?")) return Response.json([{ role: "editor" }]);
    if (url.includes("/rest/v1/sbunker_feed") && options?.method !== "POST") return Response.json(stored);
    if (url.includes("/rest/v1/sbunker_feed") && options?.method === "POST") {
      stored = JSON.parse(options.body as string).map((row: Record<string, unknown>) => ({ id: "article-id", ...row }));
      return new Response(null, { status: 201 });
    }
    if (url === "https://sbunker.org/category/disinfo/feed/" && !failSource) return new Response(`<rss><channel><item><title>Test &amp; article</title><link>https://sbunker.org/test/</link><pubDate>${date}</pubDate></item></channel></rss>`);
    return new Response("Unavailable", { status: 503 });
  });
  runInNewContext(code, { Deno: { env: { get: (key: string) => key === "SUPABASE_URL" ? "https://test.supabase.co" : "test-key" }, serve: (callback: typeof handler) => { handler = callback; } }, fetch: fetchMock, Response, URL, AbortSignal, console: { error: vi.fn() } });
  return { fetchMock, invoke: (authorized = true, force = false) => handler!(new Request("https://test/functions/v1/crawl-sbunker", { method: "POST", headers: authorized ? { Authorization: "Bearer signed-test-token", "Content-Type": "application/json" } : {}, body: JSON.stringify({ force }) })) };
}

describe("Sbunker category feed", () => {
  it.each([["not a date", null], ["Wed, 21 Oct 2026 10:00:00 GMT", "2026-10-21T10:00:00.000Z"]])("imports the intended category with date %s", async (date, expected) => {
    const app = harness({ date });
    const response = await app.invoke();
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.articles[0]).toMatchObject({ title: "Test & article", published_at: expected });
    const call = app.fetchMock.mock.calls.find(([url, options]) => url.includes("on_conflict=url") && options?.method === "POST");
    expect(call).toBeDefined();
    expect(JSON.parse(call![1]!.body as string)[0]).not.toHaveProperty("imported_claim_id");
    expect(app.fetchMock.mock.calls.some(([url]) => url === "https://sbunker.org/category/disinfo/feed/")).toBe(true);
  });
  it("rejects unauthenticated access before fetching upstream", async () => {
    const app = harness(); expect((await app.invoke(false)).status).toBe(401); expect(app.fetchMock).not.toHaveBeenCalled();
  });
  it("rejects accounts awaiting approval", async () => {
    const app = harness({ approved: false }); expect((await app.invoke()).status).toBe(403);
    expect(app.fetchMock.mock.calls.some(([url]) => url.startsWith("https://sbunker.org"))).toBe(false);
  });
  it("uses a fresh cache without contacting Sbunker", async () => {
    const app = harness({ cached: [{ id: "cached", fetched_at: new Date().toISOString() }] });
    expect((await (await app.invoke()).json()).cached).toBe(true);
    expect(app.fetchMock.mock.calls.some(([url]) => url.startsWith("https://sbunker.org"))).toBe(false);
  });
  it("returns cached articles with a warning when the source fails", async () => {
    const app = harness({ failSource: true, cached: [{ id: "cached", fetched_at: "2020-01-01" }] });
    const result = await (await app.invoke()).json(); expect(result.stale).toBe(true); expect(result.articles[0].id).toBe("cached");
  });
  it("reports source failure instead of claiming an empty import succeeded", async () => {
    const app = harness({ failSource: true }); expect((await app.invoke()).status).toBe(502);
  });
});
