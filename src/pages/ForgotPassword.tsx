import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { PublicHeader } from "@/components/PublicHeader";
import { ProjectFooter } from "@/components/ProjectFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export default function ForgotPassword(){
  const {t}=useTranslation();const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [error,setError]=useState("");
  return <div className="flex min-h-screen flex-col"><PublicHeader/><main id="content" className="page-wrap flex flex-1 items-center justify-center py-16"><Card className="w-full max-w-md"><CardHeader><h1 className="text-2xl font-bold">{t("accountTools.forgotPassword")}</h1></CardHeader><CardContent className="space-y-5">{sent?<p role="status">{t("accountTools.resetSent")}</p>:<form className="space-y-4" onSubmit={async event=>{event.preventDefault();setBusy(true);setError("");try{const result=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:new URL("/reset-password",window.location.origin).href});if(result.error)throw result.error;setSent(true);}catch(error){setError(error instanceof Error?error.message:t("accountTools.resetFailed"));}finally{setBusy(false);}}}><p className="text-sm text-muted-foreground">{t("accountTools.recoveryNote")}</p><Label htmlFor="recovery-email">{t("auth.email")}</Label><Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy}>{busy?t("common.loading"):t("accountTools.sendReset")}</Button></form>}<Link className="inline-block text-sm text-primary underline" to="/login">{t("accountTools.backToLogin")}</Link></CardContent></Card></main><ProjectFooter/></div>;
}
