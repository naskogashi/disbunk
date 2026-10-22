import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { PublicHeader } from "@/components/PublicHeader";
import { ProjectFooter } from "@/components/ProjectFooter";
import { NewPasswordForm } from "@/components/PasswordSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function ResetPassword(){
  const {t}=useTranslation();const [params]=useSearchParams();const navigate=useNavigate();const started=useRef(false);
  const [state,setState]=useState<"checking"|"ready"|"expired"|"saved">("checking");const [email,setEmail]=useState("");
  useEffect(()=>{if(started.current)return;started.current=true;const token=params.get("token_hash");if(!token||params.get("type")!=="recovery"){setState("expired");return;}
    supabase.auth.verifyOtp({token_hash:token,type:"recovery"}).then(({data,error})=>{navigate("/reset-password",{replace:true});if(error||!data.session||!data.user){setState("expired");return;}setEmail(data.user.email||"");setState("ready");}).catch(()=>{navigate("/reset-password",{replace:true});setState("expired");});
  },[navigate,params]);
  return <div className="flex min-h-screen flex-col"><PublicHeader/><main id="content" className="page-wrap flex flex-1 items-center justify-center py-16"><Card className="w-full max-w-md"><CardHeader><h1 className="text-2xl font-bold">{t("accountTools.resetPassword")}</h1></CardHeader><CardContent className="space-y-5">{state==="checking"?<p role="status">{t("common.loading")}</p>:state==="expired"?<><p role="alert">{t("accountTools.resetExpired")}</p><Link className="text-primary underline" to="/forgot-password">{t("accountTools.sendReset")}</Link></>:state==="saved"?<><p role="status">{t("accountTools.passwordSaved")}</p><Link className="text-primary underline" to="/login">{t("accountTools.backToLogin")}</Link></>:<><p className="text-sm text-muted-foreground">{email}</p><NewPasswordForm onSaved={async()=>{await supabase.auth.signOut();setState("saved");}}/></>}</CardContent></Card></main><ProjectFooter/></div>;
}
