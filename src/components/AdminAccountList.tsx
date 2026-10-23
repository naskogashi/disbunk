import { displayDate } from "@/lib/locale";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/lib/invoke-function";
import type { AppRole } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrivateAvatar } from "@/components/ProfilePictures";

export interface ManagedAccount { id:string; user_id:string; full_name:string|null; status:string; roles:AppRole[]; created_at:string; avatar_path?:string|null; avatar_url?:string|null }
type Action="approve"|"reject"|"suspend"|"restore"|"delete";
interface ActionResult { results:{userId:string;success:boolean;error?:string;warning?:string}[]; successCount:number; failedCount:number }
export function AdminAccountList({users,scope,onChanged}:{users:ManagedAccount[];scope:"all"|"pending";onChanged:()=>void}) {
  const {t}=useTranslation(); const {user}=useAuth(); const {toast}=useToast();
  const [search,setSearch]=useState(""); const [page,setPage]=useState(0); const [selected,setSelected]=useState<Set<string>>(new Set());
  const [operation,setOperation]=useState<{action:Action;ids:string[]}|null>(null); const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false); const [processed,setProcessed]=useState(0); const [errors,setErrors]=useState<string[]>([]);
  const [passwordTarget,setPasswordTarget]=useState<ManagedAccount|null>(null); const [password,setPassword]=useState(""); const [confirmPassword,setConfirmPassword]=useState("");
  const filtered=useMemo(()=>users.filter(row=>(row.full_name||"").toLowerCase().includes(search.toLowerCase())||row.user_id.includes(search.trim().toLowerCase())),[users,search]);
  useEffect(()=>{setPage(previous=>Math.min(previous,Math.max(0,Math.ceil(filtered.length/25)-1)));},[filtered.length]);
  useEffect(()=>{const existing=new Set(users.map(row=>row.user_id));setSelected(previous=>{const next=new Set([...previous].filter(id=>existing.has(id)));return next.size===previous.size?previous:next;});},[users]);
  const visible=filtered.slice(page*25,page*25+25); const selectable=visible.filter(row=>row.user_id!==user?.id);
  const count=selected.size; const allChecked=selectable.length>0 && selectable.every(row=>selected.has(row.user_id));
  const toggle=(id:string,checked:boolean)=>setSelected(previous=>{const next=new Set(previous); if(checked && next.size<50) next.add(id); else if(!checked) next.delete(id); return next;});
  const ask=(action:Action,ids=[...selected])=>{setOperation({action,ids});setConfirmation("");};
  const act=async()=>{
    if(!operation)return;setBusy(true);setErrors([]);setProcessed(0);
    try {
      const result:ActionResult={results:[],successCount:0,failedCount:0};
      for(let offset=0;offset<operation.ids.length;offset+=5){
        const ids=operation.ids.slice(offset,offset+5);
        try {const batch=await invokeFunction<ActionResult>("account-actions",{action:operation.action,userIds:ids,scope});result.results.push(...batch.results);result.successCount+=batch.successCount;result.failedCount+=batch.failedCount;}
        catch {result.results.push(...ids.map(userId=>({userId,success:false,error:t("accountTools.unconfirmedAction")})));result.failedCount+=ids.length;}
        setProcessed(Math.min(operation.ids.length,offset+ids.length));
      }
      const failed=result.results.filter(row=>!row.success);
      setSelected(new Set(failed.map(row=>row.userId)));
      setErrors(result.results.filter(row=>row.error||row.warning).map(row=>`${users.find(account=>account.user_id===row.userId)?.full_name||row.userId.slice(0,8)}: ${row.error||row.warning}`));
      toast({title:t("accountTools.actionSummary",{success:result.successCount,failed:result.failedCount}),variant:result.failedCount?"destructive":"default"});
      setOperation(null);onChanged();
    } catch(error){toast({title:t("admin.error"),description:error instanceof Error?error.message:String(error),variant:"destructive"});}
    finally{setBusy(false);}
  };
  const setAccountPassword=async(event:React.FormEvent)=>{
    event.preventDefault();if(!passwordTarget||password!==confirmPassword)return;setBusy(true);
    try {
      const result=await invokeFunction<ActionResult>("account-actions",{action:"password",userIds:[passwordTarget.user_id],password});
      if(!result.results[0]?.success)throw new Error(result.results[0]?.error||t("accountTools.passwordFailed"));
      setPassword("");setConfirmPassword("");setPasswordTarget(null);toast({title:t("accountTools.passwordSaved")});onChanged();
    }catch(error){toast({title:t("admin.error"),description:error instanceof Error?error.message:String(error),variant:"destructive"});}
    finally{setBusy(false);}
  };
  return <div className="space-y-4">
    <Input aria-label={t("admin.searchUsers")} placeholder={t("admin.searchUsers")} value={search} onChange={event=>{setSearch(event.target.value);setPage(0);setSelected(new Set());}} className="max-w-sm"/>
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3"><span className="mr-2 text-sm font-semibold" role="status">{t("accountTools.selected",{count})}</span>
      {scope==="pending" && <><Button size="sm" disabled={!count||busy} onClick={()=>ask("approve")}>{t("accountTools.approveSelected")}</Button><Button size="sm" variant="outline" disabled={!count||busy} onClick={()=>ask("reject")}>{t("accountTools.rejectSelected")}</Button></>}
      <Button size="sm" variant="outline" disabled={!count||busy} onClick={()=>ask("suspend")}>{t("accountTools.suspendSelected")}</Button>
      {scope==="all"&&<Button size="sm" variant="outline" disabled={!count||busy} onClick={()=>ask("restore")}>{t("accountTools.restoreSelected")}</Button>}
      <Button size="sm" variant="destructive" disabled={!count||busy} onClick={()=>ask("delete")}>{t("accountTools.deleteSelected")}</Button>
      {count>0&&<Button size="sm" variant="ghost" disabled={busy} onClick={()=>setSelected(new Set())}>{t("accountTools.clearSelection")}</Button>}
    </div>
    <p className="text-xs text-muted-foreground">{t("accountTools.selectionNote")}</p>
    {errors.length>0&&<div role="alert" className="space-y-1 rounded-xl border border-destructive/40 p-4 text-sm">{errors.map((error,index)=><p key={index}>{error}</p>)}</div>}
    <Card className="overflow-hidden"><Table><TableHeader><TableRow>
      <TableHead className="w-10"><Checkbox aria-label={t("accountTools.selectVisible")} checked={allChecked?true:selectable.some(row=>selected.has(row.user_id))?"indeterminate":false} onCheckedChange={checked=>setSelected(previous=>{const next=new Set(previous);selectable.forEach(row=>{if(checked && next.size<50)next.add(row.user_id);else if(!checked)next.delete(row.user_id);});return next;})}/></TableHead>
      <TableHead>{t("admin.user")}</TableHead><TableHead>{t("admin.status")}</TableHead><TableHead>{t("admin.role")}</TableHead><TableHead>{t("admin.joined")}</TableHead><TableHead>{t("admin.actions")}</TableHead>
    </TableRow></TableHeader><TableBody>{visible.map(row=><TableRow key={row.user_id} data-state={selected.has(row.user_id)?"selected":undefined}>
      <TableCell><Checkbox aria-label={t("accountTools.selectAccount",{name:row.full_name||row.user_id})} checked={selected.has(row.user_id)} disabled={busy||row.user_id===user?.id||(!selected.has(row.user_id)&&count>=50)} onCheckedChange={checked=>toggle(row.user_id,!!checked)}/></TableCell>
      <TableCell><div className="flex items-center gap-3"><PrivateAvatar path={row.avatar_path} fallbackUrl={row.avatar_url} name={row.full_name||"User"} className="h-8 w-8"/><div><p className="font-medium">{row.full_name||t("admin.unnamed")}</p><p className="font-mono text-[10px] text-muted-foreground">{row.user_id.slice(0,12)}</p></div></div></TableCell>
      <TableCell><Badge variant={row.status==="approved"?"default":"secondary"}>{t(`accountStatus.${row.status}`)}</Badge></TableCell>
      <TableCell><select aria-label={t("admin.role")+" "+(row.full_name||row.user_id)} value={row.roles[0]||"analyst"} disabled={busy||row.user_id===user?.id} className="h-9 rounded-lg border bg-card px-2 text-xs" onChange={async event=>{const newRole=event.target.value;setBusy(true);const result=await supabase.rpc("set_user_role",{target_user_id:row.user_id,new_role:newRole});setBusy(false);if(result.error)toast({title:t("admin.error"),description:result.error.message,variant:"destructive"});else {await supabase.from("audit_logs").insert({admin_id:user?.id,action:"role_changed",target_type:"user",target_id:row.user_id,metadata:{new_role:newRole}});onChanged();}}}>{["visitor","analyst","editor","team_lead","admin"].map(role=><option key={role} value={role}>{t(`roles.${role}`)}</option>)}</select></TableCell>
      <TableCell className="whitespace-nowrap text-xs">{displayDate(row.created_at)}</TableCell>
      <TableCell><div className="flex flex-wrap gap-1">
        {row.user_id!==user?.id&&<>{row.status==="pending_approval"&&<><Button size="sm" variant="outline" disabled={busy} onClick={()=>ask("approve",[row.user_id])}>{t("admin.approve")}</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>ask("reject",[row.user_id])}>{t("admin.reject")}</Button></>}
        <Button size="sm" variant="ghost" disabled={busy} onClick={()=>ask(row.status==="suspended"?"restore":"suspend",[row.user_id])}>{t(row.status==="suspended"?"admin.unsuspend":"admin.suspend")}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={()=>{setPassword("");setConfirmPassword("");setPasswordTarget(row);}}>{t("accountTools.setPassword")}</Button>
        <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={()=>ask("delete",[row.user_id])}>{t("common.delete")}</Button></>}
      </div></TableCell>
    </TableRow>)}</TableBody></Table>{!filtered.length&&<p className="p-6 text-center text-muted-foreground">{t(scope==="pending"?"admin.noPending":"accountTools.noUsers")}</p>}</Card>
    <div className="flex items-center justify-between gap-3"><Button variant="outline" size="sm" disabled={!page} onClick={()=>setPage(page-1)}>{t("accountTools.previous")}</Button><p className="text-xs text-muted-foreground">{t("accountTools.page",{page:page+1,total:Math.max(1,Math.ceil(filtered.length/25))})}</p><Button variant="outline" size="sm" disabled={(page+1)*25>=filtered.length} onClick={()=>setPage(page+1)}>{t("accountTools.next")}</Button></div>
    <Dialog open={!!operation} onOpenChange={open=>{if(!open&&!busy)setOperation(null);}}><DialogContent><DialogHeader><DialogTitle>{operation&&t(`accountTools.action_${operation.action}`)}</DialogTitle><DialogDescription>{t(operation?.action==="delete"?"accountTools.deleteNote":"accountTools.confirmAction",{count:operation?.ids.length||0})}</DialogDescription></DialogHeader>
      <ul className="max-h-40 overflow-y-auto text-sm">{operation?.ids.map(id=><li key={id}>{users.find(row=>row.user_id===id)?.full_name||id.slice(0,12)}</li>)}</ul>
      {operation?.action==="delete"&&<div className="space-y-2"><Label htmlFor="delete-confirm">{t("accountTools.typeDelete")}</Label><Input id="delete-confirm" value={confirmation} autoComplete="off" onChange={event=>setConfirmation(event.target.value)}/></div>}
      {busy&&<p role="status" className="text-sm">{t("accountTools.processing",{count:processed,total:operation?.ids.length||0})}</p>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setOperation(null)}>{t("common.cancel")}</Button><Button variant={operation?.action==="delete"?"destructive":"default"} disabled={busy||(operation?.action==="delete"&&confirmation!=="DELETE")} onClick={act}>{busy?t("common.loading"):t("accountTools.confirm")}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!passwordTarget} onOpenChange={open=>{if(!open&&!busy){setPasswordTarget(null);setPassword("");setConfirmPassword("");}}}><DialogContent><DialogHeader><DialogTitle>{t("accountTools.setPassword")}: {passwordTarget?.full_name}</DialogTitle><DialogDescription>{t("accountTools.adminPasswordNote")}</DialogDescription></DialogHeader><form onSubmit={setAccountPassword} className="space-y-4"><Label htmlFor="admin-new-password">{t("accountTools.newPassword")}</Label><Input id="admin-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)}/><Label htmlFor="admin-confirm-password">{t("accountTools.confirmPassword")}</Label><Input id="admin-confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/><Button type="submit" disabled={busy||password.length<12||password!==confirmPassword}>{busy?t("common.loading"):t("common.save")}</Button></form></DialogContent></Dialog>
  </div>;
}
