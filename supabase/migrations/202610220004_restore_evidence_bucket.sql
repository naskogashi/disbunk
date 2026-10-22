-- Restore the private upload bucket if a database restore omitted storage metadata.
begin;
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do update set public = false;
commit;
