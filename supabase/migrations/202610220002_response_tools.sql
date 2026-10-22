begin;

alter table public.claims add column if not exists severity smallint not null default 3 check (severity between 1 and 5);
alter table public.claims add column if not exists reach smallint not null default 3 check (reach between 1 and 5);
alter table public.evidence add column if not exists sha256 text check (sha256 ~ '^[a-f0-9]{64}$');
alter table public.evidence add column if not exists original_sha256 text check (original_sha256 ~ '^[a-f0-9]{64}$');
alter table public.evidence add column if not exists metadata_redacted boolean not null default false;
alter table public.evidence add column if not exists file_size bigint;

create table if not exists public.response_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  language text not null check (language in ('en', 'sq')),
  channel text not null check (channel in ('email', 'social', 'sms', 'press')),
  body text not null check (length(body) between 1 and 10000),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.response_templates enable row level security;
create policy "Approved users read response templates" on public.response_templates for select to authenticated
  using (public.is_approved(auth.uid()));
create policy "Analysts create draft templates" on public.response_templates for insert to authenticated
  with check (public.is_approved(auth.uid()) and created_by = auth.uid()
    and public.has_any_role(auth.uid(), array['analyst','editor','team_lead','admin']::public.app_role[]));
create policy "Authors and editors update response templates" on public.response_templates for update to authenticated
  using (public.is_approved(auth.uid()) and (created_by = auth.uid() or public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[])))
  with check (public.is_approved(auth.uid()) and (created_by = auth.uid() or public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[])));

create or replace function public.review_response_template()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.body is distinct from old.body or new.language is distinct from old.language
      or new.channel is distinct from old.channel or new.title is distinct from old.title) then
    new.status := 'draft';
  end if;
  if new.status = 'approved' then
    if not public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[]) then
      raise exception 'An editor must approve response templates' using errcode = '42501';
    end if;
    new.approved_by := auth.uid();
  else
    new.approved_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger review_response_template before insert or update on public.response_templates
  for each row execute function public.review_response_template();

create table if not exists public.claim_tasks (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  assigned_to uuid references auth.users(id) on delete set null,
  completed boolean not null default false,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_claim_tasks_claim on public.claim_tasks(claim_id);
alter table public.claim_tasks enable row level security;
create policy "Approved users read claim tasks" on public.claim_tasks for select to authenticated using (public.is_approved(auth.uid()));
create policy "Editors manage claim tasks" on public.claim_tasks for all to authenticated
  using (public.is_approved(auth.uid()) and public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[]))
  with check (public.is_approved(auth.uid()) and public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[]));
create policy "Assignees complete claim tasks" on public.claim_tasks for update to authenticated
  using (public.is_approved(auth.uid()) and assigned_to = auth.uid())
  with check (public.is_approved(auth.uid()) and assigned_to = auth.uid());

create or replace function public.protect_claim_task()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not public.has_any_role(auth.uid(), array['editor','team_lead','admin']::public.app_role[])
     and (new.claim_id is distinct from old.claim_id or new.title is distinct from old.title
       or new.assigned_to is distinct from old.assigned_to or new.id is distinct from old.id) then
    raise exception 'Only editors can change task details' using errcode = '42501';
  end if;
  new.completed_by := case when new.completed then auth.uid() else null end;
  return new;
end;
$$;
create trigger protect_claim_task before insert or update on public.claim_tasks for each row execute function public.protect_claim_task();

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  claim_assigned boolean not null default true,
  status_changed boolean not null default true,
  evidence_added boolean not null default true
);
alter table public.notification_preferences enable row level security;
create policy "Users manage notification preferences" on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "System can insert notifications" on public.notifications;
create policy "Admins insert notifications" on public.notifications for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.protect_notification_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() = 'authenticated' and (new.user_id is distinct from old.user_id
    or new.payload is distinct from old.payload or new.type is distinct from old.type
    or new.id is distinct from old.id or new.created_at is distinct from old.created_at) then
    raise exception 'Only the read state of a notification can be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger protect_notification_update before update on public.notifications
  for each row execute function public.protect_notification_update();

create or replace function public.notify_claim_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  event_type public.notification_type;
  claim_record public.claims%rowtype;
  preferences public.notification_preferences%rowtype;
begin
  if tg_table_name = 'evidence' then
    select * into claim_record from public.claims where id = new.claim_id;
    event_type := 'evidence_added';
  else
    claim_record := new;
    if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
      select * into preferences from public.notification_preferences where user_id = new.assigned_to;
      if new.assigned_to is distinct from auth.uid() and coalesce(preferences.claim_assigned, true) then
        insert into public.notifications(user_id, type, payload) values
          (new.assigned_to, 'claim_assigned', jsonb_build_object('claim_id', new.id, 'title', new.title));
      end if;
    end if;
    if new.status is not distinct from old.status then return new; end if;
    event_type := 'status_changed';
  end if;
  for recipient in select distinct candidate from unnest(array[claim_record.created_by, claim_record.assigned_to]) as candidate
      where candidate is not null and candidate is distinct from auth.uid() loop
    select * into preferences from public.notification_preferences where user_id = recipient;
    if (event_type = 'evidence_added' and coalesce(preferences.evidence_added, true))
       or (event_type = 'status_changed' and coalesce(preferences.status_changed, true)) then
      insert into public.notifications(user_id, type, payload) values
        (recipient, event_type, jsonb_build_object('claim_id', claim_record.id, 'title', claim_record.title, 'status', claim_record.status));
    end if;
  end loop;
  insert into public.audit_logs(admin_id, action, target_type, target_id, metadata)
    select auth.uid(), event_type::text, 'claim', claim_record.id,
      jsonb_build_object('status', claim_record.status) where auth.uid() is not null;
  return new;
end;
$$;
create trigger notify_claim_activity after update on public.claims for each row execute function public.notify_claim_activity();
create trigger notify_evidence_activity after insert on public.evidence for each row execute function public.notify_claim_activity();

-- Signed evidence links must be backed by a private bucket and access policies.
update storage.buckets set public = false where id = 'evidence';
drop policy if exists "Anyone can view evidence files" on storage.objects;
drop policy if exists "Authenticated users can upload evidence" on storage.objects;
drop policy if exists "Uploaders can delete own evidence" on storage.objects;
create policy "Approved users read evidence files" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and public.is_approved(auth.uid()));
create policy "Approved analysts upload own evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_approved(auth.uid())
    and public.has_any_role(auth.uid(), array['analyst','editor','team_lead','admin']::public.app_role[])
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Uploaders delete own evidence files" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Anyone can view evidence" on public.evidence;
create policy "Approved users view evidence" on public.evidence for select to authenticated using (public.is_approved(auth.uid()));

-- Import and link under one lock; repeated requests return the same claim.
create or replace function public.import_sbunker_article(article_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare article public.sbunker_feed%rowtype; claim_id uuid;
begin
  if not public.is_approved(auth.uid()) or not public.has_any_role(auth.uid(), array['analyst','editor','team_lead','admin']::public.app_role[]) then
    raise exception 'An approved analyst account is required' using errcode = '42501';
  end if;
  select * into article from public.sbunker_feed where id = article_id for update;
  if not found then raise exception 'Article not found'; end if;
  if article.imported_claim_id is not null then return article.imported_claim_id; end if;
  insert into public.claims(title, description, source_url, language, status, created_by, sbunker_source_url)
    values (article.title, article.excerpt, article.url, case when article.language = 'sq' then 'sq' else 'en' end, 'pending', auth.uid(), article.url)
    returning id into claim_id;
  update public.sbunker_feed set imported_claim_id = claim_id where id = article_id;
  return claim_id;
end;
$$;
revoke all on function public.import_sbunker_article(uuid) from public;
grant execute on function public.import_sbunker_article(uuid) to authenticated;

commit;
