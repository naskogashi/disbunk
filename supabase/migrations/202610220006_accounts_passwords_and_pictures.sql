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
