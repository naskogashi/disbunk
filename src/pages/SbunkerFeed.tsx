import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ExternalLink, RefreshCw, Import, Loader2, Search,
  Calendar, CheckCircle2, Clock,
} from "lucide-react";

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
  language: string | null;
}

export default function SbunkerFeed() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();
  const canRefresh = hasAnyRole(["admin", "editor"]);
  const canImport = hasAnyRole(["analyst", "editor", "team_lead", "admin"]);

  const [articles, setArticles] = useState<SbunkerArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchArticles = async () => {
    setLoading(true);
    let query = supabase
      .from("sbunker_feed")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(100);

    if (dateFrom) query = query.gte("published_at", dateFrom);
    if (dateTo) query = query.lte("published_at", `${dateTo}T23:59:59`);

    const { data } = await query;
    setArticles(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, [dateFrom, dateTo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("crawl-sbunker");
      if (error) throw error;
      toast({ title: t("admin.crawlComplete") });
      await fetchArticles();
    } catch (err: any) {
      toast({ title: t("admin.error"), description: err.message, variant: "destructive" });
    }
    setRefreshing(false);
  };

  const handleImport = async (article: SbunkerArticle) => {
    if (!user) return;
    setImporting(article.id);

    const { data, error } = await supabase
      .from("claims")
      .insert({
        title: article.title,
        description: article.excerpt || null,
        source_url: article.url,
        language: article.language === "sq" ? "sq" : "en",
        status: "pending",
        created_by: user.id,
        sbunker_source_url: article.url,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else if (data) {
      // Link the article to the new claim
      await supabase
        .from("sbunker_feed")
        .update({ imported_claim_id: data.id })
        .eq("id", article.id);

      toast({ title: t("sbunker.importSuccess") });
      // Update local state
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, imported_claim_id: data.id } : a))
      );
    }
    setImporting(null);
  };

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.excerpt?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (a.author?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const lastCrawled = articles.length > 0
    ? new Date(
        Math.max(...articles.map((a) => new Date(a.fetched_at).getTime()))
      ).toLocaleString()
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t("sbunker.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("sbunker.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {lastCrawled && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("sbunker.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 pl-9 w-40 text-xs"
              placeholder={t("sbunker.from")}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 pl-9 w-40 text-xs"
              placeholder={t("sbunker.to")}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[280px] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-sm">{t("sbunker.noArticles")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filtered.map((article) => (
            <Card key={article.id} className="border-border overflow-hidden flex flex-col card-hover">
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
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors leading-snug mb-2 line-clamp-2"
                >
                  {article.title}
                  <ExternalLink className="h-3 w-3 inline ml-1 opacity-40" />
                </a>
                {article.excerpt && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                    {article.excerpt}
                  </p>
                )}
                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {article.author && <span>{article.author} · </span>}
                      {article.published_at
                        ? new Date(article.published_at).toLocaleDateString()
                        : "—"}
                    </span>
                    {article.language && (
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {article.language}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-end">
                    {article.imported_claim_id ? (
                      <Badge className="bg-success/15 text-success text-[10px] gap-1 font-mono">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("sbunker.imported")}
                      </Badge>
                    ) : canImport ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1 h-7 border-warning/30 text-warning hover:bg-warning/10"
                        onClick={() => handleImport(article)}
                        disabled={importing === article.id}
                      >
                        {importing === article.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Import className="h-3 w-3" />
                        )}
                        {t("sbunker.importAsClaim")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer attribution */}
      <p className="text-[10px] text-muted-foreground text-center pt-4 border-t border-border">
        {t("sbunker.attribution")}
      </p>
    </div>
  );
}
