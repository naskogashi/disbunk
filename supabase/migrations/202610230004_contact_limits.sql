-- Anonymous visitors use the contact function, never this table or RPC directly.
create table if not exists public.contact_submission_limits (
  bucket text primary key,
  attempts integer not null default 0,
  expires_at timestamptz not null
);
alter table public.contact_submission_limits enable row level security;
revoke all on public.contact_submission_limits from public, anon, authenticated;

create or replace function public.reserve_contact_submission(p_key text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare global_key text := 'global:' || to_char(now() at time zone 'UTC','YYYY-MM-DD');
begin
  if p_key !~ '^[a-f0-9]{64}$' then return false; end if;
  perform pg_advisory_xact_lock(hashtext('disbunk-contact-limits'));
  delete from public.contact_submission_limits where expires_at < now();
  insert into public.contact_submission_limits(bucket,expires_at)
    values(global_key,now()+interval '2 days'),(p_key,now()+interval '2 hours') on conflict do nothing;
  if exists(select 1 from public.contact_submission_limits where
    (bucket=global_key and attempts>=50) or (bucket=p_key and attempts>=3)) then return false; end if;
  update public.contact_submission_limits set attempts=attempts+1 where bucket in(global_key,p_key);
  return true;
end $$;
revoke all on function public.reserve_contact_submission(text) from public, anon, authenticated;
grant execute on function public.reserve_contact_submission(text) to service_role;
