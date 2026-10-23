-- Compare the exact analyzed version, including transactions that began earlier.
alter table public.narrative_suggestion_claims add column source_updated_at timestamptz not null default '-infinity';
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
        where m.suggestion_id=s.id and (c.team_id is distinct from s.team_id or c.updated_at is distinct from m.source_updated_at))
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
