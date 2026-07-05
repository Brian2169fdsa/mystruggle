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

create type public.user_role         as enum ('member', 'mentor', 'staff');
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
