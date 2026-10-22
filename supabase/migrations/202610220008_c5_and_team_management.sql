begin;

-- C5 assessments are editorial notes, not automated verdicts.
alter table public.claims add column if not exists c5_assessment jsonb not null default '{}'::jsonb;
alter table public.claims add constraint claims_c5_object check (jsonb_typeof(c5_assessment)='object' and octet_length(c5_assessment::text)<=60000);
alter table public.claims add constraint claims_c5_intent check (
  coalesce(c5_assessment->>'classification','unknown') in ('unknown','misinformation','disinformation') and
  (c5_assessment->>'classification' is distinct from 'disinformation' or length(trim(coalesce(c5_assessment->>'intentEvidence','')))>0)
);

create or replace function public.update_team_details(target_team_id uuid, team_name text, team_description text)
returns void language plpgsql security definer set search_path=public as $$
declare previous_name text;
begin
  if not public.is_approved(auth.uid()) or not (public.has_role(auth.uid(),'admin') or public.is_team_lead(auth.uid(),target_team_id)) then
    raise exception 'Team lead or admin access required' using errcode='42501';
  end if;
  if team_name is null or length(trim(team_name)) not between 1 and 120 or length(coalesce(team_description,''))>2000 then
    raise exception 'Use a team name of 1–120 characters and a description up to 2000 characters';
  end if;
  select name into previous_name from public.teams where id=target_team_id for update;
  if not found then raise exception 'Team not found'; end if;
  update public.teams set name=trim(team_name),description=nullif(trim(team_description),'') where id=target_team_id;
  insert into public.audit_logs(admin_id,action,target_type,target_id,metadata)
    values(auth.uid(),'team_details_updated','team',target_team_id,jsonb_build_object('previous_name',previous_name,'name',trim(team_name)));
end;
$$;
revoke all on function public.update_team_details(uuid,text,text) from public,anon;
grant execute on function public.update_team_details(uuid,text,text) to authenticated;

-- Integration configuration and implementation details belong to administrators.
-- Restrictive policies also constrain older permissive policies in restored databases.
create policy "Admin integration access only" on public.integration_connections as restrictive for all to authenticated
  using(public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'))
  with check(public.is_approved(auth.uid()) and public.has_role(auth.uid(),'admin'));
commit;
