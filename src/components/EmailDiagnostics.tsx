import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { invokeFunction } from "@/lib/invoke-function";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EmailDiagnostics() {
  const { hasRole } = useAuth();
  const { t } = useTranslation();
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!hasRole("admin")) return null;
  return <Card><CardHeader><CardTitle>SMTP2GO</CardTitle></CardHeader><CardContent className="space-y-4"><p className="font-semibold">DISBUNK.org &lt;no-reply@disbunk.org&gt;</p><p className="text-sm leading-relaxed text-muted-foreground">{t("accounts.smtpNote")}</p><Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { const status = await invokeFunction<{ credentialsConfigured: boolean }>("manage-users", { action: "email-status" }); setResult(t(status.credentialsConfigured ? "accounts.apiConfigured" : "accounts.apiMissing")); } catch (error) { setResult(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); } }}>{t("accounts.checkEmail")}</Button>{result && <p role="status" className="rounded-lg border p-4 text-sm">{result}</p>}</CardContent></Card>;
}
