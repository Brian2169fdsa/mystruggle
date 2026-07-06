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
