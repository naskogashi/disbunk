import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewPasswordForm({onSaved}:{onSaved:()=>void|Promise<void>}) {
  const {t}=useTranslation();const {toast}=useToast();const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [busy,setBusy]=useState(false);
  return <form className="space-y-4" onSubmit={async event=>{event.preventDefault();if(password!==confirm||password.length<12)return;setBusy(true);try{const result=await supabase.auth.updateUser({password});if(result.error)throw result.error;setPassword("");setConfirm("");await onSaved();}catch(error){toast({title:t("auth.error"),description:error instanceof Error?error.message:String(error),variant:"destructive"});}finally{setBusy(false);}}}>
    <p className="text-sm text-muted-foreground">{t("accountTools.passwordLength")}</p>
    <div className="space-y-2"><Label htmlFor="new-password">{t("accountTools.newPassword")}</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} required onChange={event=>setPassword(event.target.value)}/></div>
    <div className="space-y-2"><Label htmlFor="confirm-password">{t("accountTools.confirmPassword")}</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} required onChange={event=>setConfirm(event.target.value)}/></div>
    {confirm&&password!==confirm&&<p className="text-sm text-destructive">{t("accountTools.passwordMismatch")}</p>}
    <Button type="submit" disabled={busy||password.length<12||password!==confirm}>{busy?t("common.loading"):t("accountTools.savePassword")}</Button>
  </form>;
}
export function PasswordSettings() {
  const {t}=useTranslation();const {toast}=useToast();
  return <Card><CardHeader><CardTitle>{t("accountTools.passwordSecurity")}</CardTitle></CardHeader><CardContent><NewPasswordForm onSaved={()=>{toast({title:t("accountTools.passwordSaved")});}}/></CardContent></Card>;
}
