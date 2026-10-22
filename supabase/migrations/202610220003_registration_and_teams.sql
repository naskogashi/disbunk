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
