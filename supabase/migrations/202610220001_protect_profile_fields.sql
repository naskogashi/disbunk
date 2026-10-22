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
