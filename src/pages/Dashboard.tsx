import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingModal, useOnboarding } from "@/components/OnboardingModal";
import { StatCard } from "@/components/StatCard";
import { ClaimStatusBadge } from "@/components/ClaimStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, CheckCircle, XCircle, Clock, ArrowRight, Plus, Shield,
  Activity, Users, ExternalLink,
} from "lucide-react";

// Count-up animation hook
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return value;
}

function AnimatedStat({ target, ...props }: { target: number } & Omit<React.ComponentProps<typeof StatCard>, "value">) {
  const value = useCountUp(target);
  return <StatCard value={value} {...props} />;
}

interface ClaimRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface SbunkerArticle {
  id: string;
  title: string;
  url: string;
  published_at: string | null;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  time: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isComplete: onboardingDone, markComplete } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(!onboardingDone);

  const [stats, setStats] = useState({ total: 0, verified: 0, debunked: 0, inProgress: 0 });
  const [recentClaims, setRecentClaims] = useState<ClaimRow[]>([]);
  const [sbunkerArticles, setSbunkerArticles] = useState<SbunkerArticle[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);

      const [
        claimsRes,
        verifiedRes,
        debunkedRes,
        investigatingRes,
        recentRes,
        sbunkerRes,
      ] = await Promise.all([
        supabase.from("claims").select("id", { count: "exact", head: true }),
        supabase.from("claims").select("id", { count: "exact", head: true }).eq("status", "verified"),
        supabase.from("claims").select("id", { count: "exact", head: true }).eq("status", "debunked"),
        supabase.from("claims").select("id", { count: "exact", head: true }).eq("status", "investigating"),
        supabase.from("claims").select("id, title, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("sbunker_feed").select("id, title, url, published_at").order("published_at", { ascending: false }).limit(3),
      ]);

      setStats({
        total: claimsRes.count ?? 0,
        verified: verifiedRes.count ?? 0,
        debunked: debunkedRes.count ?? 0,
        inProgress: investigatingRes.count ?? 0,
      });
      setRecentClaims(recentRes.data ?? []);
      setSbunkerArticles(sbunkerRes.data ?? []);

      // Build activity from recent claims
      setActivity(
        (recentRes.data ?? []).slice(0, 4).map((c: ClaimRow) => ({
          id: c.id,
          type: c.status,
          message: `Claim "${c.title.slice(0, 50)}${c.title.length > 50 ? "..." : ""}" — ${c.status}`,
          time: formatTimeAgo(c.created_at),
        }))
      );

      setLoading(false);
    };

    fetchDashboard();

    // Realtime subscription for claims
    const channel = supabase
      .channel("dashboard-claims")
      .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, () => {
        fetchDashboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOnboardingComplete = () => {
    markComplete();
    setShowOnboarding(false);
  };

  return (
    <div className="space-y-6">
      <OnboardingModal open={showOnboarding} onComplete={handleOnboardingComplete} />

      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/claims/new">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("dashboard.newClaim")}
            </Button>
          </Link>
          <Link to="/evidence">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" /> {t("dashboard.addEvidence")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[108px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <AnimatedStat target={stats.total} title={t("dashboard.totalClaims")} icon={FileText} variant="primary" trend={`+${Math.max(0, stats.inProgress)} active`} />
          <AnimatedStat target={stats.verified} title={t("dashboard.verified")} icon={CheckCircle} variant="success" trend={stats.total > 0 ? `${((stats.verified / stats.total) * 100).toFixed(1)}% of total` : "—"} />
          <AnimatedStat target={stats.debunked} title={t("dashboard.debunked")} icon={XCircle} variant="destructive" trend={stats.total > 0 ? `${((stats.debunked / stats.total) * 100).toFixed(1)}% of total` : "—"} />
          <AnimatedStat target={stats.inProgress} title={t("dashboard.inProgress")} icon={Clock} variant="warning" />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Claims — 2 cols */}
        <Card className="lg:col-span-2 border-border card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{t("dashboard.recentClaims")}</CardTitle>
              <Link to="/claims">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                  {t("dashboard.viewAll")} <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
            ) : recentClaims.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("claims.noResults")}</p>
              </div>
            ) : (
              recentClaims.map((claim) => (
                <Link
                  key={claim.id}
                  to={`/claims/${claim.id}`}
                  className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="claim-id shrink-0">{claim.id.slice(0, 8)}</span>
                    <span className="text-sm text-foreground truncate">{claim.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ClaimStatusBadge status={claim.status as any} />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatTimeAgo(claim.created_at)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                {t("dashboard.activityFeed")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
              ) : activity.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t("dashboard.noActivity")}</p>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary block" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground leading-relaxed truncate">{item.message}</p>
                      <p className="text-muted-foreground font-mono">{item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Sbunker Widget */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{t("dashboard.sbunkerFeed")}</CardTitle>
                <Link to="/sbunker">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
                    {t("dashboard.more")} <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
              ) : sbunkerArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t("sbunker.noArticles")}</p>
              ) : (
                sbunkerArticles.map((article) => (
                  <div key={article.id} className="space-y-1 pb-3 border-b border-border last:border-0 last:pb-0">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors leading-snug block"
                    >
                      {article.title}
                      <ExternalLink className="h-3 w-3 inline ml-1 opacity-40" />
                    </a>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {article.published_at ? new Date(article.published_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
