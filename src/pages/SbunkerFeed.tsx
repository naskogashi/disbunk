import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Import, Loader2 } from "lucide-react";

interface SbunkerArticle {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  imported_claim_id: string | null;
}

export default function SbunkerFeed() {
  const { t } = useTranslation();
  const { hasAnyRole } = useAuth();
  const canRefresh = hasAnyRole(["admin", "editor"]);
  const canImport = hasAnyRole(["analyst", "editor", "team_lead", "admin"]);

  const [articles, setArticles] = useState<SbunkerArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sbunker_feed")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(50);
    setArticles(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("crawl-sbunker");
      await fetchArticles();
    } catch {
      // handled silently
    }
    setRefreshing(false);
  };

  const lastCrawled = articles.length > 0
    ? new Date(articles[0].fetched_at).toLocaleString()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("sbunker.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("sbunker.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastCrawled && (
            <span className="text-xs text-muted-foreground">
              {t("sbunker.lastCrawled")}: {lastCrawled}
            </span>
          )}
          {canRefresh && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {t("sbunker.refresh")}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : articles.length === 0 ? (
        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-sm">{t("sbunker.noArticles")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <Card key={article.id} className="border-border overflow-hidden flex flex-col">
              {article.thumbnail_url && (
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={article.thumbnail_url}
                    alt={article.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <CardContent className="p-4 flex-1 flex flex-col">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors leading-snug mb-2"
                >
                  {article.title}
                </a>
                {article.excerpt && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                    {article.excerpt}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {article.author && <span>{article.author} · </span>}
                    {article.published_at && new Date(article.published_at).toLocaleDateString()}
                  </div>
                  {article.imported_claim_id ? (
                    <Badge variant="secondary" className="text-[10px]">{t("sbunker.imported")}</Badge>
                  ) : canImport ? (
                    <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                      <Import className="h-3 w-3" /> {t("sbunker.importAsClaim")}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-4">
        {t("sbunker.attribution")}
      </p>
    </div>
  );
}
