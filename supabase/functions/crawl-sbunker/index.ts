const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedItem {
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  author: string | null;
  published_at: string | null;
}

function extractFromRss(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? (m[1] || m[2] || "").trim() : null;
    };

    const title = get("title");
    const link = get("link");
    if (!title || !link) continue;

    const description = get("description");
    // Strip HTML from description for excerpt
    const excerpt = description ? description.replace(/<[^>]+>/g, "").trim().slice(0, 500) : null;

    // Try to find thumbnail in content:encoded or media:content
    const contentEncoded = get("content:encoded") || "";
    const imgMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/);
    const mediaMatch = block.match(/<media:content[^>]+url=["']([^"']+)["']/);
    const thumbnail_url = imgMatch?.[1] || mediaMatch?.[1] || null;

    const author = get("dc:creator") || get("author");
    const pubDate = get("pubDate");
    const published_at = pubDate ? new Date(pubDate).toISOString() : null;

    items.push({ title, url: link, excerpt, thumbnail_url, author, published_at });
  }

  return items;
}

function extractFromHtml(html: string): FeedItem[] {
  const items: FeedItem[] = [];
  // Simple extraction of article links from category page
  const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/g;
  let match;

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<h[2-4][^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/);
    if (!titleMatch) continue;

    const url = titleMatch[1];
    const title = titleMatch[2].trim();

    const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/);
    const excerptMatch = block.match(/<p[^>]*>([^<]+)<\/p>/);

    items.push({
      title,
      url,
      excerpt: excerptMatch?.[1]?.trim().slice(0, 500) || null,
      thumbnail_url: imgMatch?.[1] || null,
      author: null,
      published_at: null,
    });
  }

  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let items: FeedItem[] = [];

    // Try RSS first
    try {
      const rssRes = await fetch("https://sbunker.org/feed/?cat=disinfo", {
        headers: { "User-Agent": "Disbunk-Crawler/1.0" },
      });
      if (rssRes.ok) {
        const xml = await rssRes.text();
        items = extractFromRss(xml);
      }
    } catch {
      // RSS failed, fall through to HTML
    }

    // Fallback to HTML scraping
    if (items.length === 0) {
      try {
        const htmlRes = await fetch("https://sbunker.org/category/disinfo/", {
          headers: { "User-Agent": "Disbunk-Crawler/1.0" },
        });
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          items = extractFromHtml(html);
        }
      } catch {
        // Both methods failed
      }
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No articles found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert into sbunker_feed using Supabase REST API
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/sbunker_feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(
        items.map((item) => ({
          title: item.title,
          url: item.url,
          excerpt: item.excerpt,
          thumbnail_url: item.thumbnail_url,
          author: item.author,
          published_at: item.published_at,
          language: "sq",
          fetched_at: new Date().toISOString(),
        }))
      ),
    });

    if (!upsertRes.ok) {
      const err = await upsertRes.text();
      throw new Error(`Upsert failed: ${err}`);
    }

    return new Response(
      JSON.stringify({ success: true, count: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
