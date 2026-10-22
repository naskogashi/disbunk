import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleError } from "@/components/ModuleError";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function Alerts() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const cache = useQueryClient();
  const { toast } = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useQuery({ queryKey: ["alerts", user?.id, unreadOnly], queryFn: async () => {
    let request = supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(200);
    if (unreadOnly) request = request.eq("read", false);
    const result = await request;
    if (result.error) throw result.error;
    return result.data as Notification[];
  }, enabled: !!user });
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`alerts-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => cache.invalidateQueries({ queryKey: ["alerts", user.id] })).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, cache]);
  const markRead = useMutation({ mutationFn: async (id?: string) => {
    let request = supabase.from("notifications").update({ read: true }).eq("user_id", user!.id);
    request = id ? request.eq("id", id) : request.eq("read", false);
    const result = await request;
    if (result.error) throw result.error;
  }, onSuccess: () => cache.invalidateQueries({ queryKey: ["alerts"] }),
  onError: error => toast({ title: t("auth.error"), description: error.message, variant: "destructive" }) });
  return <div className="space-y-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{t("tools.responseTools")}</p><h1 className="mt-2 text-3xl font-extrabold">{t("tools.alerts")}</h1><p className="mt-2 text-muted-foreground">{t("tools.alertsDesc")}</p></div><Button variant="outline" onClick={() => markRead.mutate(undefined)} disabled={markRead.isPending || !query.data?.some(item => !item.read)}><CheckCheck className="mr-2 h-4 w-4" />{t("tools.markAllRead")}</Button></div>
    <div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} />{t("tools.unreadOnly")}</label><Link className="text-sm text-primary underline underline-offset-4" to="/settings">{t("tools.notificationPreferences")}</Link></div>
    {query.isPending ? <p role="status">{t("tools.loading")}</p> : query.error ? <ModuleError error={query.error} retry={() => query.refetch()} /> : query.data?.length === 0 ? <Card><CardContent className="py-14 text-center"><Bell className="mx-auto mb-4 h-8 w-8 text-muted-foreground" /><p>{t("tools.noAlerts")}</p></CardContent></Card> : <div className="space-y-3">{query.data?.map(item => {
      const claimId = typeof item.payload.claim_id === "string" && /^[a-f0-9-]{36}$/i.test(item.payload.claim_id) ? item.payload.claim_id : null;
      return <Card key={item.id} className={item.read ? "bg-card" : "border-primary/30 bg-secondary/50"}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0 flex-1"><p className="font-bold">{t(`tools.event_${item.type}`, { defaultValue: t("tools.alerts") })}</p><p className="mt-1 break-words text-sm text-muted-foreground">{String(item.payload.title ?? item.payload.message ?? "")}</p><time className="mt-2 block text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString(i18n.language)}</time></div><div className="flex gap-2">{claimId && <Button asChild size="sm" variant="outline"><Link to={`/claims/${claimId}`}>{t("tools.openClaim")}<ArrowUpRight className="ml-1 h-4 w-4" /></Link></Button>}{!item.read && <Button size="sm" variant="ghost" onClick={() => markRead.mutate(item.id)} disabled={markRead.isPending}>{t("tools.markRead")}</Button>}</div></CardContent></Card>;
    })}</div>}
    <p className="text-xs text-muted-foreground">{t("tools.inAppOnly")}</p>
  </div>;
}
