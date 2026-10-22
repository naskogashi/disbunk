import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { SbunkerFeedItem } from "@/types/database";

export interface FeedResult { articles: (SbunkerFeedItem & { language: string | null })[]; warning?: string; stale?: boolean }
export async function loadSbunkerFeed(force = false): Promise<FeedResult> {
  const response = await supabase.functions.invoke("crawl-sbunker", { body: { force } });
  if (!response.error && response.data?.articles) return response.data as FeedResult;
  const cached = await supabase.from("sbunker_feed").select("*").order("published_at", { ascending: false, nullsFirst: false }).limit(100);
  if (cached.error) throw cached.error;
  if (cached.data?.length) return { articles: cached.data, stale: true, warning: "cached" };
  throw new Error(response.data?.error || response.error?.message || "The feed service returned no articles. Deploy the crawl-sbunker function and try again.");
}
export function useSbunkerFeed() {
  const { user, isApproved } = useAuth();
  return useQuery({ queryKey: ["sbunker-feed", user?.id], queryFn: () => loadSbunkerFeed(), enabled: !!user && isApproved, staleTime: 15 * 60_000, refetchInterval: 15 * 60_000, retry: 1 });
}
