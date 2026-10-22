// @vitest-environment node
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";
import {expect,it,vi} from "vitest";
const code=ts.transpileModule(readFileSync("supabase/functions/account-actions/index.ts","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const actor="00000000-0000-4000-8000-000000000001",target="00000000-0000-4000-8000-000000000002",other="00000000-0000-4000-8000-000000000003";
function harness(admin=true,refuse?:string){
 let handler:(req:Request)=>Promise<Response>;
 const fetchMock=vi.fn(async(url:string,options:RequestInit={})=>{
  if(url.endsWith("/auth/v1/user"))return Response.json({id:actor});
  if(url.includes("select=avatar_path"))return Response.json([{avatar_path:`users/${target}/p.webp`}]);
  if(url.includes("/profiles?"))return Response.json([{status:"approved",deleted_at:null}]);
  if(url.includes("/user_roles?"))return Response.json(admin?[{role:"admin"}]:[]);
  if(url.includes("prepare_account_action")&&JSON.parse(options.body as string).target_id===refuse)return Response.json({message:"Assign another approved team lead"},{status:400});
  if(url.includes("notify-registration"))return Response.json({emailAccepted:true});
  return new Response(null,{status:204});
 });
 runInNewContext(code,{Deno:{env:{get:(key:string)=>key==="SUPABASE_URL"?"https://test.supabase.co":"test-key"},serve:(callback:typeof handler)=>{handler=callback;}},Response,Request,AbortSignal,fetch:fetchMock});
 return {fetchMock,invoke:(body:unknown,authorized=true)=>handler!(new Request("https://test/account-actions",{method:"POST",headers:authorized?{Authorization:"Bearer token"}:{},body:JSON.stringify(body)}))};
}
it("rejects unauthenticated and non-admin callers before changing accounts",async()=>{
 const app=harness();expect((await app.invoke({action:"delete",userIds:[target]},false)).status).toBe(401);expect(app.fetchMock).not.toHaveBeenCalled();
 const analyst=harness(false);expect((await analyst.invoke({action:"password",userIds:[target],password:"test-password-123"})).status).toBe(403);
 expect(analyst.fetchMock.mock.calls.some(([url])=>url.includes("prepare_account_action"))).toBe(false);
});
it("refuses self-management and invalid bulk requests",async()=>{
 const app=harness();expect((await app.invoke({action:"delete",userIds:[actor]})).status).toBe(200);
 expect(app.fetchMock.mock.calls.some(([url])=>url.includes("/admin/users/"))).toBe(false);
 expect((await app.invoke({action:"delete",userIds:Array(51).fill(target)})).status).toBe(400);
 expect((await app.invoke({action:"password",userIds:[target,other],password:"test-password-123"})).status).toBe(400);
});
it("reports partial failure without deleting an account refused by the database guard",async()=>{
 const app=harness(true,other);const result=await (await app.invoke({action:"delete",userIds:[target,other]})).json();
 expect(result.successCount).toBe(1);expect(result.failedCount).toBe(1);
 const deletions=app.fetchMock.mock.calls.filter(([url,options])=>options.method==="DELETE"&&url.includes("/auth/v1/admin/users/"));
 expect(deletions).toHaveLength(1);expect(JSON.parse(deletions[0][1].body as string)).toEqual({should_soft_delete:true});
 expect(app.fetchMock.mock.calls.some(([url])=>url.includes("finish_account_delete"))).toBe(true);
});
it("sends passwords only to the auth API and never to audit metadata",async()=>{
 const app=harness();const secret="temporary-test-password";expect((await app.invoke({action:"password",userIds:[target],password:secret})).status).toBe(200);
 const withSecret=app.fetchMock.mock.calls.filter(([,options])=>String(options?.body).includes(secret));
 expect(withSecret).toHaveLength(1);expect(withSecret[0][0]).toBe(`https://test.supabase.co/auth/v1/admin/users/${target}`);
 const audit=app.fetchMock.mock.calls.find(([url])=>url.endsWith("/audit_logs"));expect(String(audit?.[1]?.body)).not.toContain(secret);
});
it("uses pending-only guards and sends registration notices after updating auth",async()=>{
 const app=harness();await app.invoke({action:"approve",userIds:[target],scope:"pending"});
 const guard=app.fetchMock.mock.calls.find(([url])=>url.includes("prepare_account_action"));expect(JSON.parse(guard![1].body as string)).toMatchObject({pending_only:true});
 expect(app.fetchMock.mock.calls.some(([url])=>url.includes("notify-registration"))).toBe(true);
});
