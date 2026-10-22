const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
interface FeedItem { title: string; url: string; excerpt: string | null; thumbnail_url: string | null; author: string | null; published_at: string | null }
const CATEGORY_URL = "https://sbunker.org/category/disinfo/";
const RSS_URL = `${CATEGORY_URL}feed/`;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const request = (url: string, options: RequestInit = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(12000) });

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&(?:#(x[0-9a-f]+|\d+)|([a-z]+));/gi, (entity, code: string, name: string) => {
    if (code) { const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1),16) : Number(code); return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity; }
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " } as Record<string,string>)[name?.toLowerCase()] ?? entity;
  }).replace(/\s+/g, " ").trim();
}
function safeUrl(value: string | null, article = false): string | null {
  if (!value?.trim()) return null;
  try { const url = new URL(value ?? "", CATEGORY_URL); return url.protocol === "https:" && (!article || ["sbunker.org", "www.sbunker.org"].includes(url.hostname)) ? url.href : null; } catch { return null; }
}
function dateOrNull(value: string | null) { const date = value ? new Date(value) : null; return date && Number.isFinite(date.getTime()) ? date.toISOString() : null; }
function extractFromRss(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const get = (tag: string) => {
      const value = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.trim();
      return value?.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1") ?? null;
    };
    const title = plainText(get("title") ?? "");
    const url = safeUrl(get("link"), true);
    if (!title || !url) continue;
    const content = get("content:encoded") ?? "";
    const image = content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i)?.[1] ?? null;
    items.push({ title, url, excerpt: plainText(get("description") ?? "").slice(0,500) || null, thumbnail_url: image ? safeUrl(image) : null, author: plainText(get("dc:creator") ?? get("author") ?? "") || null, published_at: dateOrNull(get("pubDate")) });
  }
  return [...new Map(items.map(item => [item.url, item])).values()].slice(0,30);
}
async function fetchCategory(): Promise<FeedItem[]> {
  try {
    const response = await request(RSS_URL, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "Disbunk-Crawler/1.0" } });
    if (response.ok) { const items = extractFromRss(await response.text()); if (items.length) return items; }
  } catch { /* Try the category-specific WordPress API next. */ }
  const categories = await request("https://sbunker.org/wp-json/wp/v2/categories?slug=disinfo&_fields=id");
  if (!categories.ok) throw new Error(categories.status === 403 ? "Sbunker is blocking automated feed requests. Ask the source administrator to allow the Disinfo RSS feed and WordPress category API for the importer." : "Sbunker category feed and category API are unavailable.");
  const categoryList = await categories.json();
  const id = categoryList?.[0]?.id;
  if (!Number.isInteger(id)) throw new Error("Sbunker Disinfo category could not be resolved.");
  const postsResponse = await request(`https://sbunker.org/wp-json/wp/v2/posts?categories=${id}&per_page=30&_embed=wp:featuredmedia,author`);
  if (!postsResponse.ok) throw new Error("Sbunker Disinfo articles could not be loaded.");
  const posts = await postsResponse.json();
  if (!Array.isArray(posts)) throw new Error("Sbunker returned an invalid article list.");
  return posts.flatMap(post => {
    const title = plainText(post.title?.rendered ?? ""); const url = safeUrl(post.link, true);
    if (!title || !url) return [];
    return [{ title, url, excerpt: plainText(post.excerpt?.rendered ?? "").slice(0,500) || null, thumbnail_url: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ? safeUrl(post._embedded["wp:featuredmedia"][0].source_url) : null, author: plainText(post._embedded?.author?.[0]?.name ?? "") || null, published_at: dateOrNull(post.date_gmt ? `${post.date_gmt}Z` : null) }];
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" },405);
  try {
    const base = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_ANON_KEY"); const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !key || !service) return json({ error: "Feed service is not configured." },503);
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" },401);
    const headers = { apikey: key, Authorization: authorization };
    const auth = await request(`${base}/auth/v1/user`, { headers });
    if (!auth.ok) return json({ error: "Unauthorized" },401);
    const user = await auth.json();
    if (typeof user.id !== "string" || !/^[a-f0-9-]{36}$/i.test(user.id)) return json({ error: "Unauthorized" },401);
    const profile = await request(`${base}/rest/v1/profiles?user_id=eq.${user.id}&select=status`, { headers });
    const profiles = profile.ok ? await profile.json() : [];
    if (profiles[0]?.status !== "approved") return json({ error: "An approved account is required." },403);
    const body = await req.json().catch(() => ({}));
    const serviceHeaders = { apikey: service, Authorization: `Bearer ${service}` };
    // Cache saves repeated upstream requests; every approved user can populate an empty cache.
    const cachedResponse = await request(`${base}/rest/v1/sbunker_feed?select=*&order=published_at.desc.nullslast&limit=100`, { headers: serviceHeaders });
    const cached = cachedResponse.ok ? await cachedResponse.json() : [];
    let force = false;
    if (body.force === true) {
      const roles = await request(`${base}/rest/v1/user_roles?user_id=eq.${user.id}&select=role`, { headers });
      const list = roles.ok ? await roles.json() : [];
      force = list.some((row: { role: string }) => ["admin", "editor", "team_lead"].includes(row.role));
    }
    const freshest = Math.max(...cached.map((item: { fetched_at: string }) => Date.parse(item.fetched_at)));
    if (!force && cached.length && Date.now() - freshest < 15 * 60_000) return json({ success: true, articles: cached, count: cached.length, cached: true });
    let items: FeedItem[];
    try { items = await fetchCategory(); }
    catch (error) {
      if (cached.length) return json({ success: true, articles: cached, count: cached.length, stale: true, warning: "Sbunker could not be refreshed. Showing previously fetched articles." });
      throw error;
    }
    if (!items.length) return json({ error: "Sbunker returned no Disinfo articles. Please try again later." },502);
    const now = new Date().toISOString();
    const upsert = await request(`${base}/rest/v1/sbunker_feed?on_conflict=url`, { method: "POST", headers: { ...serviceHeaders, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(items.map(item => ({ ...item, language: "sq", fetched_at: now }))) });
    if (!upsert.ok) throw new Error("Unable to save the Sbunker feed cache.");
    const saved = await request(`${base}/rest/v1/sbunker_feed?select=*&order=published_at.desc.nullslast&limit=100`, { headers: serviceHeaders });
    if (!saved.ok) throw new Error("Unable to retrieve imported Sbunker articles.");
    return json({ success: true, articles: await saved.json(), count: items.length, source: CATEGORY_URL });
  } catch (error) { console.error("Sbunker feed:", error); return json({ error: error instanceof Error ? error.message : "Feed import failed." },502); }
});
