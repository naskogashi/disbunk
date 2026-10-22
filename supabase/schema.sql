-- ============================================================
-- Disbunk.org — Full Database Schema
-- Run this in Supabase SQL Editor (in order)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "vector" with schema extensions;
create extension if not exists "pg_cron" with schema extensions;

-- ============================================================
-- 2. ENUMS
-- ============================================================
create type public.app_role as enum ('visitor', 'analyst', 'editor', 'team_lead', 'admin');
create type public.claim_status as enum ('pending', 'investigating', 'verified', 'debunked', 'escalated');
create type public.evidence_type as enum ('screenshot', 'archive', 'document', 'social_post', 'other');
create type public.profile_status as enum ('pending_approval', 'approved', 'rejected', 'suspended');
create type public.notification_type as enum ('claim_assigned', 'evidence_added', 'status_changed', 'team_mention', 'registration', 'system');

-- ============================================================
-- 3. TABLES
-- ============================================================

-- Profiles (linked to auth.users)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text,
  avatar_url text,
  status public.profile_status not null default 'pending_approval',
  language_pref text not null default 'en' check (language_pref in ('en', 'sq')),
  impact_score numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User roles (separate table — never store roles on profiles)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

-- Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Team members
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member' check (role in ('member', 'lead')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- Claims
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  source_url text,
  language text not null default 'en' check (language in ('en', 'sq')),
  status public.claim_status not null default 'pending',
  team_id uuid references public.teams(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null not null,
  assigned_to uuid references auth.users(id) on delete set null,
  embedding extensions.vector(384),
  sbunker_source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evidence
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references public.claims(id) on delete cascade not null,
  title text not null,
  type public.evidence_type not null default 'other',
  file_url text,
  uploaded_by uuid references auth.users(id) on delete set null not null,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

-- Campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  team_id uuid references public.teams(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Campaign ↔ Claims junction
create table public.campaign_claims (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  claim_id uuid references public.claims(id) on delete cascade not null,
  unique (campaign_id, claim_id)
);

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references public.claims(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type public.notification_type not null,
  payload jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Audit logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null not null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Integration connections
create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  access_token text,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- Feature flags
create table public.feature_flags (
  key text primary key,
  value jsonb not null default 'true',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Sbunker feed
create table public.sbunker_feed (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  excerpt text,
  thumbnail_url text,
  author text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  language text default 'sq',
  imported_claim_id uuid references public.claims(id) on delete set null
);

-- ============================================================
-- 4. INDEXES
-- ============================================================
create index idx_claims_status on public.claims(status);
create index idx_claims_team on public.claims(team_id);
create index idx_claims_created_by on public.claims(created_by);
create index idx_claims_created_at on public.claims(created_at desc);
create index idx_evidence_claim on public.evidence(claim_id);
create index idx_comments_claim on public.comments(claim_id);
create index idx_notifications_user on public.notifications(user_id, read);
create index idx_audit_logs_created on public.audit_logs(created_at desc);
create index idx_sbunker_feed_published on public.sbunker_feed(published_at desc);
create index idx_user_roles_user on public.user_roles(user_id);
create index idx_team_members_user on public.team_members(user_id);
create index idx_campaign_claims_claim on public.campaign_claims(claim_id);

-- ============================================================
-- 5. SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- ============================================================

-- Check if user has a specific role
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Check if user has any of the specified roles
create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = any(_roles)
  )
$$;

-- Get user's profile status
create or replace function public.get_profile_status(_user_id uuid)
returns public.profile_status
language sql
stable
security definer
set search_path = public
as $$
  select status
  from public.profiles
  where user_id = _user_id
$$;

-- Check if user is approved
create or replace function public.is_approved(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = _user_id
      and status = 'approved'
  )
$$;

-- Check if user is member of a team
create or replace function public.is_team_member(_user_id uuid, _team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where user_id = _user_id
      and team_id = _team_id
  )
$$;

-- ============================================================
-- 6. ENABLE RLS ON ALL TABLES
-- ============================================================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.claims enable row level security;
alter table public.evidence enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_claims enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.integration_connections enable row level security;
alter table public.feature_flags enable row level security;
alter table public.sbunker_feed enable row level security;

-- ============================================================
-- 7. RLS POLICIES
-- ============================================================

-- ---- PROFILES ----
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (user_id = auth.uid());

create policy "Admins can view all profiles"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Editors can view approved profiles"
  on public.profiles for select to authenticated
  using (
    public.has_any_role(auth.uid(), array['editor', 'team_lead']::public.app_role[])
    and status = 'approved'
  );

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "System can insert profiles"
  on public.profiles for insert to authenticated
  with check (user_id = auth.uid());

-- ---- USER ROLES ----
create policy "Users can view own roles"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

create policy "Admins can manage all roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---- TEAMS ----
create policy "Approved users can view teams"
  on public.teams for select to authenticated
  using (public.is_approved(auth.uid()));

create policy "Analysts+ can create teams"
  on public.teams for insert to authenticated
  with check (
    public.is_approved(auth.uid())
    and public.has_any_role(auth.uid(), array['analyst', 'editor', 'team_lead', 'admin']::public.app_role[])
  );

create policy "Team leads and admins can update teams"
  on public.teams for update to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or created_by = auth.uid()
  );

-- ---- TEAM MEMBERS ----
create policy "Approved users can view team members"
  on public.team_members for select to authenticated
  using (public.is_approved(auth.uid()));

create policy "Team leads can manage members"
  on public.team_members for insert to authenticated
  with check (
    public.has_role(auth.uid(), 'admin')
    or public.is_team_member(auth.uid(), team_id)
  );

create policy "Team leads can remove members"
  on public.team_members for delete to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or user_id = auth.uid()
  );

-- ---- CLAIMS ----
create policy "Anyone can view claims"
  on public.claims for select to anon, authenticated
  using (true);

create policy "Analysts+ can create claims"
  on public.claims for insert to authenticated
  with check (
    public.is_approved(auth.uid())
    and public.has_any_role(auth.uid(), array['analyst', 'editor', 'team_lead', 'admin']::public.app_role[])
    and created_by = auth.uid()
  );

create policy "Editors+ can update claims"
  on public.claims for update to authenticated
  using (
    public.has_any_role(auth.uid(), array['editor', 'team_lead', 'admin']::public.app_role[])
    or created_by = auth.uid()
  );

-- ---- EVIDENCE ----
create policy "Anyone can view evidence"
  on public.evidence for select to anon, authenticated
  using (true);

create policy "Analysts+ can add evidence"
  on public.evidence for insert to authenticated
  with check (
    public.is_approved(auth.uid())
    and public.has_any_role(auth.uid(), array['analyst', 'editor', 'team_lead', 'admin']::public.app_role[])
    and uploaded_by = auth.uid()
  );

create policy "Editors+ can manage evidence"
  on public.evidence for update to authenticated
  using (
    public.has_any_role(auth.uid(), array['editor', 'team_lead', 'admin']::public.app_role[])
  );

create policy "Editors+ can delete evidence"
  on public.evidence for delete to authenticated
  using (
    public.has_any_role(auth.uid(), array['editor', 'team_lead', 'admin']::public.app_role[])
  );

-- ---- CAMPAIGNS ----
create policy "Approved users can view campaigns"
  on public.campaigns for select to authenticated
  using (public.is_approved(auth.uid()));

create policy "Editors+ can manage campaigns"
  on public.campaigns for all to authenticated
  using (
    public.has_any_role(auth.uid(), array['editor', 'team_lead', 'admin']::public.app_role[])
  );

-- ---- CAMPAIGN CLAIMS ----
create policy "Approved users can view campaign claims"
  on public.campaign_claims for select to authenticated
  using (public.is_approved(auth.uid()));

create policy "Editors+ can manage campaign claims"
  on public.campaign_claims for all to authenticated
  using (
    public.has_any_role(auth.uid(), array['editor', 'team_lead', 'admin']::public.app_role[])
  );

-- ---- COMMENTS ----
create policy "Anyone can view comments"
  on public.comments for select to anon, authenticated
  using (true);

create policy "Analysts+ can add comments"
  on public.comments for insert to authenticated
  with check (
    public.is_approved(auth.uid())
    and public.has_any_role(auth.uid(), array['analyst', 'editor', 'team_lead', 'admin']::public.app_role[])
    and user_id = auth.uid()
  );

-- ---- NOTIFICATIONS ----
create policy "Users can view own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid());

create policy "System can insert notifications"
  on public.notifications for insert to authenticated
  with check (true);

-- ---- AUDIT LOGS ----
create policy "Admins can view audit logs"
  on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert audit logs"
  on public.audit_logs for insert to authenticated
  with check (
    public.has_role(auth.uid(), 'admin')
    and admin_id = auth.uid()
  );

-- ---- INTEGRATION CONNECTIONS ----
create policy "Users can manage own integrations"
  on public.integration_connections for all to authenticated
  using (user_id = auth.uid());

-- ---- FEATURE FLAGS ----
create policy "Anyone can read feature flags"
  on public.feature_flags for select to anon, authenticated
  using (true);

create policy "Admins can manage feature flags"
  on public.feature_flags for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---- SBUNKER FEED ----
create policy "Anyone can view sbunker feed"
  on public.sbunker_feed for select to anon, authenticated
  using (true);

create policy "Editors+ can manage sbunker feed"
  on public.sbunker_feed for all to authenticated
  using (
    public.has_any_role(auth.uid(), array['editor', 'team_lead', 'admin']::public.app_role[])
  );

-- ============================================================
-- 8. TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );

  -- Assign default 'analyst' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'analyst');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at on profiles
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger claims_updated_at
  before update on public.claims
  for each row execute function public.update_updated_at();

-- ============================================================
-- 9. STORAGE BUCKET FOR EVIDENCE
-- ============================================================
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload
create policy "Authenticated users can upload evidence"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence');

create policy "Anyone can view evidence files"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'evidence');

create policy "Uploaders can delete own evidence"
  on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 10. SEED FEATURE FLAGS
-- ============================================================
insert into public.feature_flags (key, value) values
  ('moderation_provider', '"off"'),
  ('sbunker_crawler_enabled', 'true'),
  ('registration_approval_required', 'true')
on conflict (key) do nothing;

-- ============================================================
-- 11. REALTIME
-- ============================================================
alter publication supabase_realtime add table public.claims;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.comments;

-- Protect approval and score fields even when users can edit their own profile.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated'
     and not public.has_role(auth.uid(), 'admin') then
    if tg_op = 'INSERT' then
      if new.status <> 'pending_approval' or new.impact_score <> 0 then
        raise exception 'Only admins can set profile approval or impact score'
          using errcode = '42501';
      end if;
    elsif new.status is distinct from old.status
       or new.impact_score is distinct from old.impact_score
       or new.user_id is distinct from old.user_id
       or new.id is distinct from old.id then
      raise exception 'Only admins can change protected profile fields'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before insert or update on public.profiles
  for each row execute function public.protect_profile_fields();

create policy "Admins can update profiles"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

begin;

alter table public.claims add column if not exists severity smallint not null default 3 check (severity between 1 and 5);
alter table public.claims add column if not exists reach smallint not null default 3 check (reach between 1 and 5);
alter table public.evidence add column if not exists sha256 text check (sha256 ~ '^[a-f0-9]{64}$');
alter table public.evidence add column if not exists original_sha256 text check (original_sha256 ~ '^[a-f0-9]{64}$');
alter table public.evidence add column if not exists metadata_redacted boolean not null default false;
alter table public.evidence add column if not exists file_size bigint;

create table if not exists public.response_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  language text not null check (language in ('en', 'sq')),
  channel text not null check (channel in ('email', 'social', 'sms', 'press')),
  body text not null check (length(body) between 1 and 10000),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.response_templates enable row level security;
create policy "Approved users read response templates" on public.response_templates for select to authenticated
  using (public.is_approved(auth.uid()));
create policy "Analysts create draft templates" on public.response_templates for insert to authenticated
  with check (public.is_approved(auth.uid()) and created_by = auth.uid()
    and public.has_any_role(auth.uid(), array['analyst','editor','team_lead','admin']::public.app_role[]));
create policy "Authors and editors update response templates" on public.response_templates for update to authenticated
  using (public.is_approved(auth.uid()) and (created_by = auth.uid() or public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[])))
  with check (public.is_approved(auth.uid()) and (created_by = auth.uid() or public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[])));

create or replace function public.review_response_template()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.body is distinct from old.body or new.language is distinct from old.language
      or new.channel is distinct from old.channel or new.title is distinct from old.title) then
    new.status := 'draft';
  end if;
  if new.status = 'approved' then
    if not public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[]) then
      raise exception 'An editor must approve response templates' using errcode = '42501';
    end if;
    new.approved_by := auth.uid();
  else
    new.approved_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger review_response_template before insert or update on public.response_templates
  for each row execute function public.review_response_template();

create table if not exists public.claim_tasks (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  assigned_to uuid references auth.users(id) on delete set null,
  completed boolean not null default false,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_claim_tasks_claim on public.claim_tasks(claim_id);
alter table public.claim_tasks enable row level security;
create policy "Approved users read claim tasks" on public.claim_tasks for select to authenticated using (public.is_approved(auth.uid()));
create policy "Editors manage claim tasks" on public.claim_tasks for all to authenticated
  using (public.is_approved(auth.uid()) and public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[]))
  with check (public.is_approved(auth.uid()) and public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[]));
create policy "Assignees complete claim tasks" on public.claim_tasks for update to authenticated
  using (public.is_approved(auth.uid()) and assigned_to = auth.uid())
  with check (public.is_approved(auth.uid()) and assigned_to = auth.uid());

create or replace function public.protect_claim_task()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[])
     and (new.claim_id is distinct from old.claim_id or new.title is distinct from old.title
       or new.assigned_to is distinct from old.assigned_to or new.id is distinct from old.id) then
    raise exception 'Only editors can change task details' using errcode = '42501';
  end if;
  new.completed_by := case when new.completed then auth.uid() else null end;
  return new;
end;
$$;
create trigger protect_claim_task before insert or update on public.claim_tasks for each row execute function public.protect_claim_task();

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claim_assigned boolean not null default true,
  status_changed boolean not null default true,
  evidence_added boolean not null default true
);
alter table public.notification_preferences enable row level security;
create policy "Users manage notification preferences" on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "System can insert notifications" on public.notifications;
create policy "Admins insert notifications" on public.notifications for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.protect_notification_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() = 'authenticated' and (new.user_id is distinct from old.user_id
    or new.payload is distinct from old.payload or new.type is distinct from old.type
    or new.id is distinct from old.id or new.created_at is distinct from old.created_at) then
    raise exception 'Only the read state of a notification can be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger protect_notification_update before update on public.notifications
  for each row execute function public.protect_notification_update();

create or replace function public.notify_claim_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  event_type public.notification_type;
  claim_record public.claims%rowtype;
  preferences public.notification_preferences%rowtype;
begin
  if tg_table_name = 'evidence' then
    select * into claim_record from public.claims where id = new.claim_id;
    event_type := 'evidence_added';
  else
    claim_record := new;
    if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
      select * into preferences from public.notification_preferences where user_id = new.assigned_to;
      if new.assigned_to is distinct from auth.uid() and coalesce(preferences.claim_assigned, true) then
        insert into public.notifications(user_id, type, payload) values
          (new.assigned_to, 'claim_assigned', jsonb_build_object('claim_id', new.id, 'title', new.title));
      end if;
    end if;
    if new.status is not distinct from old.status then return new; end if;
    event_type := 'status_changed';
  end if;
  for recipient in select distinct candidate from unnest(array[claim_record.created_by, claim_record.assigned_to]) as candidate
      where candidate is not null and candidate is distinct from auth.uid() loop
    select * into preferences from public.notification_preferences where user_id = recipient;
    if (event_type = 'evidence_added' and coalesce(preferences.evidence_added, true))
       or (event_type = 'status_changed' and coalesce(preferences.status_changed, true)) then
      insert into public.notifications(user_id, type, payload) values
        (recipient, event_type, jsonb_build_object('claim_id', claim_record.id, 'title', claim_record.title, 'status', claim_record.status));
    end if;
  end loop;
  insert into public.audit_logs(admin_id, action, target_type, target_id, metadata)
    select auth.uid(), event_type::text, 'claim', claim_record.id,
      jsonb_build_object('status', claim_record.status) where auth.uid() is not null;
  return new;
end;
$$;
create trigger notify_claim_activity after update on public.claims for each row execute function public.notify_claim_activity();
create trigger notify_evidence_activity after insert on public.evidence for each row execute function public.notify_claim_activity();

-- Signed evidence links must be backed by a private bucket and access policies.
update storage.buckets set public = false where id = 'evidence';
drop policy if exists "Anyone can view evidence files" on storage.objects;
drop policy if exists "Authenticated users can upload evidence" on storage.objects;
drop policy if exists "Uploaders can delete own evidence" on storage.objects;
create policy "Approved users read evidence files" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.is_approved(auth.uid()));
create policy "Approved analysts upload own evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_approved(auth.uid())
    and public.has_any_role(auth.uid(), array['analyst','editor','team_lead','admin']::public.app_role[])
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Uploaders delete own evidence files" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Anyone can view evidence" on public.evidence;
create policy "Approved users view evidence" on public.evidence for select to authenticated using (public.is_approved(auth.uid()));

-- Import and link under one lock; repeated requests return the same claim.
create or replace function public.import_sbunker_article(article_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare article public.sbunker_feed%rowtype; claim_id uuid;
begin
  if not public.is_approved(auth.uid()) or not public.has_any_role(auth.uid(), array['analyst','editor','team_lead','admin']::public.app_role[]) then
    raise exception 'An approved analyst account is required' using errcode = '42501';
  end if;
  select * into article from public.sbunker_feed where id = article_id for update;
  if not found then raise exception 'Article not found'; end if;
  if article.imported_claim_id is not null then return article.imported_claim_id; end if;
  insert into public.claims(title, description, source_url, language, status, created_by, sbunker_source_url)
    values (article.title, article.excerpt, article.url, case when article.language = 'sq' then 'sq' else 'en' end, 'pending', auth.uid(), article.url)
    returning id into claim_id;
  update public.sbunker_feed set imported_claim_id = claim_id where id = article_id;
  return claim_id;
end;
$$;
revoke all on function public.import_sbunker_article(uuid) from public;
grant execute on function public.import_sbunker_article(uuid) to authenticated;

commit;

begin;

create or replace function public.is_team_lead(_user_id uuid, _team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.team_members where user_id = _user_id and team_id = _team_id and role = 'lead');
$$;

drop policy if exists "Team leads can manage members" on public.team_members;
drop policy if exists "Team leads can remove members" on public.team_members;
create policy "Team leads insert members" on public.team_members for insert to authenticated
  with check (public.is_approved(auth.uid()) and (public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),team_id)));
create policy "Team leads update members" on public.team_members for update to authenticated
  using (public.is_approved(auth.uid()) and (public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),team_id)))
  with check (public.is_approved(auth.uid()) and (public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),team_id)));
create policy "Team leads remove members or members leave" on public.team_members for delete to authenticated
  using (public.is_approved(auth.uid()) and (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),team_id)));

create or replace function public.create_team_with_lead(team_name text, team_description text default null, lead_user_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare team_id uuid; lead_id uuid := coalesce(lead_user_id, auth.uid());
begin
  if not public.is_approved(auth.uid()) or not public.has_any_role(auth.uid(),array['analyst','editor','team_lead','admin']::public.app_role[]) then
    raise exception 'An approved analyst account is required' using errcode='42501';
  end if;
  if length(trim(team_name)) not between 1 and 150 or length(coalesce(team_description,'')) > 3000 then raise exception 'Invalid team name or description'; end if;
  if lead_id <> auth.uid() and not public.has_role(auth.uid(),'admin') then raise exception 'Only admins can choose another team lead' using errcode='42501'; end if;
  if not public.is_approved(lead_id) then raise exception 'The team lead must be approved'; end if;
  insert into public.teams(name,description,created_by) values(trim(team_name),nullif(trim(team_description),''),auth.uid()) returning id into team_id;
  insert into public.team_members(team_id,user_id,role) values(team_id,lead_id,'lead');
  return team_id;
end;
$$;

create or replace function public.get_team_roster(target_team_id uuid)
returns table(id uuid,user_id uuid,role text,joined_at timestamptz,full_name text)
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_approved(auth.uid()) then raise exception 'Approval required' using errcode='42501'; end if;
  return query select m.id,m.user_id,m.role,m.joined_at,p.full_name from public.team_members m
    left join public.profiles p on p.user_id=m.user_id where m.team_id=target_team_id order by m.joined_at;
end;
$$;

create or replace function public.list_team_candidates(target_team_id uuid)
returns table(user_id uuid,full_name text)
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_approved(auth.uid()) or not (public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),target_team_id)) then
    raise exception 'Team lead access required' using errcode='42501';
  end if;
  return query select p.user_id,p.full_name from public.profiles p where p.status='approved'
    and not exists(select 1 from public.team_members m where m.team_id=target_team_id and m.user_id=p.user_id) order by p.full_name;
end;
$$;

create or replace function public.keep_team_lead()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtext(old.team_id::text));
  if old.role='lead' and (tg_op='DELETE' or new.role<>'lead' or new.team_id<>old.team_id)
     and exists(select 1 from public.teams where id=old.team_id)
     and (select count(*) from public.team_members where team_id=old.team_id and role='lead') <= 1 then
    raise exception 'Assign another team lead before removing the last lead';
  end if;
  if tg_op='UPDATE' and (new.team_id is distinct from old.team_id or new.user_id is distinct from old.user_id) then
    raise exception 'Team member identity cannot be changed';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
create trigger keep_team_lead before update or delete on public.team_members for each row execute function public.keep_team_lead();

-- The authentication callback uses one self-scoped query, and can recover an
-- absent profile after a restore without granting approval or elevated roles.
create or replace function public.get_my_profile_and_roles()
returns json language plpgsql security definer set search_path=public as $$
declare profile_id uuid; result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  insert into public.profiles(user_id,full_name,avatar_url)
    select id,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),coalesce(raw_user_meta_data->>'avatar_url','')
    from auth.users where id=auth.uid() on conflict(user_id) do nothing returning id into profile_id;
  if profile_id is not null then
    insert into public.user_roles(user_id,role) values(auth.uid(),'analyst') on conflict(user_id,role) do nothing;
  end if;
  select jsonb_build_object('status',p.status,'roles',coalesce((select jsonb_agg(r.role) from public.user_roles r where r.user_id=auth.uid()),'[]'::jsonb))
    into result from public.profiles p where p.user_id=auth.uid();
  return result;
end;
$$;

create or replace function public.set_user_role(target_user_id uuid, new_role public.app_role)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_approved(auth.uid()) or not public.has_role(auth.uid(),'admin') then raise exception 'Admin access required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(473229);
  if public.has_role(target_user_id,'admin') and new_role<>'admin' and (select count(distinct r.user_id) from public.user_roles r join public.profiles p on p.user_id=r.user_id where r.role='admin' and p.status='approved') <= 1 then
    raise exception 'The last admin role cannot be removed';
  end if;
  delete from public.user_roles where user_id=target_user_id;
  insert into public.user_roles(user_id,role) values(target_user_id,new_role);
end;
$$;

-- Only the authenticated Edge Function's service client can resolve email or
-- configure a manually created user. Browser callers cannot invoke these.
create or replace function public.find_managed_user(user_email text)
returns uuid language sql stable security definer set search_path=public as $$
  select id from auth.users where lower(email)=lower(trim(user_email)) limit 1;
$$;
revoke all on function public.find_managed_user(text) from public;
grant execute on function public.find_managed_user(text) to service_role;

create or replace function public.configure_managed_user(target_user_id uuid, user_name text, user_role public.app_role, approve_user boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.profiles set full_name=user_name,status=case when approve_user then 'approved'::public.profile_status else 'pending_approval'::public.profile_status end where user_id=target_user_id;
  if not found then raise exception 'The created user has no profile'; end if;
  delete from public.user_roles where user_id=target_user_id;
  insert into public.user_roles(user_id,role) values(target_user_id,user_role);
end;
$$;
revoke all on function public.configure_managed_user(uuid,text,public.app_role,boolean) from public;
grant execute on function public.configure_managed_user(uuid,text,public.app_role,boolean) to service_role;

revoke all on function public.create_team_with_lead(text,text,uuid), public.get_team_roster(uuid), public.list_team_candidates(uuid), public.get_my_profile_and_roles(), public.set_user_role(uuid,public.app_role) from public;
grant execute on function public.create_team_with_lead(text,text,uuid), public.get_team_roster(uuid), public.list_team_candidates(uuid), public.get_my_profile_and_roles(), public.set_user_role(uuid,public.app_role) to authenticated;

commit;

-- Restore the private upload bucket if a database restore omitted storage metadata.
begin;
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do update set public = false;
commit;

-- Replace permissive legacy policies and restore application management permissions.
begin;
drop policy if exists "Authenticated users can add evidence" on public.evidence;
drop policy if exists "Authenticated users can view evidence" on public.evidence;
drop policy if exists "Authenticated users can read evidence" on storage.objects;
drop policy if exists "Users can delete own evidence" on storage.objects;
drop policy if exists "Authenticated users can join teams" on public.team_members;
create policy "Approved analysts add evidence records" on public.evidence for insert to authenticated
  with check (uploaded_by=auth.uid() and public.is_approved(auth.uid()) and public.has_any_role(auth.uid(),array['analyst','editor','team_lead','admin']::public.app_role[]));
create policy "Restored admins read profiles" on public.profiles for select to authenticated
  using(public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'));
create policy "Restored users update own profiles" on public.profiles for update to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Restored admins read roles" on public.user_roles for select to authenticated
  using(public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'));
create policy "Restored users mark notifications read" on public.notifications for update to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "Restored admins read audit logs" on public.audit_logs for select to authenticated
  using(public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'));
create policy "Restored admins write audit logs" on public.audit_logs for insert to authenticated
  with check(admin_id=auth.uid() and public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'));
-- Only the new RPC may create a team, so its first lead is created atomically.
drop policy if exists "Authenticated users can create teams" on public.teams;
-- Legacy profiles.role is display-only; access decisions use public.user_roles.
create or replace function public.protect_legacy_profile_role()
returns trigger language plpgsql set search_path=public as $$
begin
  if auth.role()='authenticated' and new.role is distinct from old.role then
    raise exception 'Use the managed role change action' using errcode='42501';
  end if;
  return new;
end;
$$;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
    create trigger protect_legacy_profile_role before update on public.profiles for each row execute function public.protect_legacy_profile_role();
  end if;
end $$;
notify pgrst, 'reload schema';
commit;

begin;
alter table public.profiles add column if not exists deleted_at timestamptz;
alter table public.profiles add column if not exists avatar_path text;
alter table public.teams add column if not exists avatar_path text;
create or replace function public.is_approved(_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where user_id=_user_id and status='approved' and deleted_at is null);
$$;

create or replace function public.prepare_account_action(actor_id uuid, target_id uuid, operation text, pending_only boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare target public.profiles%rowtype;
begin
  perform pg_advisory_xact_lock(473229);
  if not public.is_approved(actor_id) or not public.has_role(actor_id,'admin') then raise exception 'Approved admin access required' using errcode='42501'; end if;
  if actor_id=target_id then raise exception 'Use your own profile settings for your account'; end if;
  if operation not in ('approve','reject','suspend','restore','delete','password') then raise exception 'Invalid action'; end if;
  select * into target from public.profiles where user_id=target_id and deleted_at is null for update;
  if not found then raise exception 'Account not found'; end if;
  if pending_only and target.status<>'pending_approval' then raise exception 'Account is no longer pending approval'; end if;
  if operation in ('suspend','reject','delete') and public.has_role(target_id,'admin') and target.status='approved'
     and (select count(distinct p.user_id) from public.profiles p join public.user_roles r on r.user_id=p.user_id where p.status='approved' and p.deleted_at is null and r.role='admin')<=1 then
    raise exception 'The last approved admin cannot be removed or suspended';
  end if;
  if operation='delete' and exists(select 1 from public.team_members m where m.user_id=target_id and m.role='lead'
    and not exists(select 1 from public.team_members other where other.team_id=m.team_id and other.user_id<>target_id and other.role='lead' and public.is_approved(other.user_id))) then
    raise exception 'Assign another approved team lead before deleting this account';
  end if;
  if operation<>'password' then
    update public.profiles set status=case when operation in ('approve','restore') then 'approved'::public.profile_status when operation='reject' then 'rejected'::public.profile_status else 'suspended'::public.profile_status end where user_id=target_id;
  end if;
  insert into public.audit_logs(admin_id,action,target_type,target_id,metadata)
    values(actor_id,'account_'||operation||'_requested','user',target_id,jsonb_build_object('previous_status',target.status));
end;
$$;
create or replace function public.finish_account_delete(actor_id uuid, target_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(473229);
  if not public.is_approved(actor_id) or not public.has_role(actor_id,'admin') or actor_id=target_id then raise exception 'Admin access required' using errcode='42501'; end if;
  if not exists(select 1 from auth.users where id=target_id and deleted_at is not null) then raise exception 'Authentication deletion must finish first'; end if;
  delete from public.team_members where user_id=target_id;
  delete from public.user_roles where user_id=target_id;
  update public.profiles set status='suspended',deleted_at=now(),full_name='Deleted user',avatar_path=null,avatar_url=null where user_id=target_id;
  insert into public.audit_logs(admin_id,action,target_type,target_id) values(actor_id,'account_deleted','user',target_id);
end;
$$;
revoke all on function public.prepare_account_action(uuid,uuid,text,boolean),public.finish_account_delete(uuid,uuid) from public;
grant execute on function public.prepare_account_action(uuid,uuid,text,boolean),public.finish_account_delete(uuid,uuid) to service_role;

create or replace function public.protect_account_lifecycle()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.role()='authenticated' then
    if new.deleted_at is distinct from old.deleted_at then raise exception 'Use the managed delete action' using errcode='42501'; end if;
    if old.status='approved' and new.status is distinct from old.status and public.has_role(old.user_id,'admin') then
      perform pg_advisory_xact_lock(473229);
      if old.user_id=auth.uid() or (select count(distinct p.user_id) from public.profiles p join public.user_roles r on r.user_id=p.user_id where p.status='approved' and p.deleted_at is null and r.role='admin')<=1 then raise exception 'The last approved admin or your own account cannot be suspended'; end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger protect_account_lifecycle before update on public.profiles for each row execute function public.protect_account_lifecycle();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pictures','pictures',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.can_manage_picture(picture_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_approved(auth.uid()) and (
    ((storage.foldername(picture_path))[1]='users' and (storage.foldername(picture_path))[2]=auth.uid()::text)
    or ((storage.foldername(picture_path))[1]='teams' and exists(select 1 from public.teams t where t.id::text=(storage.foldername(picture_path))[2]
      and (public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),t.id)))));
$$;
create policy "Approved users read pictures" on storage.objects for select to authenticated using(bucket_id='pictures' and public.is_approved(auth.uid()));
create policy "Owners and team leads upload pictures" on storage.objects for insert to authenticated with check(bucket_id='pictures' and public.can_manage_picture(name));
create policy "Owners and team leads remove pictures" on storage.objects for delete to authenticated using(bucket_id='pictures' and public.can_manage_picture(name));

create or replace function public.protect_picture_path()
returns trigger language plpgsql security definer set search_path=public as $$
declare required_prefix text;
begin
  if new.avatar_path is not distinct from old.avatar_path then return new; end if;
  if tg_table_name='profiles' then
    required_prefix:='users/'||old.user_id::text||'/';
    if auth.role()='authenticated' and (auth.uid()<>old.user_id or not public.is_approved(auth.uid())) then raise exception 'You can only change your own picture' using errcode='42501'; end if;
  else
    required_prefix:='teams/'||old.id::text||'/';
    if auth.role()='authenticated' and (not public.is_approved(auth.uid()) or not (public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),old.id))) then raise exception 'Team lead access required' using errcode='42501'; end if;
  end if;
  if new.avatar_path is not null and (left(new.avatar_path,length(required_prefix))<>required_prefix or new.avatar_path like '%..%'
     or not exists(select 1 from storage.objects where bucket_id='pictures' and name=new.avatar_path)) then raise exception 'Upload a picture owned by this profile or team first'; end if;
  return new;
end;
$$;
create trigger protect_profile_picture before update on public.profiles for each row execute function public.protect_picture_path();
create trigger protect_team_picture before update on public.teams for each row execute function public.protect_picture_path();
create or replace function public.set_team_picture(target_team_id uuid,picture_path text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_approved(auth.uid()) or not(public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),target_team_id)) then raise exception 'Team lead access required' using errcode='42501'; end if;
  update public.teams set avatar_path=picture_path where id=target_team_id;
  if not found then raise exception 'Team not found'; end if;
end;
$$;
revoke all on function public.set_team_picture(uuid,text) from public;
grant execute on function public.set_team_picture(uuid,text) to authenticated;
-- Expired or banned sessions must also lose access through the data API.
do $$ declare table_name text; begin
  foreach table_name in array array['claims','evidence','teams','team_members','campaigns','campaign_claims','comments','notifications','audit_logs','integration_connections','feature_flags','sbunker_feed','response_templates','claim_tasks','notification_preferences'] loop
    if to_regclass('public.'||table_name) is not null then
      execute format('create policy "Approved active accounts required" on public.%I as restrictive for all to authenticated using(public.is_approved(auth.uid())) with check(public.is_approved(auth.uid()))',table_name);
    end if;
  end loop;
end $$;
notify pgrst,'reload schema';
commit;

-- Supabase default grants may explicitly include browser roles.
revoke all on function public.prepare_account_action(uuid,uuid,text,boolean),public.finish_account_delete(uuid,uuid) from anon, authenticated;
grant execute on function public.prepare_account_action(uuid,uuid,text,boolean),public.finish_account_delete(uuid,uuid) to service_role;
