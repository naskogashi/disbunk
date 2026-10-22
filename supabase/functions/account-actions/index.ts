const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version", "Access-Control-Allow-Methods":"POST, OPTIONS" };
const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const validId = (value:unknown): value is string => typeof value==="string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
Deno.serve(async (req:Request) => {
  if(req.method==="OPTIONS") return new Response(null,{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  try {
    const base=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization=req.headers.get("Authorization");
    if(!authorization?.startsWith("Bearer ")) return json({error:"Unauthorized"},401);
    if(!base || !anon || !service) return json({error:"Account service unavailable"},503);
    const auth=await fetch(`${base}/auth/v1/user`,{headers:{apikey:anon,Authorization:authorization},signal:AbortSignal.timeout(15000)});
    if(!auth.ok) return json({error:"Unauthorized"},401);
    const actor=await auth.json(); if(!validId(actor.id)) return json({error:"Unauthorized"},401);
    const headers={apikey:service,Authorization:`Bearer ${service}`,"Content-Type":"application/json"};
    const call=(path:string,options:RequestInit={}) => fetch(`${base}${path}`,{...options,headers,signal:AbortSignal.timeout(15000)});
    const [profile,roles]=await Promise.all([call(`/rest/v1/profiles?user_id=eq.${actor.id}&select=status,deleted_at`),call(`/rest/v1/user_roles?user_id=eq.${actor.id}&role=eq.admin&select=role`)]);
    if(!profile.ok || !roles.ok) return json({error:"Unable to verify access"},503);
    const profiles=await profile.json(); if(profiles[0]?.status!=="approved" || profiles[0]?.deleted_at || !(await roles.json()).length) return json({error:"Approved admin access required"},403);
    const raw=await req.text(); if(raw.length>12000) return json({error:"Request too large"},413);
    let body; try { body=JSON.parse(raw); } catch { return json({error:"Invalid request"},400); }
    if(!body || typeof body!=="object" || Array.isArray(body)) return json({error:"Invalid request"},400);
    const action=body.action;
    if(!["approve","reject","suspend","restore","delete","password"].includes(action)) return json({error:"Invalid action"},400);
    if(!Array.isArray(body.userIds) || !body.userIds.length || body.userIds.length>50 || !body.userIds.every(validId)) return json({error:"Select between 1 and 50 valid accounts"},400);
    const ids=[...new Set<string>(body.userIds)];
    if(action==="password" && (ids.length!==1 || typeof body.password!=="string" || body.password.length<12 || body.password.length>128)) return json({error:"Use a password of 12 to 128 characters for one account"},400);
    const results: {userId:string;success:boolean;warning?:string;error?:string}[]=[];
    const perform=async (userId:string) => {
      if(userId===actor.id) return {userId,success:false,error:"Your own account cannot be managed from this action"};
      const prepared=await call("/rest/v1/rpc/prepare_account_action",{method:"POST",body:JSON.stringify({actor_id:actor.id,target_id:userId,operation:action,pending_only:body.scope==="pending"})});
      if(!prepared.ok) {const error=await prepared.json().catch(()=>null); return {userId,success:false,error:error?.message || "Account action was refused"};}
      const authResult=await call(`/auth/v1/admin/users/${userId}`,{method:action==="delete"?"DELETE":"PUT",body:JSON.stringify(action==="password"?{password:body.password,email_confirm:true}:action==="delete"?{should_soft_delete:true}:{ban_duration:action==="suspend" || action==="reject"?"876000h":"none"})});
      if(!authResult.ok) return {userId,success:false,error:action==="password"?"Password update failed. Check the password policy and try again.":"The profile decision was saved, but authentication could not be updated. Review this account before retrying."};
      let warning:string|undefined;
      if(action==="delete") {
        const pictureProfile=await call(`/rest/v1/profiles?user_id=eq.${userId}&select=avatar_path`);
        const pictures=pictureProfile.ok?await pictureProfile.json():[];
        const picturePath=pictures[0]?.avatar_path;
        if(typeof picturePath==="string" && picturePath.startsWith(`users/${userId}/`) && !picturePath.includes("..")) {
          const removed=await call("/storage/v1/object/pictures",{method:"DELETE",body:JSON.stringify({prefixes:[picturePath]})});
          if(!removed.ok)warning="Account deleted, but its old private picture could not be removed.";
        }
        const finished=await call("/rest/v1/rpc/finish_account_delete",{method:"POST",body:JSON.stringify({actor_id:actor.id,target_id:userId})});
        if(!finished.ok) return {userId,success:false,error:"Authentication was deleted, but profile cleanup failed. Review the account before retrying."};
      }
      if(action==="approve" || action==="reject") {
        try {
          const notification=await fetch(`${base}/functions/v1/notify-registration`,{method:"POST",headers:{apikey:anon,Authorization:authorization,"Content-Type":"application/json"},body:JSON.stringify({userId,approved:action==="approve"}),signal:AbortSignal.timeout(20000)});
          const result=await notification.json(); if(!notification.ok || !result.emailAccepted) warning="Account updated, but its notification email was not accepted.";
        } catch { warning="Account updated, but its notification email could not be confirmed."; }
      }
      const audit=await call("/rest/v1/audit_logs",{method:"POST",body:JSON.stringify({admin_id:actor.id,action:`account_${action}_completed`,target_type:"user",target_id:userId,metadata:{}})});
      if(!audit.ok) warning="Action completed, but audit logging failed.";
      return {userId,success:true,warning};
    };
    for(let offset=0;offset<ids.length;offset+=5) results.push(...await Promise.all(ids.slice(offset,offset+5).map(async id => {try{return await perform(id);}catch{return {userId:id,success:false,error:"Account action failed. Review its current state before retrying."};}})));
    return json({results,successCount:results.filter(result=>result.success).length,failedCount:results.filter(result=>!result.success).length});
  } catch { return json({error:"Account service failed. No password details have been logged."},500); }
});
