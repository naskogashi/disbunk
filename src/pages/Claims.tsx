import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, FileText, ArrowUpDown } from "lucide-react";

type ClaimStatus = "pending" | "investigating" | "verified" | "debunked" | "escalated";

interface Claim {
  id: string;
  title: string;
  description: string | null;
  status: ClaimStatus;
  source_url: string | null;
  language: string;
  created_at: string;
  created_by: string | null;
}

export default function Claims() {
  const { t } = useTranslation();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    const fetchClaims = async () => {
      setLoading(true);
      let query = supabase
        .from("claims")
        .select("id, title, description, status, source_url, language, created_at, created_by")
        .order("created_at", { ascending: sortOrder === "asc" });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (langFilter !== "all") {
        query = query.eq("language", langFilter);
      }

      const { data } = await query.limit(100);
      setClaims((data as Claim[]) ?? []);
      setLoading(false);
    };

    fetchClaims();
  }, [statusFilter, langFilter, sortOrder]);

  const filtered = claims.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const statusCounts = claims.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("claims.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("claims.tracked", { count: claims.length })}
          </p>
        </div>
        <Link to="/claims/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {t("claims.newClaim")}
          </Button>
        </Link>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2 animate-fade-in">
        {(["pending", "investigating", "verified", "debunked", "escalated"] as ClaimStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
              statusFilter === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30"
            }`}
          >
            <ClaimStatusBadge status={s} />
            <span className="font-mono ml-1">{statusCounts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("claims.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="w-full sm:w-32 h-10">
            <SelectValue placeholder={t("claims.selectLanguage")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="sq">Shqip</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
          title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Claims List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)
        ) : filtered.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t("claims.noResults")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setLangFilter("all");
                }}
              >
                {t("claims.clearFilters")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          filtered.map((claim, idx) => (
            <Link key={claim.id} to={`/claims/${claim.id}`}>
              <Card
                className="border-border card-hover cursor-pointer"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="claim-id">{claim.id.slice(0, 8)}</span>
                        <ClaimStatusBadge status={claim.status} />
                        <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 uppercase font-mono">
                          {claim.language}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground leading-snug">{claim.title}</h3>
                      {claim.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {claim.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                        {claim.source_url && (
                          <span className="truncate max-w-[200px]">
                            {new URL(claim.source_url).hostname}
                          </span>
                        )}
                        <span>{new Date(claim.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
