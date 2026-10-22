import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ModuleError } from "@/components/ModuleError";

const factors = ["context", "causes", "content", "consequences", "amplification", "intentEvidence", "sources"] as const;
type Assessment = Partial<Record<typeof factors[number], string>> & { classification?: string };

export function C5Assessment({ claimId }: { claimId: string }) {
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const canEdit = hasAnyRole(["editor", "team_lead", "admin"]);
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["c5", claimId, user?.id], queryFn: async () => {
    const result = await supabase.from("claims").select("c5_assessment").eq("id", claimId).single();
    if (result.error) throw result.error;
    return (result.data.c5_assessment ?? {}) as Assessment;
  }});
  return <Card><CardHeader><CardTitle>{t("c5.title")}</CardTitle><p className="text-sm text-muted-foreground">{t("c5.note")}</p></CardHeader><CardContent>
    {query.isPending ? <p role="status">{t("tools.loading")}</p> : query.error ? <ModuleError error={query.error} retry={() => query.refetch()}/> : <AssessmentForm key={JSON.stringify(query.data)} initial={query.data} claimId={claimId} canEdit={canEdit} onSaved={() => cache.invalidateQueries({ queryKey: ["c5", claimId] })}/>}
  </CardContent></Card>;
}

function AssessmentForm({ initial, claimId, canEdit, onSaved }: { initial: Assessment; claimId: string; canEdit: boolean; onSaved: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Assessment>(initial);
  const [busy, setBusy] = useState(false);
  return <form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true);
    try {
      if (draft.classification === "disinformation" && !draft.intentEvidence?.trim()) throw new Error(t("c5.intentRequired"));
      // Compare the original value to prevent silently overwriting another editor.
      const result = await supabase.from("claims").update({ c5_assessment: draft }).eq("id", claimId).eq("c5_assessment", JSON.stringify(initial)).select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error(t("c5.conflict"));
      onSaved(); toast({ title: t("tools.saved") });
    } catch (error) { toast({ title: t("admin.error"), description: (error as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  }}>
    <div className="space-y-2"><Label htmlFor="c5-classification">{t("c5.classification")}</Label><select id="c5-classification" disabled={!canEdit || busy} className="h-11 w-full rounded-xl border bg-card px-3" value={draft.classification ?? "unknown"} onChange={event => setDraft({ ...draft, classification: event.target.value })}>{["unknown", "misinformation", "disinformation"].map(value => <option key={value} value={value}>{t(`c5.${value}`)}</option>)}</select></div>
    {factors.map(factor => <div key={factor} className="space-y-2"><Label htmlFor={`c5-${factor}`}>{t(`c5.${factor}`)}</Label><p className="text-xs text-muted-foreground" id={`c5-${factor}-hint`}>{t(`c5.${factor}Hint`)}</p><Textarea id={`c5-${factor}`} aria-describedby={`c5-${factor}-hint`} readOnly={!canEdit} disabled={busy} maxLength={4000} value={draft[factor] ?? ""} onChange={event => setDraft({ ...draft, [factor]: event.target.value })}/></div>)}
    {canEdit && <Button disabled={busy} type="submit">{t("tools.save")}</Button>}
  </form>;
}
