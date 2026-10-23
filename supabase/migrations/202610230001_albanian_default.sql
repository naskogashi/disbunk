-- Preserve existing language preferences; new profiles start in Albanian.
alter table public.profiles add column if not exists language_pref text not null default 'sq';
alter table public.profiles alter column language_pref set default 'sq';
