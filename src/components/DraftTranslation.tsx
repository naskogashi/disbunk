import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { invokeFunction } from "@/lib/invoke-function";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DraftTranslation({ text }: { text: string }) {
  const { hasRole } = useAuth();
  const { t } = useTranslation();
  const [target, setTarget] = useState("en");
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!hasRole("admin")) return null;
  return <Card><CardHeader><CardTitle>{t("translation.title")}</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">{t("translation.note")}</p>
    <div className="space-y-2"><Label>{t("translation.original")}</Label><pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl border p-3 text-sm">{text}</pre></div>
    <div className="space-y-2"><Label htmlFor="translation-target">{t("translation.target")}</Label><select id="translation-target" className="h-11 w-full rounded-xl border bg-card px-3" disabled={busy} value={target} onChange={event => { setTarget(event.target.value); setResult(""); }}>{[["en","English"],["sq","Shqip"],["sr","Srpski"]].map(([value,name]) => <option key={value} value={value}>{name}</option>)}</select></div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)}/>{t("translation.consent")}</label>
    <Button disabled={busy || !consent || !text.trim() || text.length > 5000} onClick={async () => {
      setBusy(true); setError(""); setResult("");
      try { const data = await invokeFunction<{text:string}>("translate-content", { action: "translate", text, source: "auto", target, consent });
        const entities: Record<string,string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
        setResult(data.text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (match,key:string) => {
          if (entities[key]) return entities[key];
          const code = parseInt(key.slice(key[1]?.toLowerCase() === "x" ? 2 : 1), key[1]?.toLowerCase() === "x" ? 16 : 10);
          return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
        }));
      } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
    }}>{busy ? t("tools.loading") : t("translation.translate")}</Button>
    {text.length > 5000 && <p role="alert">{t("translation.limit")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {result && <div className="space-y-2"><Label htmlFor="translation-result">{t("translation.review")}</Label><Textarea id="translation-result" readOnly rows={8} value={result}/></div>}
  </CardContent></Card>;
}
