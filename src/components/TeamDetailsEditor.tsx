import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function TeamDetailsEditor({ team, onSaved }: { team: { id: string; name: string; description: string | null }; onSaved: (patch: { name: string; description: string | null }) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [busy, setBusy] = useState(false);
  return <Card><CardContent className="p-5"><form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true);
    try {
      const result = await supabase.rpc("update_team_details", { target_team_id: team.id, team_name: name.trim(), team_description: description.trim() });
      if (result.error) throw result.error;
      onSaved({ name: name.trim(), description: description.trim() || null });
      toast({ title: t("tools.saved") });
    } catch (error) { toast({ title: t("admin.error"), description: (error as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  }}>
    <h2 className="font-semibold">{t("teams.editDetails")}</h2>
    <div className="space-y-2"><Label htmlFor="edit-team-name">{t("teams.teamName")}</Label><Input id="edit-team-name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} disabled={busy}/></div>
    <div className="space-y-2"><Label htmlFor="edit-team-description">{t("claims.description")}</Label><Textarea id="edit-team-description" maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} disabled={busy}/></div>
    <Button type="submit" disabled={busy || !name.trim()}>{t("tools.save")}</Button>
  </form></CardContent></Card>;
}
