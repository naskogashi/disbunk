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
