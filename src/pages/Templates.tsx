import { DraftTranslation } from "@/components/DraftTranslation";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Copy, FileCheck, Plus, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { renderResponse, type ResponseTemplate, type ClaimSummary } from "@/lib/response-tools";
import { ModuleError } from "@/components/ModuleError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const emptyDraft = { title: "", language: "en" as "en" | "sq", channel: "email" as ResponseTemplate["channel"], body: "" };

export default function Templates() {
  const { t, i18n } = useTranslation();
  const { user, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const cache = useQueryClient();
  const canCreate = hasAnyRole(["analyst", "editor", "team_lead", "admin"]);
  const canApprove = hasAnyRole(["editor", "team_lead", "admin"]);
  const [selectedId, setSelectedId] = useState("");
  const [claimId, setClaimId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const query = useQuery({ queryKey: ["response-templates", user?.id], queryFn: async () => {
    const [templates, claims] = await Promise.all([
      supabase.from("response_templates").select("*").order("updated_at", { ascending: false }),
      supabase.from("claims").select("id,title,status,source_url,description").order("created_at", { ascending: false }).limit(200),
    ]);
    if (templates.error) throw templates.error;
    if (claims.error) throw claims.error;
    return { templates: templates.data as ResponseTemplate[], claims: claims.data as ClaimSummary[] };
  }});
  const templates = query.data?.templates ?? [];
  const selected = templates.find(item => item.id === selectedId);
  const preview = renderResponse(selected?.body ?? "", query.data?.claims.find(item => item.id === claimId));
  const mutation = useMutation({ mutationFn: async (approveId?: string) => {
    if (!user) throw new Error(t("auth.error"));
    const result = approveId
      ? await supabase.from("response_templates").update({ status: "approved" }).eq("id", approveId).select("id").single()
      : editingId
        ? await supabase.from("response_templates").update({ ...draft, status: "draft" }).eq("id", editingId).select("id").single()
        : await supabase.from("response_templates").insert({ ...draft, created_by: user.id, status: "draft" }).select("id").single();
    if (result.error) throw result.error;
    return result.data;
  }, onSuccess: data => { cache.invalidateQueries({ queryKey: ["response-templates"] }); setSelectedId(data.id); setEditing(false); toast({ title: t("tools.saved") }); },
  onError: error => toast({ title: t("auth.error"), description: error.message, variant: "destructive" }) });

  const startNew = () => {
    setEditingId(null); setDraft({ ...emptyDraft, language: i18n.language.startsWith("sq") ? "sq" : "en" }); setEditing(true);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(preview.text); toast({ title: t("tools.copied") }); }
    catch { toast({ title: t("tools.copyFailed"), variant: "destructive" }); }
  };

  return <div className="space-y-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{t("tools.responseTools")}</p><h1 className="mt-2 text-3xl font-extrabold">{t("tools.templates")}</h1><p className="mt-2 text-muted-foreground">{t("tools.templatesDesc")}</p></div>{canCreate && <Button className="rounded-full" onClick={startNew}><Plus className="mr-2 h-4 w-4" />{t("tools.newTemplate")}</Button>}</div>
    {query.isPending ? <p role="status">{t("tools.loading")}</p> : query.error ? <ModuleError error={query.error} retry={() => query.refetch()} /> : <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
      <Card><CardHeader><CardTitle>{t("tools.library")}</CardTitle></CardHeader><CardContent className="space-y-3">{templates.length === 0 && <p className="text-sm text-muted-foreground">{t("tools.noTemplates")}</p>}{templates.map(item => <button key={item.id} className={`w-full rounded-xl border p-4 text-left transition-colors ${selectedId === item.id ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`} onClick={() => { setSelectedId(item.id); setEditing(false); }}><div className="flex items-center justify-between gap-2"><span className="font-bold">{item.title}</span><Badge variant={item.status === "approved" ? "default" : "secondary"}>{t(`tools.${item.status}`)}</Badge></div><p className="mt-2 text-xs uppercase text-muted-foreground">{item.language} · {t(`tools.${item.channel}`)}</p></button>)}</CardContent></Card>
      {editing ? <Card><CardHeader><CardTitle>{t("tools.editTemplate")}</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={event => { event.preventDefault(); mutation.mutate(undefined); }}>
        <div className="space-y-2"><Label htmlFor="template-title">{t("tools.title")}</Label><Input id="template-title" value={draft.title} required maxLength={200} onChange={event => setDraft({ ...draft, title: event.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="template-language">{t("claims.language")}</Label><select id="template-language" className="h-10 w-full rounded-lg border bg-card px-3" value={draft.language} onChange={event => setDraft({ ...draft, language: event.target.value as "en" | "sq" })}><option value="sq">Shqip</option><option value="en">English</option></select></div><div className="space-y-2"><Label htmlFor="template-channel">{t("tools.channel")}</Label><select id="template-channel" className="h-10 w-full rounded-lg border bg-card px-3" value={draft.channel} onChange={event => setDraft({ ...draft, channel: event.target.value as ResponseTemplate["channel"] })}>{["email", "social", "sms", "press"].map(channel => <option key={channel} value={channel}>{t(`tools.${channel}`)}</option>)}</select></div></div>
        <div className="space-y-2"><Label htmlFor="template-body">{t("tools.body")}</Label><Textarea id="template-body" rows={9} maxLength={10000} value={draft.body} required onChange={event => setDraft({ ...draft, body: event.target.value })} /><p className="break-words text-xs text-muted-foreground">{t("tools.placeholders")}: {"{{claim_title}}, {{claim_id}}, {{status}}, {{source_url}}, {{summary}}"}</p></div>
        <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, body: draft.language === "sq" ? "Përditësim verifikimi: {{claim_title}}\n\nStatusi: {{status}}\n{{summary}}\n\nBurimi: {{source_url}}\nReferenca: {{claim_id}}" : "Fact-check update: {{claim_title}}\n\nStatus: {{status}}\n{{summary}}\n\nSource: {{source_url}}\nReference: {{claim_id}}" })}>{t("tools.useStarter")}</Button>
        <p className="text-xs text-muted-foreground">{t("tools.reviewRequired")}</p><div className="flex flex-wrap gap-2"><Button type="submit" disabled={mutation.isPending || !draft.title.trim() || !draft.body.trim()}><Save className="mr-2 h-4 w-4" />{t("tools.saveDraft")}</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>{t("tools.cancel")}</Button></div>
      </form></CardContent></Card> : <Card><CardHeader><CardTitle>{t("tools.compose")}</CardTitle></CardHeader><CardContent className="space-y-4">{selected ? <>
        <div className="space-y-2"><Label htmlFor="compose-claim">{t("tools.chooseClaim")}</Label><select id="compose-claim" className="h-11 w-full rounded-lg border bg-card px-3" value={claimId} onChange={event => setClaimId(event.target.value)}><option value="">{t("tools.chooseClaim")}</option>{query.data?.claims.map(claim => <option key={claim.id} value={claim.id}>{claim.title}</option>)}</select></div>
        <pre className="min-h-48 whitespace-pre-wrap break-words rounded-xl border bg-secondary/50 p-5 font-sans text-sm leading-relaxed">{preview.text}</pre>
        {preview.missing.length > 0 && <p role="status" className="text-sm text-warning">{t("tools.missingFields")}: {preview.missing.join(", ")}</p>}
        <div className="flex flex-wrap gap-2"><Button disabled={selected.status !== "approved" || preview.missing.length > 0} onClick={copy}><Copy className="mr-2 h-4 w-4" />{t("tools.copyResponse")}</Button>{(selected.created_by === user?.id || canApprove) && <Button variant="outline" onClick={() => { setDraft({ title: selected.title, body: selected.body, language: selected.language, channel: selected.channel }); setEditingId(selected.id); setEditing(true); }}>{t("tools.edit")}</Button>}{canApprove && selected.status === "draft" && <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(selected.id)}><FileCheck className="mr-2 h-4 w-4" />{t("tools.approve")}</Button>}</div>
        <DraftTranslation key={preview.text} text={preview.text}/>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("tools.manualDistribution")}</p>
      </> : <p className="text-sm text-muted-foreground">{t("tools.selectTemplate")}</p>}</CardContent></Card>}
    </div>}
  </div>;
}
