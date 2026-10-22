import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { summarizeClaims, priorityScore, type ClaimSummary } from "@/lib/response-tools";
import { ModuleError } from "@/components/ModuleError";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analytics() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [period, setPeriod] = useState(30);
  const query = useQuery({ queryKey: ["analytics", user?.id, period], queryFn: async () => {
    const since = new Date(Date.now() - period * 86400000).toISOString();
    const all: ClaimSummary[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await supabase.from("claims").select("id,title,status,source_url,created_at,updated_at,severity,reach").gte("created_at", since).order("created_at").order("id").range(offset, offset + 499);
      if (result.error) throw result.error;
      all.push(...result.data);
      if (result.data.length < 500) break;
    }
    return all;
  }});
  const claims = query.data ?? [];
  const summary = summarizeClaims(claims);
  const points = Array.from({ length: period }, (_, index) => {
    const date = new Date(); date.setUTCDate(date.getUTCDate() - period + index + 1);
    const day = date.toISOString().slice(0,10);
    return { day, count: summary.days[day] ?? 0 };
  });
  const prioritized = claims.filter(claim => !["verified", "debunked"].includes(claim.status)).sort((a,b) => priorityScore(b) - priorityScore(a)).slice(0,5);
  return <div className="space-y-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{t("tools.responseTools")}</p><h1 className="mt-2 text-3xl font-extrabold">{t("nav.analytics")}</h1><p className="mt-2 text-muted-foreground">{t("tools.analyticsDesc")}</p></div><select aria-label={t("tools.period")} className="h-11 rounded-xl border bg-card px-4" value={period} onChange={event => setPeriod(Number(event.target.value))}>{[7,30,90].map(days => <option key={days} value={days}>{t("tools.lastDays", { count: days })}</option>)}</select></div>
    {query.isPending ? <p role="status">{t("tools.loading")}</p> : query.error ? <ModuleError error={query.error} retry={() => query.refetch()} /> : <>
      <div className="grid gap-4 sm:grid-cols-3"><StatCard title={t("dashboard.totalClaims")} value={claims.length} icon={FileText} variant="primary" /><StatCard title={t("tools.resolved")} value={(summary.counts.verified ?? 0) + (summary.counts.debunked ?? 0)} icon={CheckCircle} variant="success" /><StatCard title={t("tools.resolutionTime")} value={summary.averageHours === null ? "—" : `${summary.averageHours.toFixed(1)} h`} icon={Clock} /></div>
      <Card><CardHeader><CardTitle>{t("tools.claimsOverTime")}</CardTitle></CardHeader><CardContent><div className="h-64" role="img" aria-label={t("tools.claimsOverTime")}><ResponsiveContainer width="100%" height="100%"><BarChart data={points}><XAxis dataKey="day" tickFormatter={day => day.slice(5)} minTickGap={24} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} /><Tooltip contentStyle={{ background: "hsl(var(--card))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} /><Bar dataKey="count" name={t("nav.claims")} fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
      <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>{t("tools.statusBreakdown")}</CardTitle></CardHeader><CardContent className="space-y-4">{["pending","investigating","verified","debunked","escalated"].map(status => <div key={status}><div className="mb-2 flex justify-between text-sm"><span>{t(`claims.${status}`)}</span><strong>{summary.counts[status] ?? 0}</strong></div><div className="h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${claims.length ? ((summary.counts[status] ?? 0) / claims.length) * 100 : 0}%` }} /></div></div>)}</CardContent></Card><Card><CardHeader><CardTitle>{t("tools.priorityQueue")}</CardTitle></CardHeader><CardContent className="space-y-3">{prioritized.length === 0 && <p className="text-sm text-muted-foreground">{t("tools.noActiveClaims")}</p>}{prioritized.map(claim => <Link key={claim.id} to={`/claims/${claim.id}`} className="flex items-center justify-between gap-4 rounded-xl border p-4 text-sm hover:bg-secondary"><span>{claim.title}</span><strong className="text-primary">{priorityScore(claim)}</strong></Link>)}</CardContent></Card></div>
      <p className="text-xs text-muted-foreground">{t("tools.analyticsNote")}</p>
    </>}
  </div>;
}
