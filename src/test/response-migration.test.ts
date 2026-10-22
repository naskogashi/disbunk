// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const analyst = "00000000-0000-4000-8000-000000000001";
const editor = "00000000-0000-4000-8000-000000000002";
const pending = "00000000-0000-4000-8000-000000000003";
const caseId = "00000000-0000-4000-8000-000000000010";
let db: PGlite;
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated;
    create role service_role bypassrls;
    create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql as $$ select case when current_user = 'authenticated' then 'authenticated' else 'service_role' end $$;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create type public.app_role as enum ('visitor','analyst','editor','team_lead','admin');
    create type public.profile_status as enum ('pending_approval','approved','rejected','suspended');
    create type public.notification_type as enum ('claim_assigned','evidence_added','status_changed','team_mention','registration','system');
    create table public.profiles(id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users, status public.profile_status not null default 'pending_approval', impact_score numeric not null default 0, full_name text, avatar_url text);
    create table public.user_roles(user_id uuid references auth.users, role public.app_role, unique(user_id,role));
    create table public.teams(id uuid primary key default gen_random_uuid(), name text,description text,created_by uuid references auth.users);
    create table public.team_members(id uuid primary key default gen_random_uuid(),team_id uuid references teams,user_id uuid references auth.users,role text,joined_at timestamptz default now(),unique(team_id,user_id));
    alter table public.team_members enable row level security;
    create policy "Read team members" on team_members for select to authenticated using(true);
    create function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from user_roles where user_id=_user_id and role=_role) $$;
    create function public.has_any_role(_user_id uuid, _roles public.app_role[]) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from user_roles where user_id=_user_id and role=any(_roles)) $$;
    create function public.is_approved(_user_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where user_id=_user_id and status='approved') $$;
    create table public.claims(id uuid primary key default gen_random_uuid(), title text, description text, source_url text, language text, status text default 'pending', created_by uuid references auth.users, assigned_to uuid references auth.users, sbunker_source_url text);
    create table public.evidence(id uuid primary key default gen_random_uuid(), claim_id uuid references claims, title text);
    create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users, type public.notification_type, payload jsonb default '{}', read boolean default false, created_at timestamptz default now());
    alter table public.notifications enable row level security;
    create policy "Read own notifications" on notifications for select to authenticated using (user_id=auth.uid());
    create policy "Update own notifications" on notifications for update to authenticated using (user_id=auth.uid());
    create policy "System can insert notifications" on notifications for insert to authenticated with check(true);
    create table public.audit_logs(id uuid primary key default gen_random_uuid(), admin_id uuid not null references auth.users, action text, target_type text, target_id uuid, metadata jsonb);
    create table public.sbunker_feed(id uuid primary key default gen_random_uuid(), title text, excerpt text, url text unique, language text, imported_claim_id uuid references claims);
    create table storage.buckets(id text primary key, public boolean);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(path text) returns text[] language sql as $$ select string_to_array(path,'/') $$;
    insert into storage.buckets values('evidence',true);
    insert into auth.users(id) values('${analyst}'),('${editor}'),('${pending}');
    insert into public.profiles(user_id,status) values('${analyst}','approved'),('${editor}','approved'),('${pending}','pending_approval');
    insert into public.user_roles values('${analyst}','analyst'),('${editor}','editor'),('${pending}','analyst');
    insert into public.claims(id,title,created_by) values('${caseId}','Test claim','${analyst}');
    grant usage on schema public,auth,storage to authenticated;
  `);
  await db.exec(readFileSync("supabase/migrations/202610220001_protect_profile_fields.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/202610220002_response_tools.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/202610220003_registration_and_teams.sql", "utf8"));
  await db.exec("grant select, insert, update, delete on all tables in schema public,storage to authenticated");
}, 30000);
afterAll(async () => { await db?.close(); });

describe("Response tools database policies", () => {
  it("blocks self approval of a pending profile", async () => {
    await asUser(pending);
    await expect(db.query("update profiles set status='approved' where user_id=$1", [pending])).rejects.toThrow(/Only admins/);
  });
  it("requires an editor for template approval and invalidates approval after edits", async () => {
    await asUser(analyst);
    const inserted = await db.query<{ id: string }>("insert into response_templates(title,language,channel,body) values('Test','en','email','Test response') returning id");
    const id = inserted.rows[0].id;
    await expect(db.query("update response_templates set status='approved' where id=$1",[id])).rejects.toThrow(/editor must approve/);
    await asUser(editor);
    await db.query("update response_templates set status='approved' where id=$1",[id]);
    const approved = await db.query<{ approved_by: string }>("select approved_by from response_templates where id=$1",[id]);
    expect(approved.rows[0].approved_by).toBe(editor);
    await db.query("update response_templates set body='Changed content' where id=$1",[id]);
    const edited = await db.query<{ status: string; approved_by: string | null }>("select status, approved_by from response_templates where id=$1",[id]);
    expect(edited.rows[0]).toEqual({ status: "draft", approved_by: null });
  });
  it("enforces task assignment and prevents an assignee from rewriting the checklist", async () => {
    await asUser(editor);
    const result = await db.query<{ id: string }>("insert into claim_tasks(claim_id,title,assigned_to) values($1,'Check the source',$2) returning id",[caseId,analyst]);
    const id = result.rows[0].id;
    await asUser(analyst);
    await db.query("update claim_tasks set completed=true where id=$1",[id]);
    const row = await db.query<{ completed_by: string }>("select completed_by from claim_tasks where id=$1",[id]);
    expect(row.rows[0].completed_by).toBe(analyst);
    await expect(db.query("update claim_tasks set title='Skip verification' where id=$1",[id])).rejects.toThrow(/Only editors/);
  });
  it("respects alert preferences and prevents forged notifications", async () => {
    await asUser(analyst);
    await db.query("insert into notification_preferences(user_id,evidence_added) values($1,false)",[analyst]);
    await expect(db.query("insert into notifications(user_id,type) values($1,'system')",[editor])).rejects.toThrow(/row-level security/);
    await asUser(editor);
    await db.query("insert into evidence(claim_id,title) values($1,'Source document')",[caseId]);
    await asUser(analyst);
    expect((await db.query("select * from notifications where type='evidence_added'")).rows).toHaveLength(0);
    await asUser(editor);
    await db.query("update claims set status='investigating' where id=$1",[caseId]);
    await asUser(analyst);
    const alerts = await db.query<{ id: string }>("select id from notifications where type='status_changed'");
    expect(alerts.rows).toHaveLength(1);
    await expect(db.query("update notifications set payload='{}' where id=$1",[alerts.rows[0].id])).rejects.toThrow(/read state/);
    await db.query("update notifications set read=true where id=$1",[alerts.rows[0].id]);
  });
  it("imports an article only once and disallows pending accounts", async () => {
    await db.exec("reset role");
    const article = await db.query<{ id: string }>("insert into sbunker_feed(title,url,language) values('Feed article','https://sbunker.org/test','sq') returning id");
    await asUser(pending);
    await expect(db.query("select import_sbunker_article($1)",[article.rows[0].id])).rejects.toThrow(/approved analyst/);
    await asUser(analyst);
    const first = await db.query<{ claim: string }>("select import_sbunker_article($1) as claim",[article.rows[0].id]);
    const second = await db.query<{ claim: string }>("select import_sbunker_article($1) as claim",[article.rows[0].id]);
    expect(second.rows[0].claim).toBe(first.rows[0].claim);
  });
  it("makes evidence private and restricts uploads to the uploader folder", async () => {
    await db.exec("reset role");
    expect((await db.query<{ public: boolean }>("select public from storage.buckets where id='evidence'")).rows[0].public).toBe(false);
    await asUser(analyst);
    await expect(db.query("insert into storage.objects(bucket_id,name) values('evidence','someone-else/file.png')")).rejects.toThrow(/row-level security/);
    await db.query("insert into storage.objects(bucket_id,name) values('evidence',$1)",[`${analyst}/case/file.png`]);
  });
  it("creates a team and its first lead atomically and preserves its last lead", async () => {
    await asUser(analyst);
    const team = await db.query<{ id: string }>("select create_team_with_lead('Research team') as id");
    const id = team.rows[0].id;
    const members = await db.query<{ user_id: string; role: string }>("select user_id,role from team_members where team_id=$1",[id]);
    expect(members.rows).toEqual([{ user_id: analyst, role: "lead" }]);
    await expect(db.query("delete from team_members where team_id=$1",[id])).rejects.toThrow(/another team lead/);
    await asUser(editor);
    await expect(db.query("insert into team_members(team_id,user_id,role) values($1,$2,'lead')",[id,editor])).rejects.toThrow(/row-level security/);
  });
  it("denies browser access to privileged account lookup and configuration", async () => {
    await asUser(analyst);
    await expect(db.query("select find_managed_user('someone@example.org')")).rejects.toThrow(/permission denied/);
    await expect(db.query("select configure_managed_user($1,'Admin','admin',true)",[analyst])).rejects.toThrow(/permission denied/);
  });
});
