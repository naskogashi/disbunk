import { ProfilePictureEditor } from "@/components/ProfilePictures";
import { PasswordSettings } from "@/components/PasswordSettings";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ModuleError } from "@/components/ModuleError";
import { ServiceCatalog } from "@/components/ServiceCatalog";
import { EmailDiagnostics } from "@/components/EmailDiagnostics";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [preferences, setPreferences] = useState({ claim_assigned: true, status_changed: true, evidence_added: true });
  const query = useQuery({ queryKey: ["settings", user?.id], queryFn: async () => {
    const [profile, prefs] = await Promise.all([
      supabase.from("profiles").select("full_name,language_pref").eq("user_id", user!.id).single(),
      supabase.from("notification_preferences").select("claim_assigned,status_changed,evidence_added").eq("user_id", user!.id).maybeSingle(),
    ]);
    if (profile.error) throw profile.error;
    if (prefs.error) throw prefs.error;
    return { profile: profile.data, preferences: prefs.data };
  }, enabled: !!user });
  useEffect(() => {
    if (!query.data) return;
    setName(query.data.profile.full_name ?? ""); setLanguage(query.data.profile.language_pref);
    if (query.data.preferences) setPreferences(query.data.preferences);
  }, [query.data]);
  const save = useMutation({ mutationFn: async (section: "profile" | "preferences") => {
    const result = section === "profile"
      ? await supabase.from("profiles").update({ full_name: name.trim(), language_pref: language }).eq("user_id", user!.id).select("id").single()
      : await supabase.from("notification_preferences").upsert({ user_id: user!.id, ...preferences });
    if (result.error) throw result.error;
    if (section === "profile") await i18n.changeLanguage(language);
  }, onSuccess: () => { cache.invalidateQueries({ queryKey: ["settings"] }); toast({ title: t("tools.saved") }); },
  onError: error => toast({ title: t("auth.error"), description: error.message, variant: "destructive" }) });
  return <div className="space-y-7"><div><p className="eyebrow">{t("redesign.workspace")}</p><h1 className="mt-2 text-3xl font-extrabold">{t("nav.settings")}</h1></div>
    {query.isPending ? <p role="status">{t("tools.loading")}</p> : query.error ? <ModuleError error={query.error} retry={() => query.refetch()} /> : <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>{t("nav.profile")}</CardTitle></CardHeader><CardContent>{user&&<div className="mb-6"><ProfilePictureEditor userId={user.id} name={name||"User"}/></div>}<form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate("profile"); }}><div className="space-y-2"><Label htmlFor="profile-name">{t("tools.fullName")}</Label><Input id="profile-name" value={name} maxLength={150} onChange={event => setName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="profile-language">{t("claims.language")}</Label><select id="profile-language" className="h-11 w-full rounded-xl border bg-card px-3" value={language} onChange={event => setLanguage(event.target.value)}><option value="en">English</option><option value="sq">Shqip</option></select></div><div className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-4"><Label htmlFor="dark-theme">{t("tools.darkTheme")}</Label><Switch id="dark-theme" checked={theme === "dark"} onCheckedChange={toggleTheme} /></div><Button type="submit" disabled={save.isPending}>{t("tools.save")}</Button></form></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("tools.notificationPreferences")}</CardTitle></CardHeader><CardContent className="space-y-5">{(Object.keys(preferences) as (keyof typeof preferences)[]).map(key => <div key={key} className="flex items-center justify-between gap-3"><Label htmlFor={key}>{t(`tools.event_${key}`)}</Label><Switch id={key} checked={preferences[key]} onCheckedChange={checked => setPreferences({ ...preferences, [key]: checked })} /></div>)}<p className="text-xs leading-relaxed text-muted-foreground">{t("tools.inAppOnly")}</p><Button onClick={() => save.mutate("preferences")} disabled={save.isPending}>{t("tools.savePreferences")}</Button></CardContent></Card></div>}
    <PasswordSettings />
    <EmailDiagnostics />
    <ServiceCatalog />
  </div>;
}
