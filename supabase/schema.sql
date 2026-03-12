-- ============================================================
-- Disbunk.org — Full Database Schema
-- Run this in Supabase SQL Editor (in order)
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "pgvector" with schema extensions;
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
