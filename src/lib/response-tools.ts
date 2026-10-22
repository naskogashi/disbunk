export interface ResponseTemplate {
  id: string; title: string; language: "en" | "sq";
  channel: "email" | "social" | "sms" | "press";
  body: string; status: "draft" | "approved"; created_by: string | null;
}
export interface ClaimSummary {
  id: string; title: string; status: string; source_url: string | null;
  description?: string | null; created_at?: string; updated_at?: string;
  severity?: number; reach?: number;
}

export function renderResponse(body: string, claim: ClaimSummary | undefined) {
  const values: Record<string, string> = claim ? {
    claim_title: claim.title, claim_id: claim.id, status: claim.status,
    source_url: claim.source_url ?? "", summary: claim.description ?? "",
  } : {};
  const missing = new Set<string>();
  const text = body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (placeholder, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, key) || !values[key]) { missing.add(key); return placeholder; }
    return values[key];
  });
  return { text, missing: [...missing] };
}

// Severity 50%, reach 30%, recency 20%. This is triage, never a truth score.
export function priorityScore(claim: ClaimSummary, now = Date.now()) {
  const level = (n: number | undefined) => Math.max(1, Math.min(5, n ?? 3)) / 5;
  const created = Date.parse(claim.created_at ?? "");
  const ageHours = Number.isFinite(created) ? Math.max(0, (now - created) / 3_600_000) : 168;
  const recency = Math.max(0, 1 - ageHours / 168);
  return Math.round(50 * level(claim.severity) + 30 * level(claim.reach) + 20 * recency);
}

export async function sha256(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function redactImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Only JPEG, PNG, and WebP images support metadata removal.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error("Image exceeds the 40 megapixel limit.");
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Image processing failed.")), "image/png"));
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.png`, { type: "image/png" });
  } finally { bitmap.close(); }
}

export function summarizeClaims(claims: ClaimSummary[]) {
  const counts: Record<string, number> = {};
  const days: Record<string, number> = {};
  let resolved = 0, hours = 0;
  for (const claim of claims) {
    counts[claim.status] = (counts[claim.status] ?? 0) + 1;
    if (claim.created_at) { const day = claim.created_at.slice(0, 10); days[day] = (days[day] ?? 0) + 1; }
    if (["verified", "debunked"].includes(claim.status) && claim.created_at && claim.updated_at) {
      const elapsed = Date.parse(claim.updated_at) - Date.parse(claim.created_at);
      if (Number.isFinite(elapsed) && elapsed >= 0) { hours += elapsed / 3_600_000; resolved++; }
    }
  }
  return { counts, days, averageHours: resolved ? hours / resolved : null };
}
