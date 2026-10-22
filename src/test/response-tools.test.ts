// @vitest-environment node
import { describe, expect, it } from "vitest";
import { priorityScore, renderResponse, sha256, summarizeClaims } from "@/lib/response-tools";

const claim = { id: "claim-1", title: "A claim", status: "verified", source_url: "https://example.org", created_at: "2026-10-22T00:00:00Z", updated_at: "2026-10-22T02:00:00Z" };
describe("Response tools", () => {
  it("fills placeholders and flags missing content without evaluating it", () => {
    const result = renderResponse("{{ claim_title }}: {{summary}} {{unknown}}", { ...claim, title: "<script>alert(1)</script>" });
    expect(result.text).toBe("<script>alert(1)</script>: {{summary}} {{unknown}}");
    expect(result.missing).toEqual(["summary", "unknown"]);
  });
  it("retains placeholders when no claim is selected", () => expect(renderResponse("{{claim_title}}", undefined).missing).toEqual(["claim_title"]));
  it("calculates SHA-256 for the actual bytes", async () => expect(await sha256(new Blob(["abc"]))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
  it("bounds triage and removes recency weight after a week", () => {
    const now = Date.parse(claim.created_at);
    expect(priorityScore({ ...claim, severity: 5, reach: 5 }, now)).toBe(100);
    expect(priorityScore({ ...claim, severity: 5, reach: 5 }, now + 8 * 86400000)).toBe(80);
    expect(priorityScore({ ...claim, severity: 100, reach: 100 }, now)).toBe(100);
  });
  it("does not invent a response-time value for unresolved or empty data", () => {
    expect(summarizeClaims([]).averageHours).toBeNull();
    expect(summarizeClaims([{ ...claim, status: "pending" }]).averageHours).toBeNull();
    expect(summarizeClaims([claim]).averageHours).toBe(2);
  });
});
