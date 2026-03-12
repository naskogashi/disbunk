import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FileText, Shield, Star, Users, Calendar, Award, TrendingUp,
  Loader2, Crown,
} from "lucide-react";

/* ─── Types ─── */
interface ProfileStats {
  claimsSubmitted: number;
  evidenceAdded: number;
  commentsPosted: number;
  impactScore: number;
  teamCount: number;
  memberSince: string;
}

interface ActivityDay {
  date: string;
  count: number;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  impact_score: number;
  claims_count: number;
}

/* ─── Activity Heatmap ─── */
function ActivityHeatmap({ data }: { data: ActivityDay[] }) {
  const { t } = useTranslation();

  // Build 52 weeks × 7 days grid (last 364 days)
  const grid = useMemo(() => {
    const map = new Map(data.map((d) => [d.date, d.count]));
    const days: { date: string; count: number; dayOfWeek: number }[] = [];
    const today = new Date();

    for (let i = 363; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: dateStr, count: map.get(dateStr) ?? 0, dayOfWeek: d.getDay() });
    }
    return days;
  }, [data]);

  const maxCount = Math.max(1, ...grid.map((d) => d.count));

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/50";
    const intensity = count / maxCount;
    if (intensity < 0.25) return "bg-primary/20";
    if (intensity < 0.5) return "bg-primary/40";
    if (intensity < 0.75) return "bg-primary/60";
    return "bg-primary";
  };

  // Group by weeks
  const weeks: typeof grid[] = [];
  let currentWeek: typeof grid = [];
  grid.forEach((day, i) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || i === grid.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex gap-[3px] pl-8">
        {weeks.map((week, wi) => {
          const firstDay = new Date(week[0].date);
          const showLabel = firstDay.getDate() <= 7;
          return (
            <div key={wi} className="w-[11px] text-center">
              {showLabel && (
                <span className="text-[9px] text-muted-foreground">
                  {months[firstDay.getMonth()]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] pr-1">
          {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
            <div key={i} className="h-[11px] text-[9px] text-muted-foreground leading-[11px]">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-[11px] h-[11px] rounded-sm ${getColor(day.count)} transition-colors`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-mono">{day.date}</p>
                    <p>{day.count} {t("profile.contributions")}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-8">
        <span>{t("profile.less")}</span>
        <div className="flex gap-[2px]">
          {["bg-muted/50", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary"].map((c, i) => (
            <div key={i} className={`w-[11px] h-[11px] rounded-sm ${c}`} />
          ))}
        </div>
        <span>{t("profile.more")}</span>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [profile, setProfile] = useState<{
    full_name: string | null;
    impact_score: number;
    created_at: string;
    roles: string[];
  } | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoading(true);

      const [profileRes, rolesRes, claimsRes, evidenceRes, commentsRes, teamsRes, allProfilesRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).single(),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("claims").select("id, created_at").eq("created_by", user.id),
          supabase.from("evidence").select("id, created_at").eq("uploaded_by", user.id),
          supabase.from("comments").select("id, created_at").eq("user_id", user.id),
          supabase.from("team_members").select("id").eq("user_id", user.id),
          supabase.from("profiles").select("user_id, full_name, impact_score").eq("status", "approved").order("impact_score", { ascending: false }).limit(10),
        ]);

      const p = profileRes.data;
      if (p) {
        setProfile({
          full_name: p.full_name,
          impact_score: p.impact_score,
          created_at: p.created_at,
          roles: (rolesRes.data ?? []).map((r) => r.role),
        });
      }

      const claims = claimsRes.data ?? [];
      const evidence = evidenceRes.data ?? [];
      const comments = commentsRes.data ?? [];

      setStats({
        claimsSubmitted: claims.length,
        evidenceAdded: evidence.length,
        commentsPosted: comments.length,
        impactScore: p?.impact_score ?? 0,
        teamCount: teamsRes.data?.length ?? 0,
        memberSince: p?.created_at ?? "",
      });

      // Build activity data from claims + evidence + comments
      const activityMap = new Map<string, number>();
      [...claims, ...evidence, ...comments].forEach((item: { created_at: string }) => {
        const date = item.created_at.split("T")[0];
        activityMap.set(date, (activityMap.get(date) ?? 0) + 1);
      });
      setActivity(
        Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }))
      );

      // Build leaderboard
      const leaderClaims = await Promise.all(
        (allProfilesRes.data ?? []).map(async (p: any) => {
          const { count } = await supabase
            .from("claims")
            .select("id", { count: "exact", head: true })
            .eq("created_by", p.user_id);
          return {
            user_id: p.user_id,
            full_name: p.full_name,
            impact_score: p.impact_score ?? 0,
            claims_count: count ?? 0,
          };
        })
      );
      setLeaderboard(leaderClaims);

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const initials = (name: string | null) =>
    (name || "U").split(" ").map((s) => s[0]?.toUpperCase()).join("").slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials(profile?.full_name ?? null)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {profile?.full_name ?? t("admin.unnamed")}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {profile?.roles.map((role) => (
                  <Badge key={role} variant="outline" className="text-[10px] font-mono uppercase">
                    {role}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t("profile.memberSince")} {stats?.memberSince ? new Date(stats.memberSince).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { icon: FileText, value: stats?.claimsSubmitted ?? 0, label: t("profile.claimsSubmitted"), color: "primary" },
          { icon: Shield, value: stats?.evidenceAdded ?? 0, label: t("profile.evidenceAdded"), color: "success" },
          { icon: Star, value: stats?.commentsPosted ?? 0, label: t("profile.commentsPosted"), color: "warning" },
          { icon: Users, value: stats?.teamCount ?? 0, label: t("profile.teamsJoined"), color: "primary" },
          { icon: TrendingUp, value: stats?.impactScore ?? 0, label: t("profile.impactScore"), color: "success" },
        ].map((s, i) => (
          <Card key={i} className="border-border">
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${s.color}/10`}>
                  <s.icon className={`h-4 w-4 text-${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground font-mono">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Heatmap */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            {t("profile.activityHeatmap")}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-4">
          <ActivityHeatmap data={activity} />
        </CardContent>
      </Card>

      {/* Team Leaderboard */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 text-warning" />
              {t("profile.teamLeaderboard")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="lb-toggle" className="text-xs text-muted-foreground">
                {t("profile.showLeaderboard")}
              </Label>
              <Switch
                id="lb-toggle"
                checked={showLeaderboard}
                onCheckedChange={setShowLeaderboard}
              />
            </div>
          </div>
        </CardHeader>
        {showLeaderboard && (
          <CardContent className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("profile.noLeaderboard")}
              </p>
            ) : (
              leaderboard.map((entry, rank) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                    entry.user_id === user?.id ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                  } transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold font-mono w-6 text-center ${
                      rank === 0 ? "text-warning" : rank === 1 ? "text-muted-foreground" : rank === 2 ? "text-warning/60" : "text-muted-foreground"
                    }`}>
                      #{rank + 1}
                    </span>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-muted text-foreground text-[10px]">
                        {initials(entry.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {entry.full_name ?? t("admin.unnamed")}
                        {entry.user_id === user?.id && (
                          <span className="text-[10px] text-primary ml-1">({t("profile.you")})</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.claims_count} {t("profile.claimsLabel")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground font-mono">{entry.impact_score}</p>
                    <p className="text-[10px] text-muted-foreground">{t("profile.points")}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
