-- =====================================================================
-- My Struggle — flagship demo seed (v1)
-- =====================================================================
-- COMPACT seed: ONLY the hand-written flagship rows from
-- app/lib/store.ts seed() — Danielle / Tyrell / Andre / Marcus / Sarah,
-- the two centers, Danielle's + Tyrell's support requests, the two
-- hand-written community posts (hearts + comment), the two demo DM
-- threads, and the six courses with Danielle's three enrollments.
--
-- BULK SEED (the ~500 generated members, ~280 requests, ~2,500
-- donations, ~148 posts, ~340 sessions, ~450 enrollments) is
-- deliberately NOT inlined here. Run it via a script that imports
-- seed() from app/lib/store.ts, converts the output to CSV (dollars ->
-- cents, epoch-ms -> timestamptz, seed-* ids -> uuids via a stable map),
-- and loads it with `\copy` / supabase db import. See
-- docs/13-SUPABASE-MIGRATION.md §Seed for the recipe.
--
-- AUTH USERS: the direct `auth.users` inserts below are the standard
-- LOCAL-DEV seed trick (supabase start / supabase db reset). On a hosted
-- project prefer `supabase auth admin` / the Admin API
-- (auth.admin.createUser with email_confirm: true) using the same fixed
-- UUIDs, then run everything from "-- centers" down.
-- All demo logins keep password "mystruggle" (CLAUDE.md).
--
-- Money is INTEGER CENTS here (store floats × 100): Danielle's
-- {cash: 64, credits: 58, savings: 240} → 6400 / 5800 / 24000.
-- Run AFTER schema.sql + policies.sql.
-- =====================================================================

begin;

-- ── fixed demo ids ───────────────────────────────────────────────────
-- a…-01 sarah   a…-02 marcus   a…-03 danielle   a…-04 tyrell   a…-05 andre

-- ── auth users (LOCAL DEV — see header note) ─────────────────────────
insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sarah@themystruggles.com',    crypt('mystruggle', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Sarah","role":"staff","avatar_color":"#0B2545"}',  now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'marcus@themystruggles.com',   crypt('mystruggle', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Marcus","role":"mentor","avatar_color":"#4E5B9B"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'danielle@themystruggles.com', crypt('mystruggle', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Danielle","role":"member","avatar_color":"#2E7CD6"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'tyrell@themystruggles.com',   crypt('mystruggle', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Tyrell","role":"member","avatar_color":"#0B2545"}', now(), now()),
  ('a0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'andre@themystruggles.com',    crypt('mystruggle', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Andre","role":"member","avatar_color":"#12B76A"}',  now(), now());

-- GoTrue ≥2.90 needs an email identity row per user for password login.
insert into auth.identities
  (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.id::text like 'a0000000-0000-4000-8000-00000000000%';

-- ── centers ──────────────────────────────────────────────────────────
insert into public.centers (id, name, city) values
  ('c0000000-0000-4000-8000-000000000001', 'Laveen Center',        'Laveen, AZ'),
  ('c0000000-0000-4000-8000-000000000002', 'South Phoenix Center', 'Phoenix, AZ');

-- ── profiles ─────────────────────────────────────────────────────────
-- The on_auth_user_created trigger already stubbed these rows from the
-- signup metadata; enrich them with the flagship demo fields.

update public.profiles set
  center_id = 'c0000000-0000-4000-8000-000000000001'
where id = 'a0000000-0000-4000-8000-000000000001';   -- Sarah (staff)

update public.profiles set
  center_id = 'c0000000-0000-4000-8000-000000000001'
where id = 'a0000000-0000-4000-8000-000000000002';   -- Marcus (mentor)

update public.profiles set                            -- Danielle #039521464
  slug = 'danielle',
  member_number = '039521464',
  story = 'I earned my GED, started my first job, and moved into transitional housing — three milestones in eight months. Right now I''m working toward $175 a week for my hallway house, the last step before a place of my own.',
  consent_public = true,
  cash_cents = 6400, credits_cents = 5800, savings_cents = 24000,
  streak = 12, points = 640, level = 'Silver',
  mentor_id = 'a0000000-0000-4000-8000-000000000002',
  center_id = 'c0000000-0000-4000-8000-000000000001'
where id = 'a0000000-0000-4000-8000-000000000003';

update public.profiles set                            -- Tyrell
  slug = 'tyrell',
  member_number = '039521512',
  story = 'Six months clean and studying for my forklift certification.',
  consent_public = true,
  cash_cents = 2200, credits_cents = 3100, savings_cents = 8000,
  streak = 0, points = 310, level = 'Bronze',
  mentor_id = 'a0000000-0000-4000-8000-000000000002',
  center_id = 'c0000000-0000-4000-8000-000000000001'
where id = 'a0000000-0000-4000-8000-000000000004';

update public.profiles set                            -- Andre (consent OFF — the negative-test member)
  slug = 'andre',
  member_number = '039521588',
  story = '',
  consent_public = false,
  cash_cents = 0, credits_cents = 1000, savings_cents = 0,
  streak = 1, points = 10, level = 'Bronze',
  mentor_id = 'a0000000-0000-4000-8000-000000000002',
  center_id = 'c0000000-0000-4000-8000-000000000001'
where id = 'a0000000-0000-4000-8000-000000000005';

-- ── support requests (Danielle's hallway house + Tyrell's cert fee) ──
insert into public.support_requests
  (id, member_id, label, weekly_target_cents, raised_cents, status, created_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003',
   'Hallway house',              17500, 10500, 'active', now() - interval '30 days'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004',
   'Forklift certification fee',  6000,  1500, 'active', now() - interval '10 days');

-- ── the two hand-written community posts ─────────────────────────────
insert into public.posts (id, author_id, body, kind, status, topic, created_at) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'One year sober today. To everyone at the center who never gave up on me — this one''s for you. Now I get to walk it with my mentees.',
   'milestone', 'approved', 'general', now() - interval '2 days'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
   'Got my GED today. The whole center stopped to cheer. Next stop: my own place.',
   'win', 'approved', 'general', now() - interval '4 days');

insert into public.post_hearts (post_id, user_id) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003'), -- Danielle → Marcus's milestone
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004'), -- Tyrell   → Marcus's milestone
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002'); -- Marcus   → Danielle's win

insert into public.comments (id, post_id, author_id, body, created_at) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000003',
   'So proud of you Marcus. You showed me it''s possible.', now() - interval '2 days');

-- ── demo DM threads (Danielle↔Marcus, Tyrell↔Marcus) ─────────────────
insert into public.threads (id, created_at) values
  ('b0000000-0000-4000-8000-000000000001', now() - interval '60 days'),
  ('b0000000-0000-4000-8000-000000000002', now() - interval '40 days');

insert into public.thread_participants (thread_id, user_id) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002');

insert into public.messages (id, thread_id, sender_id, kind, body, created_at) values
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000002', 'text',
   'Proud of you for Tuesday. Same time this week?', now() - interval '5 hours'),
  ('b1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000003', 'text',
   'Yes! And I finished lesson 2 already 😊', now() - interval '4 hours'),
  ('b1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000002', 'text',
   'Hey Tyrell — haven''t seen you check in this week. No pressure, just thinking of you. Coffee Friday?', now() - interval '6 days');

-- ── courses + Danielle's enrollments ─────────────────────────────────
insert into public.courses (id, slug, title, program, lesson_count) values
  ('70000000-0000-4000-8000-000000000001', 'course-ise-1',           'ISE Course 1 — Honesty',      'PON', 6),
  ('70000000-0000-4000-8000-000000000002', 'course-ise-2',           'ISE Course 2 — Hope',         'PON', 6),
  ('70000000-0000-4000-8000-000000000003', 'course-ise-3',           'ISE Course 3 — Decision',     'PON', 6),
  ('70000000-0000-4000-8000-000000000004', 'course-forklift',        'Forklift Certification',      'VOC', 8),
  ('70000000-0000-4000-8000-000000000005', 'course-docs-id',         'Documents & ID Recovery',     'NAV', 4),
  ('70000000-0000-4000-8000-000000000006', 'course-relapse-basics',  'Relapse Prevention Basics',   'IOP', 5);

insert into public.enrollments (id, member_id, course_id, completed_lessons, updated_at) values
  ('80000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003',
   '70000000-0000-4000-8000-000000000003', '{1,2}',     now() - interval '2 days'),   -- ISE 3 in progress
  ('80000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
   '70000000-0000-4000-8000-000000000004', '{1}',       now() - interval '5 days'),   -- Forklift just started
  ('80000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003',
   '70000000-0000-4000-8000-000000000005', '{1,2,3,4}', now() - interval '20 days');  -- Docs & ID complete

commit;
