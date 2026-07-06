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
