// @vitest-environment node
import {PGlite} from "@electric-sql/pglite";
import {readFileSync,readdirSync} from "node:fs";
import {beforeAll,afterAll,expect,it} from "vitest";
let db:PGlite;
const analyst="00000000-0000-4000-8000-000000000001",admin="00000000-0000-4000-8000-000000000002",pending="00000000-0000-4000-8000-000000000003";
async function asUser(id:string){await db.exec("reset role");await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[id]);await db.exec("set role authenticated");}
async function asService(){await db.exec("reset role");await db.exec("select set_config('request.jwt.claim.role','service_role',false)");}
beforeAll(async()=>{
 db=new PGlite();await db.exec(readFileSync("src/test/fixtures/restored-legacy-schema.sql","utf8"));
 await db.exec("create or replace function auth.role() returns text language sql as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),case when current_user='authenticated' then 'authenticated' else 'service_role' end) $$");
 await db.exec("alter default privileges in schema public grant execute on functions to anon, authenticated");
 for(const file of readdirSync("supabase/migrations").filter(file=>file.endsWith(".sql")).sort())await db.exec(readFileSync(`supabase/migrations/${file}`,"utf8"));
 await db.exec(`update user_roles set role='admin' where user_id='${admin}'; alter table public.claims enable row level security; create policy "Legacy claims read" on public.claims for select to authenticated using(true); grant select,insert,update,delete on all tables in schema public,storage to authenticated;`);
},30000);
afterAll(async()=>{await db?.close();});
it("keeps account lifecycle RPCs inaccessible to browser callers",async()=>{
 await asUser(admin);await expect(db.query("select prepare_account_action($1,$2,'suspend')",[admin,analyst])).rejects.toThrow(/permission denied/);
});
it("blocks self-management and pending-only actions after an account decision changed",async()=>{
 await asService();await expect(db.query("select prepare_account_action($1,$1,'delete')",[admin])).rejects.toThrow(/own profile/);
 await expect(db.query("select prepare_account_action($1,$2,'approve',true)",[admin,analyst])).rejects.toThrow(/no longer pending/);
 await expect(db.query("select prepare_account_action($1,$2,'suspend')",[analyst,pending])).rejects.toThrow(/admin access/);
});
it("prevents suspending the last admin through direct profile updates",async()=>{
 await asUser(admin);await expect(db.query("update profiles set status='suspended' where user_id=$1",[admin])).rejects.toThrow(/last approved admin/);
});
it("immediately gates data API access when an account is suspended",async()=>{
 await asService();await db.query("select prepare_account_action($1,$2,'suspend')",[admin,analyst]);
 await asUser(analyst);expect((await db.query("select * from claims")).rows).toHaveLength(0);
 await asService();await db.query("select prepare_account_action($1,$2,'restore')",[admin,analyst]);
 await asUser(analyst);expect((await db.query("select * from claims")).rows).toHaveLength(1);
});
it("enforces private picture storage, own-folder uploads and matching profile paths",async()=>{
 await asService();expect((await db.query<{public:boolean}>("select public from storage.buckets where id='pictures'")).rows[0].public).toBe(false);
 await asUser(analyst);await expect(db.query("insert into storage.objects(bucket_id,name) values('pictures',$1)",[`users/${admin}/other.webp`])).rejects.toThrow(/row-level security/);
 const path=`users/${analyst}/picture.webp`;await db.query("insert into storage.objects(bucket_id,name) values('pictures',$1)",[path]);await db.query("update profiles set avatar_path=$1 where user_id=$2",[path,analyst]);
 await expect(db.query("update profiles set avatar_path=$1 where user_id=$2",[`users/${admin}/other.webp`,analyst])).rejects.toThrow(/owned by this profile/);
 await asUser(pending);await expect(db.query("insert into storage.objects(bucket_id,name) values('pictures',$1)",[`users/${pending}/picture.webp`])).rejects.toThrow(/row-level security/);
});
it("lets team leads set their picture and requires a replacement lead before deletion",async()=>{
 await asUser(analyst);const team=(await db.query<{id:string}>("select create_team_with_lead('Picture team') as id")).rows[0].id;
 const path=`teams/${team}/picture.webp`;await db.query("insert into storage.objects(bucket_id,name) values('pictures',$1)",[path]);await db.query("select set_team_picture($1,$2)",[team,path]);
 await asService();await expect(db.query("select prepare_account_action($1,$2,'delete')",[admin,analyst])).rejects.toThrow(/another approved team lead/);
 await asUser(pending);await expect(db.query("select set_team_picture($1,null)",[team])).rejects.toThrow(/Team lead access/);
});
it("requires authentication deletion before anonymizing a profile",async()=>{
 await asService();await expect(db.query("select finish_account_delete($1,$2)",[admin,pending])).rejects.toThrow(/Authentication deletion/);
 await db.query("update auth.users set deleted_at=now() where id=$1",[pending]);await db.query("select finish_account_delete($1,$2)",[admin,pending]);
 expect((await db.query<{full_name:string;deleted_at:unknown}>("select full_name,deleted_at from profiles where user_id=$1",[pending])).rows[0]).toMatchObject({full_name:"Deleted user"});
 expect((await db.query("select * from user_roles where user_id=$1",[pending])).rows).toHaveLength(0);
});
