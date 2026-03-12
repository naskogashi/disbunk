-- ============================================================
-- Disbunk.org — Seed Data
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- NOTE: These UUIDs are placeholders. In production, users are created
-- via Supabase Auth. For development, insert directly.

-- 1. Demo users (insert into auth.users if running locally via Supabase CLI)
-- For hosted Supabase, create these users via the Auth dashboard first,
-- then note their UUIDs and update below.

-- Placeholder UUIDs for demo
DO $$
DECLARE
  admin_uid uuid := 'a1b2c3d4-0001-4000-8000-000000000001';
  analyst_uid uuid := 'a1b2c3d4-0002-4000-8000-000000000002';
  claim1_id uuid := 'c1a1m000-0001-4000-8000-000000000001';
  claim2_id uuid := 'c1a1m000-0002-4000-8000-000000000002';
  claim3_id uuid := 'c1a1m000-0003-4000-8000-000000000003';
  campaign1_id uuid := 'ca4pa1g0-0001-4000-8000-000000000001';
  team1_id uuid := 'tea40000-0001-4000-8000-000000000001';
BEGIN

-- 2. Profiles
INSERT INTO public.profiles (user_id, full_name, status, language_pref, impact_score)
VALUES
  (admin_uid, 'Admin Demo', 'approved', 'en', 100),
  (analyst_uid, 'Analyst Demo', 'approved', 'sq', 25)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Roles
INSERT INTO public.user_roles (user_id, role)
VALUES
  (admin_uid, 'admin'),
  (analyst_uid, 'analyst')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Team
INSERT INTO public.teams (id, name, description, created_by)
VALUES (team1_id, 'Balkan Fact-Check Squad', 'Primary team covering Balkan disinformation', admin_uid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (team_id, user_id, role)
VALUES
  (team1_id, admin_uid, 'lead'),
  (team1_id, analyst_uid, 'member')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- 5. Claims (one Pending, one Investigating, one Debunked)
INSERT INTO public.claims (id, title, description, source_url, language, status, team_id, created_by, assigned_to)
VALUES
  (
    claim1_id,
    'Viral video claims parliament building was stormed',
    'A video circulating on social media claims to show a storming of the parliament building. The video has been shared over 50,000 times across multiple platforms including Facebook, Twitter, and Telegram.',
    'https://facebook.com/example/post/12345',
    'sq',
    'pending',
    team1_id,
    analyst_uid,
    NULL
  ),
  (
    claim2_id,
    'False election fraud statistics shared widely on social media',
    'A graphic claiming 30% of votes were fraudulent has been widely shared. No official source supports this claim. The graphic first appeared on a known disinformation page.',
    'https://twitter.com/example/status/67890',
    'en',
    'investigating',
    team1_id,
    analyst_uid,
    admin_uid
  ),
  (
    claim3_id,
    'Manipulated photo of political leader at unauthorized event',
    'A photo appearing to show a political leader at an inappropriate event has been confirmed as digitally altered using reverse image search and metadata analysis.',
    'https://telegram.org/example/channel/post',
    'sq',
    'debunked',
    team1_id,
    admin_uid,
    admin_uid
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Campaign linking two claims
INSERT INTO public.campaigns (id, name, description, team_id, created_by)
VALUES (
  campaign1_id,
  'Election Disinformation Wave — March 2026',
  'Coordinated campaign of election-related misinformation detected across Balkan social media platforms in the run-up to local elections.',
  team1_id,
  admin_uid
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.campaign_claims (campaign_id, claim_id)
VALUES
  (campaign1_id, claim1_id),
  (campaign1_id, claim2_id)
ON CONFLICT (campaign_id, claim_id) DO NOTHING;

END $$;
