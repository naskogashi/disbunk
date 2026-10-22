import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { priorityScore, type ClaimSummary } from "@/lib/response-tools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModuleError } from "@/components/ModuleError";
import { useToast } from "@/hooks/use-toast";

interface Task { id: string; title: string; completed: boolean; assigned_to: string | null }
interface Assignee { user_id: string; full_name: string | null }

export function ClaimWorkflow({ claim, onUpdated }: { claim: ClaimSummary & { assigned_to?: string | null }; onUpdated: (patch: { severity: number; reach: number; assigned_to: string | null }) => void }) {
  const { t } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["editor", "team_lead", "admin"]);
  const cache = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(claim.assigned_to ?? "");
  const [severity, setSeverity] = useState(claim.severity ?? 3);
  const [reach, setReach] = useState(claim.reach ?? 3);
  const query = useQuery({ queryKey: ["claim-workflow", claim.id, user?.id], queryFn: async () => {
    const [tasks, profiles] = await Promise.all([
      supabase.from("claim_tasks").select("*").eq("claim_id", claim.id).order("created_at"),
      canManage ? supabase.from("profiles").select("user_id,full_name").eq("status", "approved") : Promise.resolve({ data: [], error: null }),
    ]);
    if (tasks.error) throw tasks.error;
    if (profiles.error) throw profiles.error;
    return { tasks: tasks.data as Task[], profiles: profiles.data as Assignee[] };
  }});
  const mutation = useMutation({ mutationFn: async (action: { type: "task"; task: Task } | { type: "add" } | { type: "playbook" } | { type: "triage" }) => {
    if (action.type === "task") {
      const result = await supabase.from("claim_tasks").update({ completed: !action.task.completed }).eq("id", action.task.id).select("id").single();
      if (result.error) throw result.error;
    } else if (action.type === "triage") {
      const patch = { severity, reach, assigned_to: assignee || null };
      const result = await supabase.from("claims").update(patch).eq("id", claim.id).select("id").single();
      if (result.error) throw result.error;
      onUpdated(patch);
    } else {
      const names = action.type === "playbook" ? [t("tools.stepSource"), t("tools.stepEvidence"), t("tools.stepReview"), t("tools.stepResponse")] : [title.trim()];
      const result = await supabase.from("claim_tasks").insert(names.map(name => ({ claim_id: claim.id, title: name, assigned_to: assignee || null })));
      if (result.error) throw result.error;
      setTitle("");
    }
  }, onSuccess: () => cache.invalidateQueries({ queryKey: ["claim-workflow", claim.id] }),
  onError: error => toast({ title: t("auth.error"), description: error.message, variant: "destructive" }) });
  return <Card><CardHeader><CardTitle className="text-base">{t("tools.playbook")}</CardTitle></CardHeader><CardContent className="space-y-5">
    <div className="rounded-xl bg-secondary p-4"><p className="flex items-center justify-between text-sm font-semibold">{t("tools.priority")}<span className="text-xl font-extrabold text-primary">{priorityScore(claim)}/100</span></p><p className="mt-2 text-xs text-muted-foreground">{t("tools.priorityFormula")}</p></div>
    {query.isPending ? <p role="status">{t("tools.loading")}</p> : query.error ? <ModuleError error={query.error} retry={() => query.refetch()} /> : <>
      {canManage && <div className="space-y-3"><div className="grid grid-cols-2 gap-3">{[{ key: "severity", value: severity, set: setSeverity }, { key: "reach", value: reach, set: setReach }].map(field => <div key={field.key}><Label htmlFor={`triage-${field.key}`}>{t(`tools.${field.key}`)}</Label><select id={`triage-${field.key}`} className="mt-1 h-10 w-full rounded-lg border bg-card px-3" value={field.value} onChange={event => field.set(Number(event.target.value))}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>)}</div><div><Label htmlFor="claim-assignee">{t("claims.assignedTo")}</Label><select id="claim-assignee" className="mt-1 h-10 w-full rounded-lg border bg-card px-3" value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">{t("tools.unassigned")}</option>{query.data?.profiles.map(profile => <option key={profile.user_id} value={profile.user_id}>{profile.full_name || profile.user_id.slice(0,8)}</option>)}</select></div><Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ type: "triage" })}>{t("tools.saveTriage")}</Button></div>}
      <p className="text-xs text-muted-foreground">{t("tools.checklistNote")}</p>
      {query.data?.tasks.map(task => <label key={task.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-1" checked={task.completed} disabled={mutation.isPending || (!canManage && task.assigned_to !== user?.id)} onChange={() => mutation.mutate({ type: "task", task })} /><span className={task.completed ? "text-muted-foreground line-through" : ""}>{task.title}</span></label>)}
      {canManage && <div className="space-y-3">{query.data?.tasks.length === 0 && <Button variant="outline" className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate({ type: "playbook" })}>{t("tools.applyPlaybook")}</Button>}<form className="flex gap-2" onSubmit={event => { event.preventDefault(); mutation.mutate({ type: "add" }); }}><Input aria-label={t("tools.taskTitle")} maxLength={300} value={title} onChange={event => setTitle(event.target.value)} placeholder={t("tools.taskTitle")} /><Button type="submit" disabled={!title.trim() || mutation.isPending}>{t("tools.add")}</Button></form></div>}
    </>}
  </CardContent></Card>;
}
