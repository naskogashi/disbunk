import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/lib/invoke-function";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ManageUserForm({ teamId, onComplete }: { teamId?: string; onComplete: () => void }) {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const admin = hasRole("admin");
  const { toast } = useToast();
  const [mode, setMode] = useState("invite");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("analyst");
  const [approved, setApproved] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(teamId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const teams = useQuery({ queryKey: ["manage-user-teams", user?.id], enabled: admin && !teamId, queryFn: async () => {
    const result = await supabase.from("teams").select("id,name").order("name");
    if (result.error) throw result.error;
    return result.data;
  }});
  return <form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await invokeFunction<{ emailAccepted: boolean; warning?: string }>("manage-users", { action: mode, email, fullName: name, role, approved, teamId: selectedTeam || undefined });
      toast({ title: t(result.emailAccepted ? "accounts.inviteAccepted" : "accounts.created"), description: result.warning || t(result.emailAccepted ? "accounts.deliveryNote" : "accounts.noEmailSent") });
      onComplete();
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); }
  }}>
    {admin && !teamId && <div className="space-y-2"><Label htmlFor="user-mode">{t("accounts.action")}</Label><select id="user-mode" className="h-11 w-full rounded-lg border bg-card px-3" value={mode} onChange={event => setMode(event.target.value)}><option value="invite">{t("accounts.invite")}</option><option value="create">{t("accounts.manualCreate")}</option></select></div>}
    <div className="space-y-2"><Label htmlFor="managed-email">{t("auth.email")}</Label><Input id="managed-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></div>
    <div className="space-y-2"><Label htmlFor="managed-name">{t("tools.fullName")}</Label><Input id="managed-name" maxLength={150} value={name} onChange={event => setName(event.target.value)} /></div>
    {admin && mode === "create" && <><div className="space-y-2"><Label htmlFor="managed-role">{t("admin.role")}</Label><select id="managed-role" className="h-11 w-full rounded-lg border bg-card px-3" value={role} onChange={event => setRole(event.target.value)}>{["visitor","analyst","editor","team_lead","admin"].map(value => <option key={value} value={value}>{value}</option>)}</select></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} />{t("accounts.approveNow")}</label></>}
    {admin && !teamId && <div className="space-y-2"><Label htmlFor="managed-team">{t("accounts.teamOptional")}</Label><select id="managed-team" className="h-11 w-full rounded-lg border bg-card px-3" value={selectedTeam} onChange={event => setSelectedTeam(event.target.value)}><option value="">{t("tools.unassigned")}</option>{teams.data?.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>}
    <p className="text-xs leading-relaxed text-muted-foreground">{t(mode === "invite" ? "accounts.inviteNote" : "accounts.noEmailSent")}</p>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <Button type="submit" className="w-full" disabled={busy || !email.trim()}>{busy ? t("tools.loading") : t(mode === "invite" ? "accounts.invite" : "accounts.manualCreate")}</Button>
  </form>;
}
