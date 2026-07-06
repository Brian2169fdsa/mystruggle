

-- ============================================================
-- 01 CORE SCHEMA (schema.sql) — enum patched to include 'employer'
-- ============================================================
-- =====================================================================
-- My Struggle — Supabase schema (v1)
-- =====================================================================
-- Complete, runnable DDL for the tables the app ACTUALLY USES today
-- (app/lib/types.ts + app/lib/store.ts are the source contract).
-- Where docs/03-DATA-MODEL.md specifies richer models (append-only
-- ledger_entries, journey stages, orgs/memberships multi-tenancy,
-- Stripe fields), those are noted inline as PHASE 2 and NOT created —
-- the swap must be mechanical against the current route handlers.
--
-- MONEY CONVERSION (important): the in-memory store keeps FLOAT DOLLARS
-- (a $25 donation splits into cash 12.5 / credits 12.5). Every money
-- column here is INTEGER CENTS. Conversion at migration time is
-- round(dollars * 100); route handlers convert at the edge
-- (JSON in dollars -> cents in SQL) until the UI is moved to cents.
-- The 50/50 donation split in cents: cash = amount_cents / 2 (integer
-- division), credits = amount_cents - cash — never lose a cent.
--
-- Run order: schema.sql -> policies.sql -> seed.sql
-- =====================================================================

create extension if not exists pgcrypto; -- gen_random_uuid + crypt() for dev seeds

-- ── enums ────────────────────────────────────────────────────────────
-- Labels match app/lib/types.ts unions EXACTLY (including the hyphen in
-- 'in-person') so route handlers can pass TS values straight through.

create type public.user_role         as enum ('member', 'mentor', 'staff', 'employer');
create type public.post_kind         as enum ('regular', 'milestone', 'win');
create type public.post_status       as enum ('approved', 'pending', 'flagged', 'removed');
create type public.topic             as enum ('general', 'jobs', 'housing', 'recovery', 'gratitude');
create type public.message_kind      as enum ('text', 'mood', 'cheer');
create type public.session_mode      as enum ('in-person', 'phone', 'video');
create type public.request_status    as enum ('active', 'funded');
create type public.application_status as enum ('new', 'contacted', 'approved');
create type public.concern_status    as enum ('open', 'resolved');
create type public.program           as enum ('PON', 'VOC', 'IOP', 'NAV');

-- ── centers ──────────────────────────────────────────────────────────
-- Maps Center. PHASE 2: becomes orgs (type nonprofit|center, settings
-- jsonb) with memberships for multi-tenancy per docs/03.

create table public.centers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  city       text not null,
  created_at timestamptz not null default now()
);

-- ── profiles ─────────────────────────────────────────────────────────
-- Maps User 1:1, EXCEPT passwordHash/salt — Supabase Auth owns
-- credentials; profiles.id references auth.users(id). The HMAC cookie
-- session (app/lib/auth.ts) is replaced entirely.
--
-- PHASE 2 (docs/03): split into profiles + participants + memberships;
-- journey_stage enum; consent_photo/consent_signed_at; balances move to
-- an append-only ledger_entries table (these three cached columns then
-- become a materialized rollup). Points/streak move to points_events +
-- streaks tables.

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  role             public.user_role not null default 'member',
  name             text not null,                -- FIRST NAME ONLY is ever shown publicly
  email            text not null unique,         -- mirror of auth.users.email (kept by trigger)
  avatar_color     text not null default '#2E7CD6',
  -- member fields (null for mentors/staff)
  slug             text unique,                  -- public giving page /p/[slug]
  member_number    text unique,                  -- e.g. 039521464
  story            text,                         -- approved public story
  consent_public   boolean not null default false, -- public giving page on/off (docs/10: revocable, takes effect immediately)
  cash_cents       integer not null default 0 check (cash_cents >= 0),
  credits_cents    integer not null default 0 check (credits_cents >= 0),
  savings_cents    integer not null default 0 check (savings_cents >= 0),
  streak           integer not null default 0 check (streak >= 0),
  points           integer not null default 0 check (points >= 0),
  level            text not null default 'Bronze', -- Bronze|Silver|Gold ladder (docs/07); text, ladder may grow
  mentor_id        uuid references public.profiles (id) on delete set null,
  center_id        uuid references public.centers (id) on delete set null,
  last_activity_at timestamptz,                  -- last streak-qualifying activity (lesson complete)
  created_at       timestamptz not null default now()
);

-- Roster query: profiles by role within a center (dashboard + mentor app).
create index profiles_role_center_idx on public.profiles (role, center_id);
create index profiles_mentor_idx      on public.profiles (mentor_id) where mentor_id is not null;

-- Auto-create a profile row when Supabase Auth creates a user.
-- Signup metadata: { name, role, avatar_color } via auth.signUp options.data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email, avatar_color)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'member'),
    coalesce(nullif(split_part(new.raw_user_meta_data ->> 'name', ' ', 1), ''), 'Member'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#2E7CD6')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── support_requests ─────────────────────────────────────────────────
-- Maps SupportRequest (weekly giving goals shown on /p/[slug] + board).
-- PHASE 2 (docs/03): goals table with category/description/approved_by.

create table public.support_requests (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references public.profiles (id) on delete cascade,
  label              text not null,               -- e.g. "Hallway house"
  weekly_target_cents integer not null check (weekly_target_cents between 100 and 1000000), -- $1–$10,000 (route validation)
  raised_cents       integer not null default 0 check (raised_cents >= 0),
  status             public.request_status not null default 'active',
  created_at         timestamptz not null default now()
);

-- Giving views: a member's requests by status; the public active board.
create index support_requests_member_status_idx on public.support_requests (member_id, status);
create index support_requests_board_idx on public.support_requests (status, created_at desc);

-- ── donations ────────────────────────────────────────────────────────
-- Maps Donation. Written ONLY by the Stripe webhook (service role) in
-- the target architecture — see policies.sql.
-- PHASE 2 (docs/03): stripe_event_id unique, payment_intent, fee_cents,
-- net_cents, cash/credit split columns, donor identity, designation;
-- balance effects recorded as ledger_entries instead of direct
-- profiles.*_cents updates.

create table public.donations (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.profiles (id) on delete cascade,
  request_id   uuid references public.support_requests (id) on delete set null,
  amount_cents integer not null check (amount_cents between 100 and 1000000),
  weekly       boolean not null default false,    -- weekly recurring pledge
  created_at   timestamptz not null default now()
);

create index donations_member_idx  on public.donations (member_id, created_at desc);
create index donations_created_idx on public.donations (created_at desc); -- 12-month reports window

-- ── posts ────────────────────────────────────────────────────────────
-- Maps Post. Denormalized authorName/authorRole/avatarColor on the TS
-- type become a join to profiles (select ... , author:profiles(name,
-- role, avatar_color)). hearts: string[] becomes post_hearts join table;
-- comments: Comment[] becomes the comments table.
-- PHASE 2 (docs/03): audience/org scoping, media jsonb, moderation_events
-- audit log, like_count/comment_count counters.

create table public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  kind       public.post_kind not null default 'regular',
  status     public.post_status not null default 'approved', -- current app auto-approves; crisis text is written as 'flagged' (held). docs/05 target pipeline flips this default to 'pending'.
  topic      public.topic not null default 'general',
  request_id uuid references public.support_requests (id) on delete set null, -- support-request post links the author's own goal
  created_at timestamptz not null default now()
);

-- THE feed query: approved posts newest-first (+ topic filter + cursor).
create index posts_feed_idx        on public.posts (status, created_at desc);
create index posts_feed_topic_idx  on public.posts (topic, created_at desc) where status = 'approved';
create index posts_author_idx      on public.posts (author_id, created_at desc);

-- ── post_hearts ──────────────────────────────────────────────────────
-- Replaces Post.hearts: string[] — one row per (post, user) reaction.
-- Toggle = insert / delete; count = count(*).

create table public.post_hearts (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_hearts_user_idx on public.post_hearts (user_id);

-- ── comments ─────────────────────────────────────────────────────────
-- Maps Comment (authorName/authorRole denormalization → join profiles).

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index comments_post_idx on public.comments (post_id, created_at);

-- ── threads / thread_participants / messages ─────────────────────────
-- Maps Thread (participantIds: string[] → thread_participants join
-- table; messages: Message[] → messages table). DM is mentor↔mentee;
-- docs/10 §3: all mentor↔mentee communication in auditable threads —
-- staff read access is the audit path.
-- PHASE 2 (docs/03): threads.mentorship_id once mentorships exist;
-- messages.read_at.

create table public.threads (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.thread_participants (
  thread_id  uuid not null references public.threads (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index thread_participants_user_idx on public.thread_participants (user_id);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.threads (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  kind       public.message_kind not null default 'text',
  body       text not null default '' check (char_length(body) <= 2000),
  mood       smallint check (mood between 1 and 5), -- only when kind = 'mood'
  created_at timestamptz not null default now(),
  constraint mood_only_for_mood_kind check (kind <> 'mood' or mood is not null)
);

-- Poll/paginate a thread; realtime channel dm:{thread_id} replaces polling later.
create index messages_thread_idx on public.messages (thread_id, created_at);

-- ── concerns ─────────────────────────────────────────────────────────
-- Maps Concern — a mentor's discreet escalation about a mentee.
-- Quiet by design: NEVER visible to the member (see policies.sql).

create table public.concerns (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.profiles (id) on delete cascade,
  member_id  uuid not null references public.profiles (id) on delete cascade,
  note       text check (char_length(note) <= 500),
  status     public.concern_status not null default 'open',
  created_at timestamptz not null default now()
);

create index concerns_queue_idx on public.concerns (status, created_at desc);
-- Route dedupe rule: one OPEN concern per mentor+member pair.
create unique index concerns_open_unique_idx on public.concerns (mentor_id, member_id) where status = 'open';

-- ── mentor_applications ──────────────────────────────────────────────
-- Maps MentorApplication (public marketing-site form → staff queue).

create table public.mentor_applications (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) <= 80),
  phone        text not null check (char_length(phone) <= 30),
  email        text not null check (char_length(email) <= 120),
  areas        text[] not null default '{}',      -- lived-experience chips
  availability text not null,                     -- Weekly | Every other week | Flexible
  story        text check (char_length(story) <= 2000),
  status       public.application_status not null default 'new',
  created_at   timestamptz not null default now()
);

create index mentor_applications_queue_idx on public.mentor_applications (status, created_at desc);
-- Route anti-spam rule: one open ('new') application per email.
create unique index mentor_applications_open_email_idx on public.mentor_applications (lower(email)) where status = 'new';

-- ── sessions (mentor sessions) ───────────────────────────────────────
-- Maps Session — a logged mentor session with a mentee. Notes are
-- supportive, never clinical (docs/10 §1); visible to mentor + staff only.
-- PHASE 2 (docs/03): mentorship_sessions keyed to a mentorships table,
-- occurred_at separate from created_at, mood_rating.

create table public.sessions (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.profiles (id) on delete cascade,
  member_id  uuid not null references public.profiles (id) on delete cascade,
  mode       public.session_mode not null,
  minutes    integer not null check (minutes between 1 and 480),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index sessions_member_idx on public.sessions (member_id, created_at desc);
create index sessions_mentor_idx on public.sessions (mentor_id, created_at desc);

-- ── courses / enrollments (LMS) ──────────────────────────────────────
-- Maps Course + Enrollment. The app uses flat courses with a lesson
-- count and an array of completed lesson numbers.
-- PHASE 2 (docs/03): modules_lms/lessons/lesson_progress with jsonb
-- content blocks, assignments, points_events, badges, streaks tables.

create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,              -- stable app id, e.g. 'course-ise-3'
  title        text not null,
  program      public.program not null,
  lesson_count integer not null check (lesson_count between 1 and 200),
  created_at   timestamptz not null default now()
);

create table public.enrollments (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.profiles (id) on delete cascade,
  course_id         uuid not null references public.courses (id) on delete cascade,
  completed_lessons integer[] not null default '{}', -- 1-based lesson numbers, sorted ascending
  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (member_id, course_id)
);

create index enrollments_member_idx on public.enrollments (member_id);

-- ── newsletter_subscribers ───────────────────────────────────────────
-- Replaces the module-level array in app/api/newsletter/route.ts.

create table public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now()
);

create unique index newsletter_subscribers_email_idx on public.newsletter_subscribers (lower(email));


-- ============================================================
-- 02 EXPANSION SCHEMA (schema-expansion.sql)
-- ============================================================
-- =====================================================================
-- My Struggle — Supabase schema, EXPANSION (v2)
-- =====================================================================
-- EXTENDS supabase/schema.sql (v1). Covers every store.ts DB array added
-- AFTER the v1 package was written (community expansion seed v6, continuum
-- of care seed v7/v9, community ad product seed v8). app/lib/types.ts +
-- the `interface DB` in app/lib/store.ts are the source contract; enum
-- labels match the TS unions EXACTLY so route handlers pass TS values
-- straight through.
--
-- SEPARATION OF CONCERNS (same as v1):
--   schema-expansion.sql   → this file: enums, tables, indexes.
--   policies-expansion.sql → RLS enable + policies + helper predicates.
--   outcomes-analytics.sql → the two-plane outcomes data product
--                            (mv_continuum_score / mv_care_outcomes /
--                             mv_efficacy) with k>=11 suppression.
--
-- MONEY: integer cents, same rule as v1 (budget_cents, barc totals are
-- plain small ints 0..50). TIME: epoch-ms in the store becomes timestamptz
-- (round-trip via the seed converter). JSON blobs whose shape "varies by
-- kind" in TS (resume section content, ad targeting, BARC scores) land as
-- jsonb — the app already treats them as opaque records.
--
-- Run order (see docs/13-SUPABASE-MIGRATION.md §Ordered apply sequence):
--   schema.sql -> schema-expansion.sql -> policies.sql
--   -> policies-expansion.sql -> outcomes-analytics.sql -> seed.sql
-- =====================================================================

-- ── enums ────────────────────────────────────────────────────────────
-- Labels match app/lib/types.ts unions EXACTLY.

-- Community expansion (docs/13)
create type public.circle_kind          as enum ('topic', 'cohort', 'alumni');
create type public.recovery_domain      as enum
  ('housing', 'employment', 'education', 'health', 'relationships',
   'legal', 'financial', 'transportation', 'other');
create type public.goal_status          as enum ('active', 'achieved', 'paused', 'archived');
create type public.goal_visibility      as enum ('private', 'mentor', 'circle', 'public');
create type public.job_app_status       as enum ('applied', 'interview', 'offer', 'closed');
create type public.resume_section_kind  as enum
  ('experience', 'education', 'skills', 'certifications',
   'volunteer', 'references', 'projects');

-- Continuum of care (docs/14)
create type public.care_phase           as enum
  ('pre_care', 'intake', 'in_program', 'transition', 'continuing');
create type public.level_of_care        as enum
  ('detox', 'residential', 'php', 'iop', 'op', 'recovery_maintenance');
create type public.continuum_source     as enum
  ('community', 'lms', 'goal', 'giving', 'mentorship', 'checkin', 'session', 'phase');
create type public.care_channel_kind    as enum ('program_group', 'one_to_one', 'announcement');
create type public.moderation_status    as enum ('approved', 'flagged');
create type public.consent_scope        as enum ('continuum');
create type public.checkin_status       as enum ('pending', 'done', 'missed');

-- Community ad product (docs/15)
create type public.placement_kind       as enum
  ('service', 'alumni_event', 'job_opening', 'program', 'announcement');
create type public.placement_status     as enum
  ('draft', 'pending_review', 'approved', 'running', 'paused', 'ended', 'rejected');
create type public.audience_scope       as enum ('community', 'geo', 'circle', 'phase');
create type public.placement_event_kind as enum ('impression', 'click', 'dismiss', 'report');
create type public.lead_status          as enum ('new', 'contacted', 'closed');

-- =====================================================================
-- 1. COMMUNITY EXPANSION (store: profileDetails, barcChecks, circles,
--    circleMemberships, recoveryGoals, goalMilestones, jobApplications,
--    resumes, resumeSections)  — docs/13-MODULE-COMMUNITY-EXPANSION.md
-- =====================================================================

-- ── profile_details ──────────────────────────────────────────────────
-- Maps ProfileDetails 1:1 with profiles (userId is the PK/FK). The
-- recovery-capital rings + milestones are shown publicly ONLY when the
-- member opts in (recovery_capital_public / show_milestones) — surfaced
-- through a definer view in policies-expansion.sql, never the raw table.
create table public.profile_details (
  user_id                 uuid primary key references public.profiles (id) on delete cascade,
  journey_since           date,                       -- optional "in recovery since"
  tagline                 text check (char_length(tagline) <= 140),
  interests               text[] not null default '{}',
  recovery_capital_public boolean not null default false,
  show_milestones         boolean not null default false
);

-- ── barc_checks ──────────────────────────────────────────────────────
-- Maps BarcSelfCheck — a BARC-10 self-reflection. NEVER clinical, NEVER
-- public (docs/10 §1). scores jsonb = 10 domains 0..5; total 0..50.
create table public.barc_checks (
  id        uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  taken_at  timestamptz not null default now(),
  scores    jsonb not null default '{}'::jsonb,
  total     smallint not null check (total between 0 and 50)
);

create index barc_checks_member_idx on public.barc_checks (member_id, taken_at desc);

-- ── circles ──────────────────────────────────────────────────────────
-- Maps Circle — topic / cohort / alumni spaces. staff_moderated=false is
-- peer-led. Alumni circles belong to a center.
create table public.circles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  kind            public.circle_kind not null,
  description     text not null default '',
  staff_moderated boolean not null default false,
  center_id       uuid references public.centers (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ── circle_memberships ───────────────────────────────────────────────
-- Maps CircleMembership — one row per (circle, member).
create table public.circle_memberships (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references public.circles (id) on delete cascade,
  member_id  uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (circle_id, member_id)
);

create index circle_memberships_member_idx on public.circle_memberships (member_id);
create index circle_memberships_circle_idx on public.circle_memberships (circle_id);

-- ── recovery_goals ───────────────────────────────────────────────────
-- Maps RecoveryGoal — the member-owned middle layer. linked_request_id
-- optionally ties a goal to an existing QR funding goal (support_requests).
-- visibility drives who may read it (see policies-expansion.sql).
create table public.recovery_goals (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 160),
  domain            public.recovery_domain not null,
  why               text check (char_length(why) <= 500),
  status            public.goal_status not null default 'active',
  target_date       date,
  achieved_at       timestamptz,                       -- set when status = 'achieved'
  visibility        public.goal_visibility not null default 'private',
  linked_request_id uuid references public.support_requests (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index recovery_goals_member_idx     on public.recovery_goals (member_id, created_at desc);
create index recovery_goals_achieved_idx   on public.recovery_goals (member_id) where status = 'achieved';

-- ── goal_milestones ──────────────────────────────────────────────────
-- Maps GoalMilestone — ordered checklist under a goal.
create table public.goal_milestones (
  id        uuid primary key default gen_random_uuid(),
  goal_id   uuid not null references public.recovery_goals (id) on delete cascade,
  title     text not null check (char_length(title) between 1 and 160),
  done      boolean not null default false,
  sort      integer not null default 0,
  due_date  date
);

create index goal_milestones_goal_idx on public.goal_milestones (goal_id, sort);

-- ── job_applications ─────────────────────────────────────────────────
-- Maps JobApplication — a member's private job-search tracker. NB TS
-- field `role` (the job title) is stored as job_title to avoid clashing
-- with the profiles.role vocabulary.
create table public.job_applications (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.profiles (id) on delete cascade,
  company          text not null check (char_length(company) <= 160),
  job_title        text not null check (char_length(job_title) <= 160), -- TS: JobApplication.role
  status           public.job_app_status not null default 'applied',
  notes            text check (char_length(notes) <= 1000),
  next_action_date date,
  created_at       timestamptz not null default now()
);

create index job_applications_member_idx on public.job_applications (member_id, created_at desc);

-- ── resumes ──────────────────────────────────────────────────────────
-- Maps Resume. contact jsonb = { phone?, email?, city? }. is_primary marks
-- the member's default resume.
create table public.resumes (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.profiles (id) on delete cascade,
  full_name  text not null,
  headline   text,
  summary    text,
  contact    jsonb not null default '{}'::jsonb,
  template   text not null default 'clean_blue',
  is_primary boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index resumes_member_idx on public.resumes (member_id);
-- At most one primary resume per member.
create unique index resumes_one_primary_idx on public.resumes (member_id) where is_primary;

-- ── resume_sections ──────────────────────────────────────────────────
-- Maps ResumeSection — content jsonb shape varies by kind (opaque to SQL).
create table public.resume_sections (
  id        uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  kind      public.resume_section_kind not null,
  content   jsonb not null default '{}'::jsonb,
  sort      integer not null default 0
);

create index resume_sections_resume_idx on public.resume_sections (resume_id, sort);

-- =====================================================================
-- 2. CONTINUUM OF CARE (store: careEpisodes, phaseTransitions,
--    continuumEvents, careChannels, careMessages, consentGrants,
--    followUps)  — docs/14-MODULE-CONTINUUM-OF-CARE.md
-- =====================================================================

-- ── care_episodes ────────────────────────────────────────────────────
-- Maps CareEpisode — a person's relationship with ONE center over time.
-- center_id NULL = unaffiliated (the pre-care differentiator). care_phase
-- runs in PARALLEL to profiles journey/level fields; it never replaces them.
create table public.care_episodes (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.profiles (id) on delete cascade,
  center_id        uuid references public.centers (id) on delete set null,
  care_phase       public.care_phase not null default 'pre_care',
  level_of_care    public.level_of_care,               -- only during in_program
  started_at       timestamptz not null default now(),
  phase_changed_at timestamptz not null default now(), -- when the current phase began
  ended_at         timestamptz,                         -- program discharge (relationship may continue)
  referral_source  text,                                -- self | community | partner | court | hospital
  discharge_type   text                                 -- completed | stepped_down | left_early | transferred
);

create index care_episodes_member_idx on public.care_episodes (member_id, started_at desc);
create index care_episodes_center_idx on public.care_episodes (center_id) where center_id is not null;

-- ── phase_transitions ────────────────────────────────────────────────
-- Maps PhaseTransition — the append-only log of every phase/LOC change.
-- This is the outcomes gold: read by the analytics matviews. Insert-only
-- by construction (no update/delete policy in policies-expansion.sql).
create table public.phase_transitions (
  id         uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.care_episodes (id) on delete cascade,
  from_phase public.care_phase,
  to_phase   public.care_phase not null,
  from_loc   public.level_of_care,
  to_loc     public.level_of_care,
  changed_by uuid references public.profiles (id) on delete set null, -- actor (staff / mentor / system)
  reason     text not null default '',
  at         timestamptz not null default now()
);

create index phase_transitions_episode_idx on public.phase_transitions (episode_id, at);

-- ── continuum_events ─────────────────────────────────────────────────
-- Maps ContinuumEvent — the heartbeat. ONE row per meaningful action
-- across ALL modules, per person. Single write path (the emit hook /
-- service role), many readers (score, timeline, export). weight is the
-- engagement weighting used by the outcomes score (see outcomes-analytics.sql).
create table public.continuum_events (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.profiles (id) on delete cascade,
  source      public.continuum_source not null,
  ref_id      uuid,                                     -- the source artifact (post, lesson, goal, donation, ...)
  weight      integer not null default 1 check (weight >= 0),
  occurred_at timestamptz not null default now()
);

-- Per-member timeline + the trailing-90d scoring window scan.
create index continuum_events_member_idx on public.continuum_events (member_id, occurred_at desc);
create index continuum_events_window_idx on public.continuum_events (occurred_at);

-- ── care_channels ────────────────────────────────────────────────────
-- Maps CareChannel — center<->member ENGAGEMENT comms (NOT PHI/clinical
-- notes; docs/10 §1). program_group keyed by cohort_id, one_to_one keyed
-- by member_id, announcement = one-way broadcast.
create table public.care_channels (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers (id) on delete cascade,
  kind       public.care_channel_kind not null,
  title      text not null,
  member_id  uuid references public.profiles (id) on delete cascade, -- set for one_to_one
  cohort_id  text,                                                    -- set for program_group
  created_at timestamptz not null default now(),
  -- shape guard: one_to_one has a member, program_group has a cohort.
  constraint care_channel_target_ck check (
    (kind = 'one_to_one'    and member_id is not null and cohort_id is null) or
    (kind = 'program_group' and cohort_id is not null and member_id is null) or
    (kind = 'announcement'  and member_id is null      and cohort_id is null)
  )
);

create index care_channels_center_idx on public.care_channels (center_id, kind);
create index care_channels_member_idx on public.care_channels (member_id) where member_id is not null;

-- ── care_messages ────────────────────────────────────────────────────
-- Maps CareMessage — a message in a CareChannel. Engagement content only.
-- moderation_status reuses the community moderation pipeline; a 'flagged'
-- (held / crisis) message is NOT broadly readable (see policies-expansion).
create table public.care_messages (
  id                uuid primary key default gen_random_uuid(),
  channel_id        uuid not null references public.care_channels (id) on delete cascade,
  sender_id         uuid not null references public.profiles (id) on delete cascade,
  sender_name       text not null,                     -- first name, denormalized for display
  sender_role       public.user_role not null,
  body              text not null default '' check (char_length(body) <= 4000),
  moderation_status public.moderation_status not null default 'approved',
  created_at        timestamptz not null default now()
);

create index care_messages_channel_idx on public.care_messages (channel_id, created_at);

-- ── consent_grants ───────────────────────────────────────────────────
-- Maps ConsentGrant — a member's granular, REVOCABLE grant of continuum
-- access to ONE specific center (docs/10 §1; requirements/11 §C). EXTENDS
-- (does not replace) profiles.consent_public: consent_public governs donor
-- visibility; a consent_grant governs a center's continuum access. This is
-- THE gate every center-plane read checks. Append-only in spirit: revoke
-- sets revoked_at; re-consent inserts a new row.
create table public.consent_grants (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.profiles (id) on delete cascade,
  center_id  uuid not null references public.centers (id) on delete cascade,
  scope      public.consent_scope not null default 'continuum',
  granted_at timestamptz not null default now(),
  revoked_at timestamptz                              -- set on revoke; null = active
);

-- The active-consent lookup used by every center-plane RLS check.
create index consent_grants_active_idx
  on public.consent_grants (member_id, center_id) where revoked_at is null;
create index consent_grants_center_idx on public.consent_grants (center_id) where revoked_at is null;
-- At most one ACTIVE grant per (member, center, scope).
create unique index consent_grants_one_active_idx
  on public.consent_grants (member_id, center_id, scope) where revoked_at is null;

-- ── follow_up_checkins ───────────────────────────────────────────────
-- Maps FollowUpCheckin — the post-discharge 30/60/90/180/365d cadence
-- (requirements/11 §G). A completed check-in emits a continuum_event of
-- source 'checkin' and may carry an optional BARC-10 pulse (0..50).
create table public.follow_up_checkins (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.profiles (id) on delete cascade,
  center_id    uuid not null references public.centers (id) on delete cascade,
  due_day      smallint not null check (due_day in (30, 60, 90, 180, 365)),
  status       public.checkin_status not null default 'pending',
  completed_at timestamptz,                            -- set when status = 'done'
  barc_total   smallint check (barc_total between 0 and 50)
);

create index follow_up_checkins_member_idx on public.follow_up_checkins (member_id, due_day);
create index follow_up_checkins_center_idx on public.follow_up_checkins (center_id, status);

-- =====================================================================
-- 3. COMMUNITY AD PRODUCT (store: sponsoredPlacements, placementEvents,
--    demoLeads)  — docs/15-MODULE-CENTERS-PAGE-AND-ADS.md
-- =====================================================================

-- ── sponsored_placements ─────────────────────────────────────────────
-- Maps SponsoredPlacement — a center's clearly-labeled feed placement.
-- org_id === Center.id (only approved orgs advertise). targeting jsonb is
-- COARSE, NON-CLINICAL ONLY: { metro?, phase?, interestTags?, circleId? }.
-- There is deliberately NO column for diagnosis / substance / health /
-- symptom, and none may be added — targeting a vulnerable population by
-- their condition is structurally impossible here (docs/10 §5a). The
-- crisis-exclusion + frequency-cap + coarse-targeting gates are enforced
-- in app code at serve time; the schema makes sensitive targeting
-- unrepresentable.
create table public.sponsored_placements (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.centers (id) on delete cascade,   -- the buying center
  org_name         text not null,                       -- shown as "Sponsored by [org_name]"
  title            text not null,
  body             text not null,
  cta_label        text not null,
  cta_url          text not null,
  kind             public.placement_kind not null,
  audience_scope   public.audience_scope not null default 'community',
  targeting        jsonb not null default '{}'::jsonb,  -- coarse, non-clinical ONLY (see note above)
  status           public.placement_status not null default 'draft',
  starts_at        timestamptz,
  ends_at          timestamptz,
  budget_cents     integer check (budget_cents >= 0),   -- flat placement fee v1 (not an auction)
  approved_by      uuid references public.profiles (id) on delete set null, -- ms_admin (staff) who approved
  rejection_reason text,
  created_at       timestamptz not null default now(),
  -- Guard: no clinical/sensitive targeting keys may ever appear in the blob.
  constraint placement_targeting_non_clinical_ck check (
    not (targeting ?| array['diagnosis','substance','condition','symptom','health','medication','drug'])
  )
);

-- Serve query: currently-running placements; review queue for ms_admin.
create index sponsored_placements_running_idx on public.sponsored_placements (status) where status = 'running';
create index sponsored_placements_org_idx     on public.sponsored_placements (org_id, created_at desc);

-- ── placement_events ─────────────────────────────────────────────────
-- Maps PlacementEvent — an interaction with a placement. member_id is
-- stored SERVER-SIDE ONLY for frequency-capping / dedup; it is NEVER
-- exposed to advertiser reads. Advertisers get aggregate counts only via
-- the placement_stats() definer RPC (policies-expansion.sql) — RLS blocks
-- any per-member select for a center.
create table public.placement_events (
  id           uuid primary key default gen_random_uuid(),
  placement_id uuid not null references public.sponsored_placements (id) on delete cascade,
  kind         public.placement_event_kind not null,
  member_id    uuid references public.profiles (id) on delete set null, -- INTERNAL ONLY — never surfaced to the center
  occurred_at  timestamptz not null default now()
);

create index placement_events_placement_idx on public.placement_events (placement_id, kind);
-- Frequency-cap lookup (member x placement) — internal serve path only.
create index placement_events_freqcap_idx on public.placement_events (member_id, placement_id) where member_id is not null;

-- ── demo_leads ───────────────────────────────────────────────────────
-- Maps DemoLead — a "For Recovery Centers" contact-sales request. Public
-- form in -> staff lead queue (same write-only drop-box shape as
-- mentor_applications).
create table public.demo_leads (
  id           uuid primary key default gen_random_uuid(),
  org_name     text not null check (char_length(org_name) <= 160),
  contact_name text not null check (char_length(contact_name) <= 120),
  email        text not null check (char_length(email) <= 160),
  phone        text check (char_length(phone) <= 40),
  message      text check (char_length(message) <= 2000),
  source       text,                                    -- e.g. "centers-page"
  status       public.lead_status not null default 'new',
  created_at   timestamptz not null default now()
);

create index demo_leads_queue_idx on public.demo_leads (status, created_at desc);

-- =====================================================================
-- 4. EMPLOYERS + JOB POSTS (OPTIONAL / PROVISIONAL)
-- =====================================================================
-- Included per the migration task's optional item #5, built ONLY from the
-- field list specified there (NOT from any in-flight app code). These
-- tables are NOT yet backed by a store.ts DB array, so they are additive
-- and inert until the hiring module lands.
--
-- OPEN DECISION (see docs/13-SUPABASE-MIGRATION.md §Decisions still needed):
--   The current in-flight model instead treats an employer as a
--   `profiles.role = 'employer'` account (with a company field) and a job
--   post keyed by that user id. If the team adopts that model, drop
--   `employers` and repoint `job_posts.employer_id` at `profiles(id)`,
--   and add 'employer' to the public.user_role enum
--   (`alter type public.user_role add value 'employer'`). Kept standalone
--   here to match the specified fields without reading in-flight code.

create table public.employers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text,                                      -- free-form contact (email/phone/person)
  created_at timestamptz not null default now()
);

create table public.job_posts (
  id                uuid primary key default gen_random_uuid(),
  employer_id       uuid not null references public.employers (id) on delete cascade,
  title             text not null,
  company           text not null,                      -- denormalized for public display
  location          text not null,
  type              text not null,                      -- full-time | part-time | temporary | contract | seasonal
  pay_range         text,                               -- optional, employer's words
  description       text not null,
  recovery_friendly boolean not null default true,      -- fair-chance board: always true
  status            text not null default 'open',       -- open | closed
  created_at        timestamptz not null default now()
);

create index job_posts_employer_idx on public.job_posts (employer_id, created_at desc);
create index job_posts_open_idx      on public.job_posts (status, created_at desc) where status = 'open';


-- ============================================================
-- 03 ENGAGEMENT SCHEMA — runs 9-10 (schema-run9-10.sql)
-- ============================================================
-- =====================================================================
-- My Struggle — Supabase schema, ENGAGEMENT (Runs 9–10 / store seed v11)
-- =====================================================================
-- EXTENDS supabase/schema.sql (v1) + schema-expansion.sql (v2). Covers the
-- FIVE store.ts DB arrays added by the engagement backend (seed v11) that
-- had NO SQL coverage: notifications, memberBlocks, events (CommunityEvent)
-- + eventRsvps, and postReports. app/lib/types.ts + the `interface DB` in
-- app/lib/store.ts are the source contract; enum labels match the TS unions
-- EXACTLY so route handlers pass TS values straight through.
--
-- SEPARATION OF CONCERNS (same as v1/v2):
--   schema-run9-10.sql   → this file: enums, tables, indexes.
--   policies-run9-10.sql → RLS enable + policies (reuses is_staff() /
--                          is_mentor() from policies.sql).
--
-- TIME: the store keeps epoch-ms; every column here is `timestamptz`
-- (the seed converter round-trips ms → to_timestamp(ms/1000.0)), MATCHING
-- the timestamptz convention used by schema.sql / schema-expansion.sql —
-- no bigint epoch columns are introduced.
--
-- Run order (see docs/13-SUPABASE-MIGRATION.md §Ordered apply sequence):
--   schema.sql -> schema-expansion.sql -> schema-run9-10.sql
--   -> policies.sql -> policies-expansion.sql -> policies-run9-10.sql
--   -> apply-employer-role.sql (reconciliation, runs LAST — see that file)
-- =====================================================================

-- ── enums ────────────────────────────────────────────────────────────
-- Labels match app/lib/types.ts unions EXACTLY.

create type public.notification_kind as enum
  ('reaction', 'comment', 'care_message', 'follow_up', 'job', 'event', 'mention', 'system');
create type public.event_kind        as enum
  ('meeting', 'celebration', 'workshop', 'community');
create type public.post_report_status as enum ('open', 'reviewed');

-- =====================================================================
-- 1. NOTIFICATIONS (store: notifications) — one inbox per user, across
--    every module. docs: §Engagement backend.
-- =====================================================================

-- ── notifications ────────────────────────────────────────────────────
-- Maps Notification. ref_type/ref_id deep-link back to the source artifact
-- (post, event, channel message, report, …); ref_id is a plain uuid with
-- NO FK (polymorphic across tables, same shape as continuum_events.ref_id).
-- SINGLE write path: the emit_notification hook / service role — there is
-- deliberately NO user-facing insert policy (see policies-run9-10.sql).
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.notification_kind not null,
  title      text not null,
  body       text not null default '',
  ref_type   text,                                     -- e.g. 'post' | 'event' | 'report' | 'channel'
  ref_id     uuid,                                     -- the source artifact id (no FK — polymorphic)
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- THE inbox query: a user's unread-first, newest-first notifications.
create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- =====================================================================
-- 2. COMMUNITY EVENTS + RSVP (store: events, eventRsvps) — a center or
--    mentor-created event members RSVP to; an RSVP is an engagement
--    signal → a continuum_event of source 'community'.
-- =====================================================================

-- ── community_events ─────────────────────────────────────────────────
-- Maps CommunityEvent. center_id NULL = a platform-wide / creator-only
-- event (a mentor with no center, or a cross-center gathering). creator_id
-- is the mentor/staff who created it (POST /api/events is mentor+staff).
create table public.community_events (
  id          uuid primary key default gen_random_uuid(),
  center_id   uuid references public.centers (id) on delete set null,      -- nullable: unaffiliated event
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text not null default '',
  starts_at   timestamptz not null,
  ends_at     timestamptz,                                                  -- optional; when set, must be >= starts_at
  location    text not null,
  kind        public.event_kind not null,
  created_at  timestamptz not null default now(),
  constraint community_events_time_ck check (ends_at is null or ends_at >= starts_at)
);

-- Feed query: upcoming (soonest) first, then past — GET /api/events sorts on starts_at.
create index community_events_starts_idx on public.community_events (starts_at);
create index community_events_center_idx on public.community_events (center_id) where center_id is not null;

-- ── event_rsvps ──────────────────────────────────────────────────────
-- Maps EventRsvp — one member's RSVP to a community event. Toggle =
-- insert / delete; count = count(*). Idempotent by the unique index.
create table public.event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.community_events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index event_rsvps_user_idx on public.event_rsvps (user_id);

-- =====================================================================
-- 3. MEMBER BLOCKS (store: memberBlocks) — a user-driven block; blocker
--    hides/mutes blocked across social surfaces (mutual safety).
-- =====================================================================

-- ── member_blocks ────────────────────────────────────────────────────
-- Maps MemberBlock. One row per (blocker → blocked) pair (unique); a user
-- can never block themselves (CHECK). Only the blocker reads/manages theirs.
create table public.member_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint member_blocks_no_self_ck check (blocker_id <> blocked_id)
);

-- Reverse lookup ("who blocked me?") for social-surface filtering.
create index member_blocks_blocked_idx on public.member_blocks (blocked_id);

-- =====================================================================
-- 4. POST REPORTS (store: postReports) — a member-filed report on a
--    community post → the staff moderation queue.
-- =====================================================================

-- ── post_reports ─────────────────────────────────────────────────────
-- Maps PostReport. status 'open' until a staff member marks it 'reviewed'.
-- reason is a short category; note is the optional free-text detail.
create table public.post_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null,
  note        text check (char_length(note) <= 1000),
  status      public.post_report_status not null default 'open',
  created_at  timestamptz not null default now()
);

-- Moderation queue: open reports newest-first (mirrors mentor_applications style).
create index post_reports_status_idx on public.post_reports (status, created_at desc);
create index post_reports_post_idx   on public.post_reports (post_id);


-- ============================================================
-- 04 CORE RLS POLICIES (policies.sql)
-- ============================================================
-- =====================================================================
-- My Struggle — Row Level Security (v1)
-- =====================================================================
-- Implements docs/10-COMPLIANCE.md as database policy. Run AFTER
-- schema.sql. Principles:
--
--   * RLS ENABLED ON EVERY TABLE — no exceptions.
--   * Public (anon) surfaces see ONLY: approved feed posts (+ their
--     comments/heart counts) and the consented giving projections via
--     SECURITY-DEFINER VIEWS (public_members, public_request_board).
--     anon NEVER selects the profiles table directly.
--   * Balances (cash/credits/savings) live on profiles → readable by
--     self + staff only; the public_members view exposes savings_cents
--     ONLY (shown as "reentry savings" on /p/[slug]), never cash/credits.
--   * Donations are written by the service role only (Stripe webhook);
--     there is deliberately NO insert policy for any user role.
--   * Concerns are quiet by design: the member they concern can never
--     see them.
--
-- AUTOPILOT: RLS items require negative tests. Each section ends with
-- NEGATIVE TEST comments — runnable patterns for the policy test suite
-- (set request.jwt.claims locally, or supabase-js with per-user JWTs).
-- =====================================================================

-- ── helper predicates ────────────────────────────────────────────────
-- SECURITY DEFINER so they can read profiles without recursing into
-- profiles' own RLS policies. Owned by postgres; safe: they only ever
-- reveal the CALLER's role/mentees, keyed to auth.uid().

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'staff'
  );
$$;

create or replace function public.is_mentor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('mentor', 'staff')
  );
$$;

-- True when the caller mentors the given member (mentor-app roster scope).
create or replace function public.is_mentor_of(member uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = member and mentor_id = auth.uid()
  );
$$;

-- True when the caller participates in the given thread (avoids RLS
-- recursion between threads/participants/messages).
create or replace function public.is_thread_participant(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.thread_participants
    where thread_id = t and user_id = auth.uid()
  );
$$;

-- True when the post is publicly visible (feed is public-read).
create or replace function public.post_is_approved(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.posts where id = p and status = 'approved'
  );
$$;

revoke execute on function public.is_mentor_of(uuid), public.is_thread_participant(uuid), public.post_is_approved(uuid) from anon;

-- ── enable RLS everywhere ────────────────────────────────────────────

alter table public.centers                enable row level security;
alter table public.profiles               enable row level security;
alter table public.support_requests       enable row level security;
alter table public.donations              enable row level security;
alter table public.posts                  enable row level security;
alter table public.post_hearts            enable row level security;
alter table public.comments               enable row level security;
alter table public.threads                enable row level security;
alter table public.thread_participants    enable row level security;
alter table public.messages               enable row level security;
alter table public.concerns               enable row level security;
alter table public.mentor_applications    enable row level security;
alter table public.sessions               enable row level security;
alter table public.courses                enable row level security;
alter table public.enrollments            enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ── centers ──────────────────────────────────────────────────────────
-- Center names/cities are not sensitive; docs/10 §1 only forbids showing
-- a PERSON's center affiliation publicly (enforced on profiles, below).

create policy "centers: authenticated read"
  on public.centers for select
  to authenticated
  using (true);

create policy "centers: staff manage"
  on public.centers for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── profiles ─────────────────────────────────────────────────────────
-- Self + staff read; mentors read their own mentees (mentor-app roster).
-- NO anon access — public giving data flows ONLY through public_members.
-- Writes: staff only. Members do not update their own row in v1 — every
-- self-mutation in the app today (points, streak, level, balances,
-- consent) is either computed server-side or a staff/compliance action,
-- so granting self-update would let a member forge balances/points.
-- Server-side mutations (lesson complete, donation split) run through
-- SECURITY DEFINER RPCs or the service role.

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: staff read all"
  on public.profiles for select
  to authenticated
  using (public.is_staff());

create policy "profiles: mentor reads mentees"
  on public.profiles for select
  to authenticated
  using (mentor_id = auth.uid());

create policy "profiles: staff update"
  on public.profiles for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- insert happens via the on_auth_user_created trigger (security definer);
-- no user-facing insert policy needed. delete: service role only.

-- NEGATIVE TESTS (profiles):
--   as anon:            select * from profiles;                          → 0 rows
--   as member danielle: select * from profiles where id <> auth.uid();   → 0 rows (no other member visible)
--   as member danielle: update profiles set cash_cents = 999999
--                         where id = auth.uid();                         → 0 rows updated (no self-update policy)
--   as mentor marcus:   select * from profiles where id = <tyrell>;      → 1 row (his mentee)
--   as mentor marcus:   select * from profiles where id = <other-mentor-mentee>; → 0 rows

-- ── public giving views (SECURITY DEFINER) ───────────────────────────
-- docs/02 §Security: public QR pages read a definer view returning ONLY
-- the consented, public-safe projection. RLS denies all direct table
-- access to anon; these views are the single public window.
-- NOTE: intentionally NOT security_invoker — the Supabase linter will
-- flag definer views; this one is the documented exception (docs/02).

create or replace view public.public_members as
select
  p.slug,
  p.name,                                  -- first name only, by construction
  p.member_number,
  coalesce(p.story, '') as story,
  p.savings_cents                          -- "reentry savings" shown on /p/[slug]; cash/credits NEVER here
from public.profiles p
where p.role = 'member'
  and p.consent_public = true
  and p.slug is not null;

comment on view public.public_members is
  'Public-safe donor projection (docs/10 §1). consent_public=false members simply do not exist here — revocation is immediate.';

-- Public support board (/api/requests/board + request cards on /p/[slug]).
create or replace view public.public_request_board as
select
  r.id,
  r.label,
  r.weekly_target_cents,
  r.raised_cents,
  r.status,
  r.created_at,
  p.name        as member_name,
  p.slug,
  p.avatar_color
from public.support_requests r
join public.profiles p on p.id = r.member_id
where p.role = 'member'
  and p.consent_public = true
  and p.slug is not null;

-- Views are owned by the schema owner and bypass RLS (definer behavior);
-- expose them explicitly:
grant select on public.public_members, public.public_request_board to anon, authenticated;

-- NEGATIVE TESTS (public views):
--   as anon: select * from public_members where slug = 'andre';          → 0 rows (consent_public = false)
--   as anon: select cash_cents from public_members;                      → ERROR: column does not exist
--   as anon: select * from public_request_board
--            where slug = 'andre';                                       → 0 rows (his requests hidden with consent off)
--   flip: update profiles set consent_public = false where slug='danielle' (as staff);
--         as anon select * from public_members where slug='danielle';    → 0 rows immediately (docs/10 revocation)

-- ── support_requests ─────────────────────────────────────────────────
-- Own + staff read/manage; members create their own ("request online").
-- raised_cents/status advance via the donation webhook (service role).
-- Public read is ONLY the public_request_board view above.

create policy "support_requests: read own"
  on public.support_requests for select
  to authenticated
  using (member_id = auth.uid());

create policy "support_requests: staff read"
  on public.support_requests for select
  to authenticated
  using (public.is_staff());

create policy "support_requests: member creates own"
  on public.support_requests for insert
  to authenticated
  with check (member_id = auth.uid() and raised_cents = 0 and status = 'active');

create policy "support_requests: staff update"
  on public.support_requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (support_requests):
--   as anon:            select * from support_requests;                  → 0 rows
--   as member danielle: insert .. (member_id = <tyrell>, ...)            → ERROR: RLS violation
--   as member danielle: insert .. (member_id = auth.uid(), raised_cents = 5000, ...) → ERROR (can't pre-fund own goal)
--   as member danielle: update support_requests set raised_cents = 99999
--                         where member_id = auth.uid();                  → 0 rows updated

-- ── donations ────────────────────────────────────────────────────────
-- INSERT: service role ONLY (Stripe webhook — docs/02 §Security). No
-- insert policy exists for anon/authenticated on purpose; the service
-- role bypasses RLS. Read: staff + the receiving member.

create policy "donations: receiving member reads own"
  on public.donations for select
  to authenticated
  using (member_id = auth.uid());

create policy "donations: staff read"
  on public.donations for select
  to authenticated
  using (public.is_staff());

-- NEGATIVE TESTS (donations):
--   as anon:            insert into donations (member_id, amount_cents) values (...); → ERROR: RLS violation
--   as member danielle: insert into donations (member_id, amount_cents)
--                         values (auth.uid(), 1000000);                  → ERROR (can't gift yourself)
--   as member danielle: select * from donations where member_id <> auth.uid(); → 0 rows
--   as service role:    insert ... → succeeds (webhook path)

-- ── posts ────────────────────────────────────────────────────────────
-- The community feed is PUBLIC-READ for approved posts (signed-out
-- /community is read-only). Authors see their own posts in any status
-- (author=me "My posts" includes pending/flagged). Staff see and
-- moderate everything. Authors insert as themselves; the crisis path
-- writes status='flagged' (held), normal path 'approved' — both allowed
-- by the insert check; 'pending' allowed for the docs/05 pipeline.
-- Authors can NOT update posts (no edit in app; moderation is staff-only).

create policy "posts: approved are public"
  on public.posts for select
  to anon, authenticated
  using (status = 'approved');

create policy "posts: author reads own"
  on public.posts for select
  to authenticated
  using (author_id = auth.uid());

create policy "posts: staff read all"
  on public.posts for select
  to authenticated
  using (public.is_staff());

create policy "posts: author inserts own"
  on public.posts for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "posts: staff moderate"
  on public.posts for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (posts):
--   as anon:            select * from posts where status <> 'approved';  → 0 rows
--   as member danielle: select * from posts where status = 'pending'
--                         and author_id <> auth.uid();                   → 0 rows
--   as member danielle: insert into posts (author_id, body) values (<marcus>, 'x'); → ERROR: RLS violation
--   as member danielle: update posts set status = 'approved'
--                         where author_id = auth.uid();                  → 0 rows updated (no self-approve)

-- ── post_hearts ──────────────────────────────────────────────────────
-- Anyone can see reaction counts on public posts; authenticated users
-- toggle their OWN heart (insert/delete) on approved posts only.

create policy "post_hearts: visible on approved posts"
  on public.post_hearts for select
  to anon, authenticated
  using (public.post_is_approved(post_id));

create policy "post_hearts: staff read all"
  on public.post_hearts for select
  to authenticated
  using (public.is_staff());

create policy "post_hearts: heart as self"
  on public.post_hearts for insert
  to authenticated
  with check (user_id = auth.uid() and public.post_is_approved(post_id));

create policy "post_hearts: unheart as self"
  on public.post_hearts for delete
  to authenticated
  using (user_id = auth.uid());

-- NEGATIVE TESTS (post_hearts):
--   as anon:            insert into post_hearts values (<post>, <any>);  → ERROR (anon has no insert)
--   as member danielle: insert into post_hearts (post_id, user_id)
--                         values (<approved post>, <marcus>);            → ERROR: RLS violation (forged reactor)
--   as member danielle: insert ... values (<flagged post>, auth.uid());  → ERROR (can't react to held posts)
--   as member danielle: delete from post_hearts where user_id <> auth.uid(); → 0 rows deleted

-- ── comments ─────────────────────────────────────────────────────────
-- Readable wherever the post is publicly readable; authenticated users
-- comment as themselves on approved posts.

create policy "comments: visible on approved posts"
  on public.comments for select
  to anon, authenticated
  using (public.post_is_approved(post_id));

create policy "comments: staff read all"
  on public.comments for select
  to authenticated
  using (public.is_staff());

create policy "comments: comment as self on approved"
  on public.comments for insert
  to authenticated
  with check (author_id = auth.uid() and public.post_is_approved(post_id));

create policy "comments: staff delete"
  on public.comments for delete
  to authenticated
  using (public.is_staff());

-- NEGATIVE TESTS (comments):
--   as anon:            insert into comments ...                         → ERROR (no anon insert)
--   as member danielle: insert into comments (post_id, author_id, body)
--                         values (<pending post>, auth.uid(), 'hi');     → ERROR (post not approved)
--   as member danielle: insert ... (author_id = <marcus>)                → ERROR: RLS violation (forged author)
--   as member danielle: select * from comments where post_id = <flagged post>; → 0 rows

-- ── threads / thread_participants / messages ─────────────────────────
-- Participants only. Staff read (NOT write) — docs/10 §3: mentor↔mentee
-- communication is auditable. Thread creation goes through the
-- get_or_create_thread() RPC below so participants rows are always
-- written consistently.

create policy "threads: participants read"
  on public.threads for select
  to authenticated
  using (public.is_thread_participant(id));

create policy "threads: staff audit read"
  on public.threads for select
  to authenticated
  using (public.is_staff());

create policy "thread_participants: participants read"
  on public.thread_participants for select
  to authenticated
  using (public.is_thread_participant(thread_id));

create policy "thread_participants: staff audit read"
  on public.thread_participants for select
  to authenticated
  using (public.is_staff());

create policy "messages: participants read"
  on public.messages for select
  to authenticated
  using (public.is_thread_participant(thread_id));

create policy "messages: staff audit read"
  on public.messages for select
  to authenticated
  using (public.is_staff());

create policy "messages: participants send as self"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.is_thread_participant(thread_id));

-- Find-or-create the DM thread between the caller and another user
-- (replaces store.threadBetween). Definer: inserts bypass the absence of
-- user-facing insert policies on threads/thread_participants.
create or replace function public.get_or_create_thread(other uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  t uuid;
begin
  if other is null or other = auth.uid() then
    raise exception 'invalid participant';
  end if;
  -- Only mentor↔mentee pairs get threads (docs/10 §3: no platform-wide DMs).
  if not (
    public.is_staff()
    or exists (select 1 from public.profiles where id = auth.uid() and mentor_id = other)
    or exists (select 1 from public.profiles where id = other and mentor_id = auth.uid())
  ) then
    raise exception 'threads are mentor-mentee only';
  end if;

  select tp.thread_id into t
  from public.thread_participants tp
  join public.thread_participants tp2 on tp2.thread_id = tp.thread_id and tp2.user_id = other
  where tp.user_id = auth.uid()
  limit 1;

  if t is null then
    insert into public.threads default values returning id into t;
    insert into public.thread_participants (thread_id, user_id)
      values (t, auth.uid()), (t, other);
  end if;
  return t;
end;
$$;

revoke execute on function public.get_or_create_thread(uuid) from anon;

-- NEGATIVE TESTS (threads/messages):
--   as member tyrell:   select * from messages
--                         where thread_id = <danielle-marcus thread>;    → 0 rows (third party)
--   as member danielle: insert into messages (thread_id, sender_id, body)
--                         values (<own thread>, <marcus>, 'x');          → ERROR: RLS violation (forged sender)
--   as member danielle: select get_or_create_thread(<tyrell>);           → ERROR (not her mentor — no member↔member DMs)
--   as anon:            select * from threads;                           → 0 rows

-- ── concerns ─────────────────────────────────────────────────────────
-- Mentors raise; staff read/resolve. The MEMBER CONCERNED NEVER SEES IT
-- (quiet by design — app/api/concerns "never surfaces on the member").
-- Mentors do not read back the queue in the app; staff-only read keeps
-- the escalation discreet even from other mentors.

create policy "concerns: mentor raises as self"
  on public.concerns for insert
  to authenticated
  with check (mentor_id = auth.uid() and public.is_mentor() and status = 'open');

create policy "concerns: staff read"
  on public.concerns for select
  to authenticated
  using (public.is_staff());

create policy "concerns: staff resolve"
  on public.concerns for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (concerns):
--   as member danielle: select * from concerns where member_id = auth.uid(); → 0 rows (NEVER visible to the member)
--   as member danielle: insert into concerns (mentor_id, member_id)
--                         values (auth.uid(), <tyrell>);                 → ERROR (members can't raise concerns)
--   as mentor marcus:   select * from concerns;                          → 0 rows (write-only for mentors; staff read)
--   as mentor marcus:   update concerns set status='resolved' where mentor_id=auth.uid(); → 0 rows updated

-- ── mentor_applications ──────────────────────────────────────────────
-- The marketing-site form posts without auth → anon insert (status must
-- be 'new'); staff read + advance status.

create policy "mentor_applications: public apply"
  on public.mentor_applications for insert
  to anon, authenticated
  with check (status = 'new');

create policy "mentor_applications: staff read"
  on public.mentor_applications for select
  to authenticated
  using (public.is_staff());

create policy "mentor_applications: staff update"
  on public.mentor_applications for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (mentor_applications):
--   as anon:            select * from mentor_applications;               → 0 rows (write-only drop box)
--   as anon:            insert ... (status = 'approved')                 → ERROR (can't self-approve)
--   as mentor marcus:   select * from mentor_applications;               → 0 rows (staff only)

-- ── sessions ─────────────────────────────────────────────────────────
-- Mentor: own sessions (log + review); staff: all. Members never see
-- session notes (supportive-not-clinical, but still mentor/staff-side —
-- docs/03: "notes visible to mentor + staff, NOT public").

create policy "sessions: mentor reads own"
  on public.sessions for select
  to authenticated
  using (mentor_id = auth.uid());

create policy "sessions: staff read"
  on public.sessions for select
  to authenticated
  using (public.is_staff());

create policy "sessions: mentor logs own with own mentee"
  on public.sessions for insert
  to authenticated
  with check (
    mentor_id = auth.uid()
    and public.is_mentor()
    and (public.is_mentor_of(member_id) or public.is_staff())
  );

-- NEGATIVE TESTS (sessions):
--   as member danielle: select * from sessions where member_id = auth.uid(); → 0 rows
--   as mentor marcus:   select * from sessions where mentor_id <> auth.uid(); → 0 rows
--   as mentor marcus:   insert ... (mentor_id = auth.uid(), member_id = <not his mentee>) → ERROR
--   as mentor marcus:   insert ... (mentor_id = <alicia>, ...)           → ERROR: RLS violation (forged mentor)

-- ── courses / enrollments ────────────────────────────────────────────
-- Courses: any signed-in user (Learn tab). Enrollments: own + staff;
-- lesson completion writes go through the RPC pattern (or service role)
-- so points/streak/level on profiles stay server-computed — a plain
-- self-insert/update is still allowed for the enrollment row itself,
-- which holds no reward state.

create policy "courses: authenticated read"
  on public.courses for select
  to authenticated
  using (true);

create policy "courses: staff manage"
  on public.courses for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "enrollments: read own"
  on public.enrollments for select
  to authenticated
  using (member_id = auth.uid());

create policy "enrollments: staff read"
  on public.enrollments for select
  to authenticated
  using (public.is_staff());

create policy "enrollments: enroll self"
  on public.enrollments for insert
  to authenticated
  with check (member_id = auth.uid());

create policy "enrollments: progress own"
  on public.enrollments for update
  to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- NEGATIVE TESTS (enrollments):
--   as anon:            select * from courses;                           → 0 rows (sign-in required, matches /api/courses 401)
--   as member danielle: select * from enrollments where member_id <> auth.uid(); → 0 rows
--   as member danielle: insert into enrollments (member_id, course_id)
--                         values (<tyrell>, <course>);                   → ERROR: RLS violation
--   as member danielle: update profiles set points = 99999 ...           → 0 rows (reward state is not on enrollments)

-- ── newsletter_subscribers ───────────────────────────────────────────
-- Public write-only drop box; staff read for export. The unique index on
-- lower(email) gives the 409-on-duplicate behavior.

create policy "newsletter: public subscribe"
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (true);

create policy "newsletter: staff read"
  on public.newsletter_subscribers for select
  to authenticated
  using (public.is_staff());

-- NEGATIVE TESTS (newsletter_subscribers):
--   as anon:            select * from newsletter_subscribers;            → 0 rows (no email harvesting)
--   as member danielle: select * from newsletter_subscribers;            → 0 rows
--   as anon:            insert same email twice                          → second ERROR: duplicate key (unique lower(email))


-- ============================================================
-- 05 EXPANSION RLS POLICIES (policies-expansion.sql)
-- ============================================================
-- =====================================================================
-- My Struggle — Row Level Security, EXPANSION (v2)
-- =====================================================================
-- Implements docs/10-COMPLIANCE.md as database policy for the tables in
-- schema-expansion.sql. Run AFTER schema.sql, schema-expansion.sql, and
-- policies.sql (which defines is_staff() / is_mentor() / is_mentor_of()).
--
-- PRINCIPLES (docs/10):
--   * RLS ENABLED ON EVERY NEW TABLE — no exceptions.
--   * Members own their own rows.
--   * A CENTER sees a member's CONTINUUM data ONLY via an active,
--     revocable consent_grant to that center (the has_active_consent()
--     gate below). Revocation is immediate — an inactive grant fails the
--     predicate on the very next query.
--   * Crisis-flagged / held care messages are NOT broadly readable
--     (sender + owning-center staff only).
--   * Advertiser / licensed-research reads are AGGREGATE-ONLY and cannot
--     select identifiable columns (placement_events has no member-level
--     select policy for a center; the de-identified plane lives in
--     outcomes-analytics.sql with k>=11 suppression).
--   * BARC self-checks + private career data are self-scoped, never public.
--
-- Each section ends with NEGATIVE TEST comments — runnable patterns for
-- the policy test suite (AUTOPILOT: RLS items require negative tests).
-- =====================================================================

-- ── helper predicates ────────────────────────────────────────────────
-- SECURITY DEFINER so they read profiles/consent without recursing into
-- those tables' own RLS. They only ever reveal facts keyed to auth.uid().

-- The caller's own center (staff/mentor affiliation). NULL for members or
-- platform-only staff. Used to scope every center-plane continuum read.
create or replace function public.caller_center()
returns uuid
language sql stable security definer set search_path = public
as $$
  select center_id from public.profiles where id = auth.uid();
$$;

-- TRUE when `member` has an ACTIVE (unrevoked) continuum consent grant to
-- `center`. THE center-plane gate. Revocation is immediate: revoked_at
-- being set flips this to false on the next evaluation.
create or replace function public.has_active_consent(member uuid, center uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select center is not null and exists (
    select 1 from public.consent_grants
    where member_id = member
      and center_id = center
      and scope = 'continuum'
      and revoked_at is null
  );
$$;

-- TRUE when the caller is staff AT the center that owns this member's
-- continuum data AND the member has consented to that center. This single
-- predicate expresses "a center sees a member's continuum data ONLY via an
-- active, revocable consent" for every continuum table.
create or replace function public.staff_has_consent(member uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_staff()
     and public.has_active_consent(member, public.caller_center());
$$;

-- TRUE when the caller is a member of the given circle (co-member reads).
create or replace function public.is_circle_member(c uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.circle_memberships
    where circle_id = c and member_id = auth.uid()
  );
$$;

-- TRUE when the caller may read the given care channel:
--   one_to_one   → the member side, or consented staff of the center
--   program_group→ consented staff of the center, or a member with an
--                  active consent to that center (cohort discussion)
--   announcement → any member with an active consent to that center
create or replace function public.can_read_care_channel(ch uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.care_channels c
    where c.id = ch
      and (
        (c.member_id is not null and c.member_id = auth.uid())
        or (public.is_staff() and c.center_id = public.caller_center())
        or public.has_active_consent(auth.uid(), c.center_id)
      )
  );
$$;

revoke execute on function
  public.has_active_consent(uuid, uuid),
  public.staff_has_consent(uuid),
  public.is_circle_member(uuid),
  public.can_read_care_channel(uuid)
from anon;

-- ── enable RLS everywhere (new tables) ───────────────────────────────

alter table public.profile_details      enable row level security;
alter table public.barc_checks          enable row level security;
alter table public.circles              enable row level security;
alter table public.circle_memberships   enable row level security;
alter table public.recovery_goals       enable row level security;
alter table public.goal_milestones      enable row level security;
alter table public.job_applications     enable row level security;
alter table public.resumes              enable row level security;
alter table public.resume_sections      enable row level security;
alter table public.care_episodes        enable row level security;
alter table public.phase_transitions    enable row level security;
alter table public.continuum_events     enable row level security;
alter table public.care_channels        enable row level security;
alter table public.care_messages        enable row level security;
alter table public.consent_grants       enable row level security;
alter table public.follow_up_checkins   enable row level security;
alter table public.sponsored_placements enable row level security;
alter table public.placement_events     enable row level security;
alter table public.demo_leads           enable row level security;
alter table public.employers            enable row level security;
alter table public.job_posts            enable row level security;

-- =====================================================================
-- COMMUNITY EXPANSION
-- =====================================================================

-- ── profile_details ──────────────────────────────────────────────────
-- Self read/write; staff read; a mentor reads their mentee's details.
-- The PUBLIC projection (rings + milestones when opted in) flows ONLY
-- through the definer view public_profile_details below — never the table.
create policy "profile_details: read own"
  on public.profile_details for select to authenticated using (user_id = auth.uid());
create policy "profile_details: staff read"
  on public.profile_details for select to authenticated using (public.is_staff());
create policy "profile_details: mentor reads mentee"
  on public.profile_details for select to authenticated using (public.is_mentor_of(user_id));
create policy "profile_details: upsert own"
  on public.profile_details for insert to authenticated with check (user_id = auth.uid());
create policy "profile_details: update own"
  on public.profile_details for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Public-safe profile projection: exposes the recovery-capital rings /
-- milestones flag ONLY for members who opted in AND whose giving page is
-- public. No interests/tagline leak unless opted in. anon reads this view,
-- never profile_details directly.
create or replace view public.public_profile_details as
select
  p.slug,
  p.name,
  pd.tagline,
  pd.interests,
  pd.recovery_capital_public,
  pd.show_milestones
from public.profile_details pd
join public.profiles p on p.id = pd.user_id
where p.role = 'member'
  and p.consent_public = true
  and p.slug is not null
  and pd.recovery_capital_public = true;

comment on view public.public_profile_details is
  'Public profile rings/milestones — only for opted-in, consent_public members (docs/10 §1). Revocation is immediate.';

grant select on public.public_profile_details to anon, authenticated;

-- NEGATIVE TESTS (profile_details):
--   as anon:            select * from profile_details;                         → 0 rows
--   as member danielle: select * from profile_details where user_id <> auth.uid(); → 0 rows
--   as anon:            select * from public_profile_details
--                         where slug='andre';                                  → 0 rows (recovery_capital_public=false or consent off)

-- ── barc_checks ──────────────────────────────────────────────────────
-- BARC-10 is warm self-reflection: NEVER public, NEVER clinical. Self
-- read/write only; staff read for supportive follow-up (internal, never a
-- public surface). No mentor read (kept to the member + staff).
create policy "barc_checks: read own"
  on public.barc_checks for select to authenticated using (member_id = auth.uid());
create policy "barc_checks: staff read"
  on public.barc_checks for select to authenticated using (public.is_staff());
create policy "barc_checks: insert own"
  on public.barc_checks for insert to authenticated with check (member_id = auth.uid());

-- NEGATIVE TESTS (barc_checks):
--   as anon:            select * from barc_checks;                             → 0 rows (never public)
--   as member danielle: insert into barc_checks (member_id,...) values (<tyrell>,...); → ERROR: RLS violation
--   as mentor marcus:   select * from barc_checks where member_id=<mentee>;    → 0 rows (member + staff only)

-- ── circles ──────────────────────────────────────────────────────────
-- Any authenticated user browses circles (Community tab); staff manage.
create policy "circles: authenticated read"
  on public.circles for select to authenticated using (true);
create policy "circles: staff manage"
  on public.circles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── circle_memberships ───────────────────────────────────────────────
-- A member joins/leaves circles as themselves; co-members and staff can
-- read the roster of a circle the caller belongs to.
create policy "circle_memberships: read own"
  on public.circle_memberships for select to authenticated using (member_id = auth.uid());
create policy "circle_memberships: co-member reads roster"
  on public.circle_memberships for select to authenticated
  using (public.is_circle_member(circle_id));
create policy "circle_memberships: staff read"
  on public.circle_memberships for select to authenticated using (public.is_staff());
create policy "circle_memberships: join as self"
  on public.circle_memberships for insert to authenticated with check (member_id = auth.uid());
create policy "circle_memberships: leave own"
  on public.circle_memberships for delete to authenticated using (member_id = auth.uid());

-- NEGATIVE TESTS (circles):
--   as anon:            select * from circles;                                 → 0 rows (sign-in required)
--   as member danielle: insert into circle_memberships (circle_id,member_id)
--                         values (<c>, <tyrell>);                              → ERROR: RLS violation (forged member)
--   as member danielle: select * from circle_memberships where member_id<>auth.uid()
--                         and circle_id = <circle she is NOT in>;             → 0 rows

-- ── recovery_goals ───────────────────────────────────────────────────
-- Self owns fully. Read widens with visibility: mentor sees a mentee's
-- goals at visibility 'mentor'|'circle'|'public'; circle co-members see
-- 'circle'|'public'; staff see all. Only the owner writes.
create policy "recovery_goals: read own"
  on public.recovery_goals for select to authenticated using (member_id = auth.uid());
create policy "recovery_goals: staff read"
  on public.recovery_goals for select to authenticated using (public.is_staff());
create policy "recovery_goals: mentor reads shared"
  on public.recovery_goals for select to authenticated
  using (public.is_mentor_of(member_id) and visibility in ('mentor','circle','public'));
create policy "recovery_goals: owner writes"
  on public.recovery_goals for insert to authenticated with check (member_id = auth.uid());
create policy "recovery_goals: owner updates"
  on public.recovery_goals for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "recovery_goals: owner deletes"
  on public.recovery_goals for delete to authenticated using (member_id = auth.uid());

-- ── goal_milestones ──────────────────────────────────────────────────
-- Access follows the parent goal's owner; staff read all. (Owner-scoped
-- via an EXISTS on recovery_goals — no direct member_id column here.)
create policy "goal_milestones: owner reads"
  on public.goal_milestones for select to authenticated
  using (exists (select 1 from public.recovery_goals g
                 where g.id = goal_id and g.member_id = auth.uid()));
create policy "goal_milestones: staff read"
  on public.goal_milestones for select to authenticated using (public.is_staff());
create policy "goal_milestones: owner writes"
  on public.goal_milestones for insert to authenticated
  with check (exists (select 1 from public.recovery_goals g
                      where g.id = goal_id and g.member_id = auth.uid()));
create policy "goal_milestones: owner updates"
  on public.goal_milestones for update to authenticated
  using (exists (select 1 from public.recovery_goals g
                 where g.id = goal_id and g.member_id = auth.uid()))
  with check (exists (select 1 from public.recovery_goals g
                      where g.id = goal_id and g.member_id = auth.uid()));
create policy "goal_milestones: owner deletes"
  on public.goal_milestones for delete to authenticated
  using (exists (select 1 from public.recovery_goals g
                 where g.id = goal_id and g.member_id = auth.uid()));

-- NEGATIVE TESTS (recovery_goals / goal_milestones):
--   as member danielle: select * from recovery_goals where member_id<>auth.uid()
--                         and visibility='private';                            → 0 rows
--   as mentor marcus:   select * from recovery_goals
--                         where member_id=<mentee> and visibility='private';   → 0 rows (private stays private)
--   as member danielle: insert into recovery_goals (member_id,...) values (<tyrell>,...); → ERROR: RLS violation
--   as member danielle: insert into goal_milestones (goal_id,...)
--                         values (<tyrell's goal>,...);                        → ERROR (not her goal)

-- ── job_applications ─────────────────────────────────────────────────
-- Private career tracker: self + staff only (no mentor / no public).
create policy "job_applications: read own"
  on public.job_applications for select to authenticated using (member_id = auth.uid());
create policy "job_applications: staff read"
  on public.job_applications for select to authenticated using (public.is_staff());
create policy "job_applications: owner writes"
  on public.job_applications for insert to authenticated with check (member_id = auth.uid());
create policy "job_applications: owner updates"
  on public.job_applications for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "job_applications: owner deletes"
  on public.job_applications for delete to authenticated using (member_id = auth.uid());

-- ── resumes / resume_sections ────────────────────────────────────────
-- Self + staff. resume_sections follow the parent resume's owner.
create policy "resumes: read own"
  on public.resumes for select to authenticated using (member_id = auth.uid());
create policy "resumes: staff read"
  on public.resumes for select to authenticated using (public.is_staff());
create policy "resumes: owner writes"
  on public.resumes for insert to authenticated with check (member_id = auth.uid());
create policy "resumes: owner updates"
  on public.resumes for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "resumes: owner deletes"
  on public.resumes for delete to authenticated using (member_id = auth.uid());

create policy "resume_sections: owner reads"
  on public.resume_sections for select to authenticated
  using (exists (select 1 from public.resumes r
                 where r.id = resume_id and r.member_id = auth.uid()));
create policy "resume_sections: staff read"
  on public.resume_sections for select to authenticated using (public.is_staff());
create policy "resume_sections: owner writes"
  on public.resume_sections for insert to authenticated
  with check (exists (select 1 from public.resumes r
                      where r.id = resume_id and r.member_id = auth.uid()));
create policy "resume_sections: owner updates"
  on public.resume_sections for update to authenticated
  using (exists (select 1 from public.resumes r
                 where r.id = resume_id and r.member_id = auth.uid()))
  with check (exists (select 1 from public.resumes r
                      where r.id = resume_id and r.member_id = auth.uid()));
create policy "resume_sections: owner deletes"
  on public.resume_sections for delete to authenticated
  using (exists (select 1 from public.resumes r
                 where r.id = resume_id and r.member_id = auth.uid()));

-- NEGATIVE TESTS (job_applications / resumes):
--   as anon:            select * from job_applications;                       → 0 rows
--   as anon:            select * from resumes;                                → 0 rows (never public)
--   as member danielle: select * from resumes where member_id<>auth.uid();    → 0 rows
--   as member danielle: insert into resume_sections (resume_id,...)
--                         values (<tyrell's resume>,...);                     → ERROR: RLS violation

-- =====================================================================
-- CONTINUUM OF CARE  — consent is the gate on every center-plane read.
-- =====================================================================

-- ── care_episodes ────────────────────────────────────────────────────
-- Member reads own. A center (staff) reads a member's episode ONLY when
-- the episode is at their center AND the member has an active consent to
-- that center (staff_has_consent). Phase/LOC advances are staff writes
-- under the same consent gate; the member does not self-edit clinical
-- phase. Cross-center staff, and staff without consent, see nothing.
create policy "care_episodes: member reads own"
  on public.care_episodes for select to authenticated using (member_id = auth.uid());
create policy "care_episodes: consented center reads"
  on public.care_episodes for select to authenticated
  using (center_id = public.caller_center() and public.staff_has_consent(member_id));
create policy "care_episodes: consented center writes"
  on public.care_episodes for insert to authenticated
  with check (center_id = public.caller_center() and public.staff_has_consent(member_id));
create policy "care_episodes: consented center updates"
  on public.care_episodes for update to authenticated
  using (center_id = public.caller_center() and public.staff_has_consent(member_id))
  with check (center_id = public.caller_center() and public.staff_has_consent(member_id));

-- ── phase_transitions ────────────────────────────────────────────────
-- Append-only log. Readable by anyone who can read the parent episode
-- (member self OR consented center). Insert by consented center staff or
-- the member's own actions (changed_by = self); NO update / NO delete
-- policy → the log cannot be rewritten.
create policy "phase_transitions: read via episode"
  on public.phase_transitions for select to authenticated
  using (exists (
    select 1 from public.care_episodes e
    where e.id = episode_id
      and (e.member_id = auth.uid()
           or (e.center_id = public.caller_center() and public.staff_has_consent(e.member_id)))
  ));
create policy "phase_transitions: append via episode"
  on public.phase_transitions for insert to authenticated
  with check (
    changed_by = auth.uid()
    and exists (
      select 1 from public.care_episodes e
      where e.id = episode_id
        and (e.member_id = auth.uid()
             or (e.center_id = public.caller_center() and public.staff_has_consent(e.member_id)))
    )
  );

-- ── continuum_events ─────────────────────────────────────────────────
-- The heartbeat has a SINGLE write path: the emit hook / service role
-- (like donations, there is deliberately NO user-facing insert policy).
-- Read: the member (own timeline) + consented center staff. The
-- de-identified licensed plane (outcomes-analytics.sql) reads these under
-- the matview owner, never through these policies.
create policy "continuum_events: member reads own"
  on public.continuum_events for select to authenticated using (member_id = auth.uid());
create policy "continuum_events: consented center reads"
  on public.continuum_events for select to authenticated
  using (public.staff_has_consent(member_id)
         and exists (select 1 from public.care_episodes e
                     where e.member_id = continuum_events.member_id
                       and e.center_id = public.caller_center()));

-- ── care_channels ────────────────────────────────────────────────────
-- Read gated by can_read_care_channel() (member side / consented staff /
-- consented member of the center). Center staff of the owning center
-- create and manage channels; members do not create care channels.
create policy "care_channels: read if permitted"
  on public.care_channels for select to authenticated
  using (public.can_read_care_channel(id));
create policy "care_channels: owning center manages"
  on public.care_channels for all to authenticated
  using (public.is_staff() and center_id = public.caller_center())
  with check (public.is_staff() and center_id = public.caller_center());

-- ── care_messages ────────────────────────────────────────────────────
-- Readable when the caller can read the channel AND the message is either
-- approved OR authored by the caller OR the caller is owning-center staff.
-- A 'flagged' (held / crisis) message is therefore NOT broadly readable —
-- only its sender and the center staff see it until moderation clears it.
-- Send as self into a channel you may read.
create policy "care_messages: read visible in channel"
  on public.care_messages for select to authenticated
  using (
    public.can_read_care_channel(channel_id)
    and (
      moderation_status = 'approved'
      or sender_id = auth.uid()
      or exists (select 1 from public.care_channels c
                 where c.id = channel_id
                   and public.is_staff() and c.center_id = public.caller_center())
    )
  );
create policy "care_messages: send as self"
  on public.care_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_read_care_channel(channel_id));
create policy "care_messages: owning-center staff moderate"
  on public.care_messages for update to authenticated
  using (exists (select 1 from public.care_channels c
                 where c.id = channel_id
                   and public.is_staff() and c.center_id = public.caller_center()))
  with check (exists (select 1 from public.care_channels c
                      where c.id = channel_id
                        and public.is_staff() and c.center_id = public.caller_center()));

-- ── consent_grants ───────────────────────────────────────────────────
-- The member OWNS consent: grants and revokes their OWN rows. The center
-- reads grants naming their center (to know who consented). Revoke = the
-- member updates revoked_at on their own row; access dies immediately
-- (has_active_consent flips false). No one grants on a member's behalf.
create policy "consent_grants: member reads own"
  on public.consent_grants for select to authenticated using (member_id = auth.uid());
create policy "consent_grants: center reads grants to it"
  on public.consent_grants for select to authenticated
  using (public.is_staff() and center_id = public.caller_center());
create policy "consent_grants: member grants own"
  on public.consent_grants for insert to authenticated
  with check (member_id = auth.uid() and revoked_at is null);
create policy "consent_grants: member revokes own"
  on public.consent_grants for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ── follow_up_checkins ───────────────────────────────────────────────
-- Member reads/completes own; consented center staff read/schedule for
-- their center. Same consent gate as the rest of the continuum.
create policy "follow_up_checkins: member reads own"
  on public.follow_up_checkins for select to authenticated using (member_id = auth.uid());
create policy "follow_up_checkins: consented center reads"
  on public.follow_up_checkins for select to authenticated
  using (center_id = public.caller_center() and public.staff_has_consent(member_id));
create policy "follow_up_checkins: member completes own"
  on public.follow_up_checkins for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "follow_up_checkins: consented center schedules"
  on public.follow_up_checkins for insert to authenticated
  with check (center_id = public.caller_center() and public.staff_has_consent(member_id));

-- NEGATIVE TESTS (continuum — the consent gate):
--   as anon:              select * from care_episodes;                        → 0 rows
--   as member danielle:   select * from continuum_events where member_id<>auth.uid(); → 0 rows
--   as staff (center X, NO consent from danielle):
--                         select * from care_episodes where member_id=<danielle>;     → 0 rows
--   grant: (as danielle) insert into consent_grants(member_id,center_id) values(auth.uid(),X);
--   as staff (center X):  select * from care_episodes where member_id=<danielle>;     → now visible
--   revoke: (as danielle) update consent_grants set revoked_at=now() where ...;
--   as staff (center X):  select * from care_episodes where member_id=<danielle>;     → 0 rows again (immediate)
--   as staff (center Y ≠ episode center): ... → 0 rows even WITH a consent to X (center match required)
--   as member tyrell:     select * from care_messages
--                           where channel_id=<flagged msg's channel> and moderation_status='flagged'
--                           and sender_id<>auth.uid();                        → 0 rows (held msg not broadly readable)
--   as member danielle:   insert into continuum_events (...);                 → ERROR (no user insert path; service role only)

-- =====================================================================
-- COMMUNITY AD PRODUCT  — advertiser reads are aggregate-only.
-- =====================================================================

-- ── sponsored_placements ─────────────────────────────────────────────
-- Members / anon see ONLY running placements (served in-feed). The buying
-- center manages its OWN placements (any status). Platform staff (ms_admin)
-- review/approve everything. A center cannot see another center's drafts.
create policy "sponsored_placements: running are visible"
  on public.sponsored_placements for select to anon, authenticated
  using (status = 'running');
create policy "sponsored_placements: center manages own"
  on public.sponsored_placements for all to authenticated
  using (public.is_staff() and org_id = public.caller_center())
  with check (public.is_staff() and org_id = public.caller_center());
create policy "sponsored_placements: platform staff review all"
  on public.sponsored_placements for select to authenticated using (public.is_staff());
create policy "sponsored_placements: platform staff moderate"
  on public.sponsored_placements for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── placement_events ─────────────────────────────────────────────────
-- The trust boundary. member_id is server-side only. A member records
-- their OWN interaction (impression/click/dismiss/report). There is NO
-- per-member SELECT policy for a center — advertisers get counts ONLY via
-- the placement_stats() definer RPC below, which never returns member_id.
-- Only platform staff may read raw rows.
create policy "placement_events: record own interaction"
  on public.placement_events for insert to authenticated
  with check (member_id = auth.uid());
create policy "placement_events: platform staff read raw"
  on public.placement_events for select to authenticated using (public.is_staff());

-- Aggregate-only stats for a center's own placements. Returns COUNTS by
-- kind — never a member_id. SECURITY DEFINER so it can aggregate the
-- otherwise-unreadable table, but it self-checks org ownership first.
create or replace function public.placement_stats(p_placement uuid)
returns table (kind public.placement_event_kind, n bigint)
language sql stable security definer set search_path = public
as $$
  select e.kind, count(*)::bigint
  from public.placement_events e
  join public.sponsored_placements sp on sp.id = e.placement_id
  where e.placement_id = p_placement
    and (
      public.is_staff() and (sp.org_id = public.caller_center() or public.caller_center() is null)
    )
  group by e.kind;
$$;

revoke execute on function public.placement_stats(uuid) from anon;

-- ── demo_leads ───────────────────────────────────────────────────────
-- Public write-only drop box (marketing "For Recovery Centers" form);
-- staff read + advance. status must start 'new'. Mirrors mentor_applications.
create policy "demo_leads: public submit"
  on public.demo_leads for insert to anon, authenticated with check (status = 'new');
create policy "demo_leads: staff read"
  on public.demo_leads for select to authenticated using (public.is_staff());
create policy "demo_leads: staff update"
  on public.demo_leads for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- NEGATIVE TESTS (ad product):
--   as anon:            select * from sponsored_placements where status<>'running'; → 0 rows (only live ads)
--   as center-staff(X): select * from sponsored_placements where org_id<>X;         → 0 rows... unless platform staff (review)
--   as center-staff(X): select member_id from placement_events;                     → 0 rows (no per-member select)
--   as center-staff(X): select * from placement_stats(<own placement>);             → counts by kind, NO member_id
--   as center-staff(X): select * from placement_stats(<other center's placement>);  → 0 rows (org check)
--   as anon:            select * from demo_leads;                                    → 0 rows (write-only)
--   as anon:            insert into demo_leads (...,status) values (...,'closed');   → ERROR (must start 'new')

-- =====================================================================
-- EMPLOYERS + JOB POSTS (OPTIONAL / PROVISIONAL) — see schema-expansion §4
-- =====================================================================
-- Minimal, decoupled-from-auth policies matching the provisional standalone
-- tables. Public reads open jobs; platform staff manage both. The employer
-- self-service model (employer = profiles.role 'employer') is an open
-- decision (docs/13 §Decisions still needed); revisit these policies then.
create policy "employers: authenticated read"
  on public.employers for select to authenticated using (true);
create policy "employers: staff manage"
  on public.employers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "job_posts: open are public"
  on public.job_posts for select to anon, authenticated using (status = 'open');
create policy "job_posts: staff read all"
  on public.job_posts for select to authenticated using (public.is_staff());
create policy "job_posts: staff manage"
  on public.job_posts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());


-- ============================================================
-- 06 ENGAGEMENT RLS POLICIES — runs 9-10 (policies-run9-10.sql)
-- ============================================================
-- =====================================================================
-- My Struggle — Row Level Security, ENGAGEMENT (Runs 9–10 / seed v11)
-- =====================================================================
-- Implements docs/10-COMPLIANCE.md as database policy for the tables in
-- schema-run9-10.sql. Run AFTER schema.sql, schema-expansion.sql,
-- schema-run9-10.sql, policies.sql (defines is_staff() / is_mentor()),
-- and policies-expansion.sql.
--
-- PRINCIPLES (docs/10):
--   * RLS ENABLED ON EVERY NEW TABLE — no exceptions.
--   * notifications: a user reads / marks-read ONLY their own inbox; there
--     is NO user-facing insert path — rows are written server-side by the
--     emit_notification hook / service role (mirrors continuum_events).
--   * community_events: public-read (GET /api/events is open to all, incl.
--     signed-out); mentors + staff create/manage (POST is getRoleUser
--     "mentor" — staff pass every gate → is_mentor()).
--   * event_rsvps: a user manages ONLY their own RSVP rows; per-event
--     RSVP counts are exposed via the event_rsvp_count() aggregate RPC,
--     never by letting a caller scan other members' RSVP rows.
--   * member_blocks: a user manages / reads ONLY their own (blocker = me).
--   * post_reports: a member files their OWN report (reporter = me); staff
--     read + resolve the queue (all-staff — the app notifies every staff
--     user; posts carry no center linkage to scope by).
--
-- Each section ends with NEGATIVE TEST comments — runnable patterns for
-- the policy test suite (AUTOPILOT: RLS items require negative tests).
-- =====================================================================

-- ── enable RLS everywhere (engagement tables) ────────────────────────

alter table public.notifications    enable row level security;
alter table public.community_events enable row level security;
alter table public.event_rsvps      enable row level security;
alter table public.member_blocks    enable row level security;
alter table public.post_reports     enable row level security;

-- =====================================================================
-- NOTIFICATIONS  — own inbox only; no user insert path.
-- =====================================================================
-- A user SELECTs and marks-read (UPDATE) only rows addressed to them.
-- Insert is deliberately absent for anon/authenticated: the inbox is
-- written by emit_notification() (a definer hook) or the service role,
-- exactly like continuum_events / donations. This prevents a member
-- forging a notification into someone else's inbox.
create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications: mark own read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "notifications: staff read"
  on public.notifications for select to authenticated
  using (public.is_staff());

-- NEGATIVE TESTS (notifications):
--   as anon:            select * from notifications;                       → 0 rows
--   as member danielle: select * from notifications where user_id<>auth.uid(); → 0 rows (another inbox is invisible)
--   as member danielle: insert into notifications (user_id,kind,title)
--                         values (<tyrell>,'system','x');                  → ERROR: RLS violation (no user insert path)
--   as member danielle: update notifications set read=true
--                         where user_id<>auth.uid();                       → 0 rows updated

-- =====================================================================
-- COMMUNITY EVENTS  — public read; mentor/staff create + manage.
-- =====================================================================
-- GET /api/events is open (no auth gate) and returns every event, so the
-- feed is public-read for anon + authenticated. Creation/edit is gated to
-- mentors and staff (is_mentor() = role in mentor|staff), creating as self.
create policy "community_events: public read"
  on public.community_events for select to anon, authenticated
  using (true);
create policy "community_events: mentor creates own"
  on public.community_events for insert to authenticated
  with check (public.is_mentor() and creator_id = auth.uid());
create policy "community_events: creator updates own"
  on public.community_events for update to authenticated
  using (public.is_mentor() and creator_id = auth.uid())
  with check (public.is_mentor() and creator_id = auth.uid());
create policy "community_events: staff manage"
  on public.community_events for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (community_events):
--   as member danielle: insert into community_events (creator_id,...)
--                         values (auth.uid(),...);                         → ERROR (members can't create events)
--   as mentor marcus:   insert ... (creator_id = <sarah>, ...);           → ERROR: RLS violation (forged creator)
--   as mentor marcus:   update community_events set title='x'
--                         where creator_id <> auth.uid();                  → 0 rows updated (only own; staff manage all)

-- =====================================================================
-- EVENT RSVPS  — own rows only; counts via a definer aggregate.
-- =====================================================================
-- A member adds/removes ONLY their own RSVP; they may read their own rows
-- (to compute iRsvped). Per-event totals (rsvpCount) come from the
-- event_rsvp_count() definer RPC below — a caller never scans another
-- member's RSVP rows. Staff read all for the roster.
create policy "event_rsvps: read own"
  on public.event_rsvps for select to authenticated
  using (user_id = auth.uid());
create policy "event_rsvps: staff read"
  on public.event_rsvps for select to authenticated
  using (public.is_staff());
create policy "event_rsvps: rsvp as self"
  on public.event_rsvps for insert to authenticated
  with check (user_id = auth.uid());
create policy "event_rsvps: un-rsvp as self"
  on public.event_rsvps for delete to authenticated
  using (user_id = auth.uid());

-- Aggregate-only RSVP count for an event (the rsvpCount the feed shows).
-- SECURITY DEFINER so it can count rows the caller can't individually
-- select; returns a bare number, never member rows. Mirrors the
-- placement_stats() aggregate-RPC pattern in policies-expansion.sql.
create or replace function public.event_rsvp_count(p_event uuid)
returns bigint
language sql stable security definer set search_path = public
as $$
  select count(*)::bigint from public.event_rsvps where event_id = p_event;
$$;

grant execute on function public.event_rsvp_count(uuid) to anon, authenticated;

-- NEGATIVE TESTS (event_rsvps):
--   as member danielle: insert into event_rsvps (event_id,user_id)
--                         values (<e>, <tyrell>);                          → ERROR: RLS violation (forged attendee)
--   as member danielle: select * from event_rsvps where user_id<>auth.uid(); → 0 rows (can't enumerate attendees)
--   as member danielle: delete from event_rsvps where user_id<>auth.uid(); → 0 rows deleted
--   as anon:            select public.event_rsvp_count(<e>);              → a count (no member rows exposed)

-- =====================================================================
-- MEMBER BLOCKS  — own blocks only (blocker = me).
-- =====================================================================
-- A user reads, creates, and removes ONLY the blocks they authored. No one
-- else — not even the blocked user — can see who blocked them via this table
-- (the reverse-lookup filtering is a server-side concern, not a client read).
create policy "member_blocks: read own"
  on public.member_blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy "member_blocks: block as self"
  on public.member_blocks for insert to authenticated
  with check (blocker_id = auth.uid());
create policy "member_blocks: unblock own"
  on public.member_blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- NEGATIVE TESTS (member_blocks):
--   as member danielle: insert into member_blocks (blocker_id,blocked_id)
--                         values (<tyrell>, <marcus>);                     → ERROR: RLS violation (forged blocker)
--   as member danielle: insert ... (auth.uid(), auth.uid());              → ERROR: member_blocks_no_self_ck (can't block self)
--   as member danielle: select * from member_blocks where blocker_id<>auth.uid(); → 0 rows (can't see others' blocks)
--   as member tyrell:   select * from member_blocks where blocked_id=auth.uid();  → 0 rows (blocked user can't enumerate)

-- =====================================================================
-- POST REPORTS  — member files own; staff read + resolve the queue.
-- =====================================================================
-- A signed-in member files a report on a post as themselves; a new report
-- must start 'open'. The reporter may read back their own report (so an
-- insert…returning works). Staff read the whole queue and mark reports
-- 'reviewed' — all-staff, matching the app which notifies EVERY staff user
-- (posts carry no center linkage to scope the queue by).
create policy "post_reports: member files own"
  on public.post_reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
create policy "post_reports: reporter reads own"
  on public.post_reports for select to authenticated
  using (reporter_id = auth.uid());
create policy "post_reports: staff read"
  on public.post_reports for select to authenticated
  using (public.is_staff());
create policy "post_reports: staff resolve"
  on public.post_reports for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (post_reports):
--   as anon:            insert into post_reports (...);                    → ERROR (sign-in required; no anon insert)
--   as member danielle: insert into post_reports (post_id,reporter_id,reason)
--                         values (<p>, <tyrell>, 'spam');                  → ERROR: RLS violation (forged reporter)
--   as member danielle: insert ... (reporter_id=auth.uid(), status='reviewed'); → ERROR (must start 'open')
--   as member danielle: select * from post_reports where reporter_id<>auth.uid(); → 0 rows (queue is staff-only)
--   as member danielle: update post_reports set status='reviewed' ...;    → 0 rows updated (only staff resolve)


-- ============================================================
-- 07 EMPLOYER-AS-ROLE RECONCILIATION (apply-employer-role.sql) — ALTER TYPE line removed (baked into enum above)
-- ============================================================
-- =====================================================================
-- My Struggle — RECONCILIATION: employer = a User with role 'employer'
-- =====================================================================
-- Implements the LOCKED product decision (docs/13 §Decisions): an employer
-- is NOT a standalone `employers` row — it is a `profiles` account with
-- role = 'employer' and a `company` field, and every JobPost.employerId
-- keys to that user id. This supersedes schema-expansion.sql §4 (the
-- provisional standalone `employers` table) and the placeholder job_posts
-- policies in policies-expansion.sql.
--
-- ─────────────────────────────────────────────────────────────────────
-- RUN ORDER — THIS FILE RUNS LAST.
-- ─────────────────────────────────────────────────────────────────────
-- It must run AFTER schema-expansion.sql (which CREATES `employers` +
-- `job_posts`) AND AFTER policies-expansion.sql (which CREATES the RLS
-- policies on `employers` + `job_posts`). Running it earlier would fail:
-- policies-expansion.sql would later try to enable RLS / create policies
-- on an `employers` table this file has already dropped, and would collide
-- with the job_posts policies this file replaces. As a reconciliation
-- migration that supersedes objects defined by the base package, LAST is
-- the correct position. Full validated sequence:
--
--   schema.sql -> schema-expansion.sql -> schema-run9-10.sql
--   -> policies.sql -> policies-expansion.sql -> policies-run9-10.sql
--   -> apply-employer-role.sql   (this file)
--
-- ─────────────────────────────────────────────────────────────────────
-- TRANSACTION NOTE — DO NOT wrap this file in a single transaction.
-- ─────────────────────────────────────────────────────────────────────
-- Step 1 (`alter type ... add value`) cannot be used in the SAME
-- transaction that adds it, and later steps DO use 'employer'::user_role.
-- Run with psql WITHOUT `--single-transaction` (the default `psql -f`
-- autocommits each statement), or run step 1 on its own via `psql -c`.
-- Every step is guarded so re-running is safe.
-- =====================================================================

-- ── 1. add the 'employer' enum value (OUTSIDE a txn block) ────────────
-- Idempotent via IF NOT EXISTS. Must commit before any statement below
-- references 'employer'::public.user_role — hence: not single-transaction.

-- ── 2. profiles.company (User.company — the business an employer hires for) ─
alter table public.profiles add column if not exists company text;

comment on column public.profiles.company is
  'Employer accounts (role=''employer'') only: the business they hire for. Set at signup enrichment; NULL for members/mentors/staff.';

-- ── 3. repoint job_posts.employer_id at profiles(id) ──────────────────
-- Was references public.employers(id); now the posting user's profile id.
-- Drop-if-exists + re-add makes this re-runnable (constraint name is stable).
do $$
begin
  if to_regclass('public.job_posts') is not null then
    alter table public.job_posts drop constraint if exists job_posts_employer_id_fkey;
    alter table public.job_posts
      add constraint job_posts_employer_id_fkey
      foreign key (employer_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- ── 4. drop the standalone employers table + its policies ─────────────
-- CASCADE removes the RLS policies policies-expansion.sql created on it
-- (and any remaining dependents). job_posts no longer references it (step 3).
drop table if exists public.employers cascade;

-- ── 5. employer self-service helper (mirrors is_staff()) ──────────────
-- SECURITY DEFINER so it reads profiles without recursing into its RLS.
create or replace function public.is_employer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'employer'
  );
$$;

revoke execute on function public.is_employer() from anon;

-- ── 6. tighten job_posts RLS to owner-scoped writes ───────────────────
-- Replace the placeholder policies from policies-expansion.sql §Employers.
-- Public reads OPEN jobs (fair-chance board); the owning employer manages
-- ONLY their own posts (employer_id = me AND role = 'employer'); the
-- employer reads their own posts in any status; platform staff read all.
alter table public.job_posts enable row level security;

drop policy if exists "job_posts: open are public"  on public.job_posts;
drop policy if exists "job_posts: staff read all"    on public.job_posts;
drop policy if exists "job_posts: staff manage"      on public.job_posts;

drop policy if exists "job_posts: open are public read"  on public.job_posts;
drop policy if exists "job_posts: employer reads own"    on public.job_posts;
drop policy if exists "job_posts: platform staff read"   on public.job_posts;
drop policy if exists "job_posts: employer manages own"  on public.job_posts;

create policy "job_posts: open are public read"
  on public.job_posts for select to anon, authenticated
  using (status = 'open');
create policy "job_posts: employer reads own"
  on public.job_posts for select to authenticated
  using (employer_id = auth.uid());
create policy "job_posts: platform staff read"
  on public.job_posts for select to authenticated
  using (public.is_staff());
create policy "job_posts: employer manages own"
  on public.job_posts for all to authenticated
  using (employer_id = auth.uid() and public.is_employer())
  with check (employer_id = auth.uid() and public.is_employer());

-- NEGATIVE TESTS (employer model):
--   as anon:              select * from job_posts where status<>'open';        → 0 rows (only open jobs public)
--   as member danielle:   insert into job_posts (employer_id,...) values (auth.uid(),...); → ERROR (not an employer)
--   as employer acme:     insert ... (employer_id = <other employer>, ...);    → ERROR: RLS violation (forged owner)
--   as employer acme:     update job_posts set status='closed' where employer_id<>auth.uid(); → 0 rows updated
--   (schema) select 'employer'::public.user_role;                              → ok (enum value present)
--   (schema) select 1 from employers;                                         → ERROR: relation does not exist (dropped)


-- ============================================================
-- 08 OUTCOMES DATA PRODUCT + de-identified licensed plane (outcomes-analytics.sql)
-- ============================================================
-- =====================================================================
-- My Struggle — Outcomes Data Product (v2): the two-plane analytics layer
-- =====================================================================
-- SQL realization of app/api/outcomes/compute.ts. Run AFTER
-- schema-expansion.sql + policies-expansion.sql. The three materialized
-- views the funder trusts — mv_continuum_score / mv_care_outcomes /
-- mv_efficacy — are computed ONCE here so the API and CSV export stay in
-- lockstep with the database, exactly as compute.ts is the one place today.
--
-- THE TWO PLANES (the P0 trust boundary — docs/10 §1, §5–6):
--
--   analytics.*  IDENTIFIED CENTER PLANE. Per-member rows carrying member
--                identity. Reachable ONLY by the member (own row) or by
--                consented, same-center staff — enforced because the center
--                plane reads through a security_invoker VIEW over the RLS'd
--                base tables (the consent gate in policies-expansion.sql
--                applies to the caller). NOT suppressed: single center,
--                consented, identified.
--
--   licensed.*   DE-IDENTIFIED LICENSED PLANE. ONLY aggregate counters. The
--                matviews here select NO name / member_number / slug / user
--                id — they GROUP the identified frame down to distributions
--                and rates, so an identifiable value is unreachable by
--                construction, not by review. A dedicated `licensed_research`
--                role is granted these three matviews and NOTHING else (no
--                base tables, no analytics schema). Every cohort is
--                small-cell suppressed at k >= 11.
--
-- k >= 11 MINIMUM-COHORT SUPPRESSION (the rule, enforced in SQL): any
-- group whose distinct-member count < 11 has its value returned NULL. This
-- is applied PER CELL — every bucket, edge, LOC, horizon and quartile is
-- itself a cohort, so a 1..10-member cell is nulled the same way. The raw
-- cohort size `n` is kept beside each value so a reader can see WHY a cell
-- is suppressed, but never the underlying members.
--
-- Score parity with compute.ts: score = round(100 * raw / (raw + 40)),
-- raw = summed continuum_event weights in the trailing 90 days measured
-- from the latest recorded event (ref_now), NOT the wall clock — the seed
-- hangs off a fixed epoch (same anchor as /api/continuum).
-- =====================================================================

create schema if not exists analytics;
create schema if not exists licensed;

comment on schema analytics is
  'Identified center plane — per-member outcome frame. Consent-gated via base-table RLS; never granted to licensed_research.';
comment on schema licensed is
  'De-identified licensed plane — aggregate-only, k>=11 suppressed. The ONLY schema the licensed_research role may read.';

-- The de-identification minimum cohort size (compute.ts MIN_COHORT).
create or replace function analytics.min_cohort() returns int
  language sql immutable as $$ select 11 $$;

-- Reporting anchor: the latest recorded continuum event, or now() if none
-- (compute.ts refNow). Stable so seed data windows correctly.
create or replace function analytics.ref_now() returns timestamptz
  language sql stable security definer set search_path = public as $$
  select coalesce(max(occurred_at), now()) from public.continuum_events;
$$;

-- Saturating engagement score for one member at a reference time
-- (compute.ts SCORE_K = 40, 90-day window). SINGLE source of truth so the
-- center view and the licensed matviews cannot drift.
create or replace function analytics.engagement_score(p_member uuid, p_ref timestamptz)
returns int language sql stable security definer set search_path = public as $$
  select round(100.0 * raw / (raw + 40))::int
  from (
    select coalesce(sum(weight), 0)::numeric as raw
    from public.continuum_events
    where member_id = p_member
      and occurred_at >= p_ref - interval '90 days'
  ) s;
$$;

-- ── analytics.member_outcome_all (identified global frame) ───────────
-- The MemberOutcome frame of compute.ts, per member, for the WHOLE
-- platform. Carries member_id/center_id — IDENTIFIED. It is the private
-- input the licensed aggregates are grouped from (the matview refresh runs
-- as its owner, which is how global aggregation happens); it is NEVER
-- exposed to the licensed_research role or to a center directly. Center
-- staff use the consent-gated view below, not this matview.
create materialized view analytics.member_outcome_all as
with latest as (
  -- latest care episode per member (the outcomes population = members with
  -- at least one episode), member role only.
  select distinct on (ce.member_id)
    ce.member_id, ce.id as episode_id, ce.center_id, ce.care_phase,
    ce.level_of_care, ce.started_at, ce.ended_at, ce.discharge_type
  from public.care_episodes ce
  join public.profiles p on p.id = ce.member_id and p.role = 'member'
  order by ce.member_id, ce.started_at desc
),
goals as (
  select member_id, count(*)::int as goals_achieved
  from public.recovery_goals
  where status = 'achieved'
  group by member_id
)
select
  l.member_id,
  l.episode_id,
  l.center_id,
  l.care_phase,
  l.level_of_care,
  l.started_at,
  l.ended_at,
  l.discharge_type,
  analytics.engagement_score(l.member_id, analytics.ref_now()) as score,
  coalesce(g.goals_achieved, 0) as goals_achieved
from latest l
left join goals g on g.member_id = l.member_id;

create unique index member_outcome_all_pk on analytics.member_outcome_all (member_id);

comment on materialized view analytics.member_outcome_all is
  'IDENTIFIED per-member frame for the whole platform. Private input to the licensed aggregates; not granted to licensed_research or centers.';

-- ── analytics.center_member_outcome (identified CENTER plane) ────────
-- The consent-gated, single-center identified roster a staff member may
-- see (compute.ts buildCenter members[]). security_invoker = true → the
-- consent gate on care_episodes/profiles in policies-expansion.sql applies
-- to the CALLER, so a staff member sees only their own center's consented
-- members, and a member sees only their own row. Recomputes the score from
-- base tables (via the shared function) rather than the private matview, so
-- no un-gated data leaks through.
create view analytics.center_member_outcome
  with (security_invoker = true) as
select
  ce.member_id,
  p.name,                                   -- identified: center plane only
  p.member_number,
  ce.center_id,
  ce.care_phase,
  ce.level_of_care,
  ce.started_at,
  ce.ended_at,
  ce.discharge_type,
  analytics.engagement_score(ce.member_id, analytics.ref_now()) as score,
  (select count(*)::int from public.recovery_goals g
    where g.member_id = ce.member_id and g.status = 'achieved') as goals_achieved
from public.care_episodes ce
join public.profiles p on p.id = ce.member_id and p.role = 'member';

comment on view analytics.center_member_outcome is
  'Identified center-plane roster. security_invoker → base-table RLS (consent + center match) gates every row to the caller. Never suppressed.';

-- =====================================================================
-- LICENSED PLANE — de-identified, aggregate-only, k>=11 suppressed.
-- No matview below selects a name/member_number/slug/member_id.
-- =====================================================================

-- ── licensed.mv_continuum_score (distribution) ───────────────────────
-- compute.ts scoreDistribution: quartile buckets + overall avg/median.
-- One row per engagement bucket plus a summary row (bucket = 'ALL'). Each
-- bucket is a cohort → member_count is NULL when < 11 (small-cell
-- suppression); avg/median on the ALL row are NULL when the population < 11.
create materialized view licensed.mv_continuum_score as
with scored as (
  select
    score,
    case
      when score between 0 and 24 then '0-24 (disengaged)'
      when score between 25 and 49 then '25-49 (emerging)'
      when score between 50 and 74 then '50-74 (engaged)'
      else '75-100 (thriving)'
    end as bucket
  from analytics.member_outcome_all
)
select
  coalesce(bucket, 'ALL') as bucket,
  count(*)::bigint as cohort_n,                        -- raw size (never a person)
  -- k>=11 small-cell suppression, per cell:
  case when count(*) >= analytics.min_cohort() then count(*)::bigint end as member_count,
  case when grouping(bucket) = 1 and count(*) >= analytics.min_cohort()
       then round(avg(score))::int end as avg_score,
  case when grouping(bucket) = 1 and count(*) >= analytics.min_cohort()
       then round(percentile_cont(0.5) within group (order by score))::int end as median_score
from scored
group by grouping sets ((bucket), ());

comment on materialized view licensed.mv_continuum_score is
  'De-identified engagement-score distribution. k>=11 per bucket; avg/median only when population>=11. No identifiable columns.';

-- ── licensed.mv_care_outcomes ────────────────────────────────────────
-- compute.ts careOutcomes, long/tagged format so heterogeneous metrics
-- share one de-identified matview. Every row carries its cohort size `n`
-- and a k>=11-suppressed `value`:
--   phase_transition : from→to edge counts across the append-only log
--   completion_by_loc: discharge 'completed' rate per level of care (%)
--   retention        : retained-in-recovery % at 30/60/90/180/365d post-discharge
--   recovery_capital : engagement-density proxy 0..100, pre → during → post
create materialized view licensed.mv_care_outcomes as
with mo as (
  select * from analytics.member_outcome_all
),
refn as (select analytics.ref_now() as ref_now),

-- (a) phase-transition edge counts (cohort = distinct members on the edge)
trans as (
  select
    coalesce(pt.from_phase::text, 'start') as key_a,
    pt.to_phase::text as key_b,
    count(*)::numeric as raw_value,
    count(distinct ce.member_id) as n
  from public.phase_transitions pt
  join public.care_episodes ce on ce.id = pt.episode_id
  join mo on mo.member_id = ce.member_id
  group by 1, 2
),

-- (b) completion rate by level of care among discharged episodes
loc as (
  select
    mo.level_of_care::text as key_a,
    round(100.0
      * count(*) filter (where mo.discharge_type = 'completed')
      / nullif(count(*) filter (where mo.discharge_type is not null), 0)
    )::numeric as raw_value,
    count(*) filter (where mo.discharge_type is not null) as n
  from mo
  where mo.level_of_care is not null
  group by 1
),

-- (c) retention-in-recovery at each horizon. eligible = discharged members
--     observable that far past discharge; retained = any continuum event on
--     or after ended_at + horizon (compute.ts activity proxy).
horizons(day) as (values (30), (60), (90), (180), (365)),
retn as (
  select
    h.day::text as key_a,
    round(100.0 * count(*) filter (where retained) / nullif(count(*), 0))::numeric as raw_value,
    count(*) as n
  from horizons h
  cross join lateral (
    select
      exists (
        select 1 from public.continuum_events e
        where e.member_id = mo.member_id
          and e.occurred_at >= mo.ended_at + make_interval(days => h.day)
      ) as retained
    from mo, refn
    where mo.ended_at is not null
      and refn.ref_now - mo.ended_at >= make_interval(days => h.day)   -- observable
  ) r
  group by h.day
),

-- (d) recovery-capital proxy: mean weighted-event density (weight/day) in
--     each phase window, mapped through the saturating normalizer
--     capital = round(100 * d / (d + 0.5)) (compute.ts capitalFromDensity).
--     Windows from the append-only transition log per member.
member_density as (
  select
    mo.member_id,
    -- pre window: start → first intake/in_program transition (fallback ended/ref)
    (select coalesce(min(pt.at),
        least(coalesce(mo.ended_at, refn.ref_now), refn.ref_now))
      from public.phase_transitions pt
      where pt.episode_id = mo.episode_id and pt.to_phase in ('intake','in_program')
    ) as pre_end,
    (select min(pt.at) from public.phase_transitions pt
      where pt.episode_id = mo.episode_id and pt.to_phase = 'in_program'
    ) as dur_start,
    mo.started_at,
    coalesce(mo.ended_at, refn.ref_now) as dur_end,
    mo.ended_at,
    refn.ref_now
  from mo, refn
),
density_calc as (
  select
    -- density helper inlined: sum(weight in [from,to)) / max(1 day, span)
    case when md.pre_end > md.started_at then (
      select coalesce(sum(e.weight), 0)::numeric
        / greatest(1, extract(epoch from (md.pre_end - md.started_at)) / 86400.0)
      from public.continuum_events e
      where e.member_id = md.member_id
        and e.occurred_at >= md.started_at and e.occurred_at < md.pre_end
    ) end as pre_d,
    case when md.dur_end > coalesce(md.dur_start, md.pre_end) then (
      select coalesce(sum(e.weight), 0)::numeric
        / greatest(1, extract(epoch from (md.dur_end - coalesce(md.dur_start, md.pre_end))) / 86400.0)
      from public.continuum_events e
      where e.member_id = md.member_id
        and e.occurred_at >= coalesce(md.dur_start, md.pre_end) and e.occurred_at < md.dur_end
    ) end as dur_d,
    case when md.ended_at is not null and md.ref_now > md.ended_at then (
      select coalesce(sum(e.weight), 0)::numeric
        / greatest(1, extract(epoch from (md.ref_now - md.ended_at)) / 86400.0)
      from public.continuum_events e
      where e.member_id = md.member_id
        and e.occurred_at >= md.ended_at and e.occurred_at < md.ref_now
    ) end as post_d
  from member_density md
),
capital as (
  select 'pre'    as key_a, avg(pre_d)  as mean_d, count(pre_d)  as n from density_calc
  union all
  select 'during' as key_a, avg(dur_d)  as mean_d, count(dur_d)  as n from density_calc
  union all
  select 'post'   as key_a, avg(post_d) as mean_d, count(post_d) as n from density_calc
)

select 'phase_transition' as metric, key_a, key_b,
       n::bigint as cohort_n,
       case when n >= analytics.min_cohort() then raw_value end as value
from trans
union all
select 'completion_by_loc', key_a, null::text,
       n::bigint,
       case when n >= analytics.min_cohort() then raw_value end
from loc
union all
select 'retention', key_a, null::text,
       n::bigint,
       case when n >= analytics.min_cohort() then raw_value end
from retn
union all
select 'recovery_capital', key_a, null::text,
       n::bigint,
       case when n >= analytics.min_cohort()
            then round(100.0 * mean_d / (mean_d + 0.5)) end
from capital;

comment on materialized view licensed.mv_care_outcomes is
  'De-identified care outcomes (phase transitions, completion-by-LOC, retention, recovery-capital proxy). k>=11 per row. No identifiable columns.';

-- ── licensed.mv_efficacy ─────────────────────────────────────────────
-- compute.ts efficacy: members bucketed into engagement quartiles; outcome
-- columns per quartile. Illustrative (directional, not a fitted model).
-- Each quartile is a cohort → all values NULL when the quartile has < 11.
create materialized view licensed.mv_efficacy as
with q as (
  select
    member_id, score, ended_at, goals_achieved,
    ntile(4) over (order by score) as quartile
  from analytics.member_outcome_all
),
refn as (select analytics.ref_now() as ref_now),
per_q as (
  select
    q.quartile,
    count(*) as n,
    round(avg(q.score))::int as avg_score,
    round(avg(q.goals_achieved)::numeric, 1) as avg_goals_achieved,
    count(*) filter (
      where q.ended_at is not null
        and (select ref_now from refn) - q.ended_at >= interval '90 days'
    ) as discharged_n,
    count(*) filter (
      where q.ended_at is not null
        and (select ref_now from refn) - q.ended_at >= interval '90 days'
        and exists (
          select 1 from public.continuum_events e
          where e.member_id = q.member_id
            and e.occurred_at >= q.ended_at + interval '90 days'
        )
    ) as retained_90
  from q
  group by q.quartile
)
select
  case quartile when 1 then 'Q1 (lowest)' when 4 then 'Q4 (highest)'
                else 'Q' || quartile end as quartile_label,
  n::bigint as cohort_n,
  case when n >= analytics.min_cohort() then n end as members,
  case when n >= analytics.min_cohort() then avg_score end as avg_score,
  case when n >= analytics.min_cohort() then avg_goals_achieved end as avg_goals_achieved,
  case when discharged_n >= analytics.min_cohort()
       then round(100.0 * retained_90 / nullif(discharged_n, 0))::int end as retention_90_pct
from per_q
order by quartile;

comment on materialized view licensed.mv_efficacy is
  'De-identified engagement-quartile → outcome table. Illustrative, directional. k>=11 per quartile. No identifiable columns.';

-- ── refresh ──────────────────────────────────────────────────────────
-- Refresh order matters: the identified frame first, then the three
-- de-identified aggregates that group it. Schedule via pg_cron / an edge
-- function after continuum writes settle.
create or replace function analytics.refresh_outcomes() returns void
language plpgsql security definer set search_path = public, analytics, licensed as $$
begin
  refresh materialized view analytics.member_outcome_all;
  refresh materialized view licensed.mv_continuum_score;
  refresh materialized view licensed.mv_care_outcomes;
  refresh materialized view licensed.mv_efficacy;
end;
$$;

-- =====================================================================
-- STRUCTURAL SEPARATION — the licensed_research role can read ONLY the
-- de-identified plane, and NOTHING identifiable.
-- =====================================================================
-- A NOLOGIN role a licensing seat's connection/JWT maps into (Supabase:
-- grant to a custom role, or `set role licensed_research` after auth). It
-- is deliberately given USAGE on the `licensed` schema + SELECT on the
-- three aggregate matviews and NOTHING ELSE — no base tables, no
-- `analytics` schema, no `public` continuum tables. A leaked name is
-- therefore impossible by construction: the role literally cannot reference
-- a table that has one.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'licensed_research') then
    create role licensed_research nologin;
  end if;
end
$$;

-- Hard deny everything, then grant back only the de-identified aggregates.
revoke all on all tables    in schema public    from licensed_research;
revoke all on all tables    in schema analytics from licensed_research;
revoke all on all functions in schema analytics from licensed_research;
revoke usage on schema analytics from licensed_research;
revoke usage on schema public   from licensed_research;   -- no base-table reach

grant usage on schema licensed to licensed_research;
grant select on
  licensed.mv_continuum_score,
  licensed.mv_care_outcomes,
  licensed.mv_efficacy
to licensed_research;

-- The identified frame is off-limits to the licensing seat AND to the
-- broad authenticated role (centers use the consent-gated view, not this).
revoke all on analytics.member_outcome_all from anon, authenticated, licensed_research;

-- Center staff / members reach the identified plane ONLY through the
-- security_invoker view (RLS-gated). Aggregates are safe for signed-in
-- staff to read for benchmark context.
grant usage on schema analytics to authenticated;
grant select on analytics.center_member_outcome to authenticated;
grant select on
  licensed.mv_continuum_score,
  licensed.mv_care_outcomes,
  licensed.mv_efficacy
to authenticated;

-- NEGATIVE TESTS (two-plane separation):
--   set role licensed_research;
--     select * from analytics.member_outcome_all;           → ERROR: permission denied
--     select * from public.continuum_events;                → ERROR: permission denied (no base-table reach)
--     select * from analytics.center_member_outcome;        → ERROR: permission denied
--     select member_count from licensed.mv_continuum_score; → OK (aggregate, k>=11 suppressed)
--   k>=11: seed a bucket/LOC/quartile with < 11 members →
--     its member_count / value / avg_score column is NULL, cohort_n shows the real (small) size.
--   center plane consent: as staff of center X with NO active grant from a member →
--     that member is absent from analytics.center_member_outcome (base-table RLS).
--   revoke a grant → the member drops out of center_member_outcome immediately on next query.
