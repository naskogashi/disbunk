-- Bring the restored legacy schema up to the prerequisites of the feature migrations.
-- Existing rows, role assignments, and text-valued status columns are preserved.
begin;
do $$ begin
  if not exists(select 1 from pg_type where typnamespace='public'::regnamespace and typname='profile_status') then
    create type public.profile_status as enum ('pending_approval','approved','rejected','suspended');
  end if;
  if not exists(select 1 from pg_type where typnamespace='public'::regnamespace and typname='notification_type') then
    create type public.notification_type as enum ('claim_assigned','evidence_added','status_changed','team_mention','registration','system');
  end if;
end $$;
alter table public.audit_logs add column if not exists metadata jsonb not null default '{}';
alter table public.team_members add column if not exists id uuid not null default gen_random_uuid();
alter table public.team_members add column if not exists joined_at timestamptz not null default now();
create unique index if not exists restored_profiles_user_id_unique on public.profiles(user_id);
create unique index if not exists restored_team_members_id_unique on public.team_members(id);
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role);
$$;
create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=any(_roles));
$$;
create or replace function public.is_approved(_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where user_id=_user_id and status='approved');
$$;
commit;
