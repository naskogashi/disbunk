-- Admin-reviewed suggestions. Worker writes through a server-only connection.
create table public.cluster_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check(status in ('running','completed','failed')),
  model text not null,
  parameters jsonb not null default '{}',
  claim_count integer not null default 0,
  group_count integer not null default 0,
  error_code text
);
create table public.claim_embedding_cache (
  claim_id uuid primary key references public.claims(id) on delete cascade,
  source_hash text not null,
  model text not null,
  embedding real[] not null check(array_length(embedding,1)=384),
  generated_at timestamptz not null default now()
);
create table public.narrative_suggestions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.cluster_runs(id),
  team_id uuid references public.teams(id) on delete cascade,
  fingerprint text not null unique,
  title text not null,
  status text not null default 'pending' check(status in ('pending','accepted','rejected','superseded')),
  campaign_id uuid references public.campaigns(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.narrative_suggestion_claims (
  suggestion_id uuid not null references public.narrative_suggestions(id) on delete cascade,
  claim_id uuid not null references public.claims(id) on delete cascade,
  source_hash text not null,
  strength real not null check(strength between 0 and 1),
  primary key(suggestion_id,claim_id)
);
alter table public.cluster_runs enable row level security;
alter table public.claim_embedding_cache enable row level security;
alter table public.narrative_suggestions enable row level security;
alter table public.narrative_suggestion_claims enable row level security;
revoke all on public.cluster_runs,public.claim_embedding_cache,public.narrative_suggestions,public.narrative_suggestion_claims from anon,authenticated;
grant select on public.cluster_runs,public.narrative_suggestions,public.narrative_suggestion_claims to authenticated;
grant all on public.cluster_runs,public.claim_embedding_cache,public.narrative_suggestions,public.narrative_suggestion_claims to service_role;
create policy "Admin cluster runs" on public.cluster_runs for select to authenticated using(public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'));
create policy "Admin narrative suggestions" on public.narrative_suggestions for select to authenticated using(public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'));
create policy "Admin narrative members" on public.narrative_suggestion_claims for select to authenticated using(public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'));

-- A dedicated non-login role; provision a login separately, outside migrations.
-- It can read claim text and maintain analysis, but cannot edit claims or accounts.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='disbunk_cluster_worker') then
    create role disbunk_cluster_worker nologin;
  end if;
end $$;
grant usage on schema public to disbunk_cluster_worker;
grant select(id,title,description,team_id,created_at,updated_at) on public.claims to disbunk_cluster_worker;
grant select,insert,update on public.cluster_runs,public.claim_embedding_cache,public.narrative_suggestions,public.narrative_suggestion_claims to disbunk_cluster_worker;
create policy "Worker reads claims for analysis" on public.claims for select to disbunk_cluster_worker using(true);
create policy "Worker maintains runs" on public.cluster_runs for all to disbunk_cluster_worker using(true) with check(true);
create policy "Worker maintains embedding cache" on public.claim_embedding_cache for all to disbunk_cluster_worker using(true) with check(true);
create policy "Worker maintains suggestions" on public.narrative_suggestions for all to disbunk_cluster_worker using(true) with check(true);
create policy "Worker maintains suggestion members" on public.narrative_suggestion_claims for all to disbunk_cluster_worker using(true) with check(true);

create or replace function public.review_narrative_suggestion(suggestion_id uuid, decision text, campaign_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare s public.narrative_suggestions; result_id uuid;
begin
  if not public.is_approved(auth.uid()) or not public.has_role(auth.uid(),'admin') then
    raise exception 'Approved admin access required' using errcode='42501';
  end if;
  if decision not in ('accepted','rejected') then raise exception 'Invalid review decision'; end if;
  select * into s from public.narrative_suggestions where id=suggestion_id for update;
  if not found or s.status<>'pending' then raise exception 'Suggestion is no longer pending'; end if;
  if decision='accepted' then
    if length(trim(coalesce(campaign_name,''))) not between 3 and 160 then raise exception 'Campaign name must contain 3 to 160 characters'; end if;
    perform 1 from public.claims c join public.narrative_suggestion_claims m on c.id=m.claim_id where m.suggestion_id=s.id for share of c;
    -- Refuse deleted/moved/edited claims; rerun analysis before accepting stale groups.
    if (select count(*) from public.narrative_suggestion_claims m where m.suggestion_id=s.id)<5
      or exists(select 1 from public.narrative_suggestion_claims m join public.claims c on c.id=m.claim_id
        where m.suggestion_id=s.id and (c.team_id is distinct from s.team_id or c.updated_at>s.created_at))
    then raise exception 'Claims changed; rerun analysis before accepting'; end if;
    insert into public.campaigns(name,team_id,created_by) values(trim(campaign_name),s.team_id,auth.uid()) returning id into result_id;
    insert into public.campaign_claims(campaign_id,claim_id) select result_id,m.claim_id from public.narrative_suggestion_claims m where m.suggestion_id=s.id;
  end if;
  update public.narrative_suggestions set status=decision,campaign_id=result_id,reviewed_by=auth.uid(),reviewed_at=now() where id=s.id;
  insert into public.audit_logs(admin_id,action,target_type,target_id,metadata)
    values(auth.uid(),'narrative_'||decision,'narrative_suggestion',s.id,jsonb_build_object('campaign_id',result_id));
  return result_id;
end $$;
revoke all on function public.review_narrative_suggestion(uuid,text,text) from public,anon;
grant execute on function public.review_narrative_suggestion(uuid,text,text) to authenticated;
