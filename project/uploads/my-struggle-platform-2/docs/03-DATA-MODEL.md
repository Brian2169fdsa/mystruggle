# 03 — Data Model (source of truth)

All tables have `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`. RLS enabled on every table. FK notation: `→`.

## Identity & Tenancy

```
orgs
  name text, type text check in ('nonprofit','center'), logo_url, city, state,
  settings jsonb default '{}'

profiles                      -- 1:1 with auth.users
  user_id uuid → auth.users unique, display_name text, full_name text,        -- full_name NEVER public
  avatar_url text, avatar_public boolean default false,
  phone text, bio text, lived_experience_tags text[]                          -- mentors: e.g. {addiction,incarceration}

memberships
  user_id → profiles, org_id → orgs, role text check in
  ('participant','mentor','center_staff','center_admin','ms_admin'),
  status text default 'active', unique(user_id, org_id, role)

participants                  -- extension of profiles for participant role
  user_id → profiles unique, participant_number text unique,                  -- e.g. 039521464
  primary_org_id → orgs, qr_slug text unique,                                 -- /p/[qr_slug]
  public_story text, public_story_approved boolean default false,
  journey_stage text check in ('intake','in_program','transitional','independent','alumni'),
  consent_public_profile boolean default false, consent_photo boolean default false,
  consent_signed_at timestamptz

enrollments                   -- participant ↔ org over time (post-discharge tracking)
  participant_id → participants, org_id → orgs,
  status text check in ('active','discharged','alumni'), started_at, ended_at
```

## QR Giving & Funds

```
goals                         -- participant needs/goals donors fund
  participant_id → participants, title text,                                  -- "Hallway house — $175/week"
  description text, target_cents int, funded_cents int default 0,
  category text check in ('housing','transport','education','documents','essentials','other'),
  is_public boolean default false, approved_by uuid, status text default 'active'

donations
  stripe_event_id text unique, stripe_payment_intent text,
  amount_cents int, fee_cents int, net_cents int,
  cash_split_cents int, credit_split_cents int,                               -- computed at webhook from split config (default 50/50)
  donor_email text, donor_name text, is_anonymous boolean default false,
  designation text check in ('participant_goal','participant_general','org_general'),
  goal_id → goals null, participant_id → participants null, org_id → orgs,
  message text                                                                -- moderated before showing

ledger_entries                -- append-only; two balances per member: cash + store credits, plus locked reentry savings
  participant_id → participants, donation_id → donations null,
  type text check in ('credit_cash','credit_store','redeem_cash','redeem_store',
                      'reserve_reentry','release_reentry','adjustment'),
  bucket text check in ('cash','credit','reentry'),
  amount_cents int, memo text, created_by uuid,
  store_id → stores null,                                                     -- for redeem_store
  card_scan_verified boolean default false                                    -- redeem_cash requires member ID card scan

stores                        -- The Store locations (on-site + free-standing)
  org_id → orgs, name text, address text, kind text check in ('onsite','freestanding'),
  is_active boolean default true

member_cards                  -- organization ID card (carries member #, QR)
  participant_id → participants, card_qr_slug text unique,
  issued_at timestamptz, issued_by uuid, status text default 'active'         -- lost/stolen → reissue, old card revoked

qr_scans                      -- analytics
  qr_slug text, scanned_at timestamptz default now(), converted boolean default false,
  donation_id → donations null, referrer text, city text
```

**Fund model (critical):** all money lands in My Struggle's Stripe account, then splits per platform config (default **50% cash / 50% store credits** — the signature My Struggle model). Cash is redeemable only at outreach centers with a member ID card scan; credits spend at The Store; either can be locked into reentry savings. Donors see the split explainer and impact milestones. See 04-MODULE-QR-GIVING and 10-COMPLIANCE §2.

## Social Feed

```
posts
  author_id → profiles, org_id → orgs null,                                   -- null = global My Struggle feed
  audience text check in ('community','org','mentors_only'),
  body text, media jsonb default '[]', post_type text check in
  ('update','milestone','testimony','question','celebration','system'),       -- system = auto (badge earned, goal funded)
  milestone_ref jsonb null,                                                   -- {kind:'badge'|'course'|'goal', id}
  moderation_status text default 'pending' check in ('pending','approved','flagged','removed'),
  like_count int default 0, comment_count int default 0

comments
  post_id → posts, author_id → profiles, body text,
  moderation_status text default 'approved'

reactions
  post_id → posts, user_id → profiles, kind text default 'heart',
  unique(post_id, user_id)

moderation_events
  target_type text, target_id uuid, action text, reason text,
  actor text check in ('auto','claude','staff'), actor_id uuid null, detail jsonb
```

## Mentorship

```
mentor_profiles
  user_id → profiles unique, headline text, capacity int default 3,
  specialties text[] check-ish ('life_skills','career','education','recovery','reintegration','emotional'),
  background_check_status text default 'pending', training_completed boolean default false

mentorships
  mentor_id → profiles, mentee_id → participants,
  status text check in ('proposed','active','paused','completed'),
  matched_by uuid, matched_at, goals_note text

mentorship_sessions
  mentorship_id → mentorships, occurred_at timestamptz, duration_min int,
  mode text check in ('in_person','call','video','chat'), notes text,          -- notes visible to mentor + staff, NOT public
  mood_rating int null                                                        -- optional mentee check-in 1–5

threads / messages             -- DM: mentor ↔ mentee (staff auditable per org policy)
  threads: mentorship_id → mentorships unique
  messages: thread_id → threads, sender_id → profiles, body text, read_at
```

## LMS + Gamification

```
journey_tasks                 -- guided goal tracking (REPrieve "My Tracker / My Center" pattern)
  participant_id → participants, title text,                                  -- "Job interview at ABC Painting", "Apply for St. Joseph t.w."
  source text check in ('self','care_team','program'), assigned_by uuid null,
  program text null check in ('PON','VOC','IOP','NAV','other'),
  due_at timestamptz null, status text check in ('open','done','skipped'), completed_at
  -- PWA Home shows two rings: My Tracker (self+care_team tasks) and My Center (program tasks)

videos                        -- standalone motivational/educational video library
  org_id → orgs, title text, url text, category text,                         -- e.g. 'New Freedom','Motivational','Steps'
  is_published boolean default true

courses
  org_id → orgs,                                                              -- owner (My Struggle owns ISE)
  title text, description text, cover_url text, is_published boolean,
  program text null check in ('PON','VOC','IOP','NAV','other'),               -- program category for dashboard KPIs
  delivery text default 'self_paced' check in ('self_paced','group_facilitated'),
  sequence_locked boolean default true                                        -- must finish lesson N before N+1

modules_lms
  course_id → courses, title text, sort int

lessons
  module_id → modules_lms, title text, sort int,
  content jsonb,                                                              -- blocks: video_url, rich_text, journal_prompt, quiz
  points int default 10

assignments
  course_id → courses, assigned_to_participant → participants null,
  assigned_to_org → orgs null,                                                -- org-wide assignment
  assigned_by uuid, due_at timestamptz null

lesson_progress
  participant_id → participants, lesson_id → lessons,
  status text check in ('not_started','in_progress','complete'),
  journal_entry text null,                                                    -- PRIVATE: participant + assigned staff only
  quiz_score int null, completed_at, unique(participant_id, lesson_id)

points_events                  -- append-only points ledger
  user_id → profiles, points int, reason text,
  ref jsonb                                                                   -- {kind:'lesson'|'streak'|'post'|'session'|'badge', id}

badges
  slug text unique, title text, description text, icon text, points int

user_badges
  user_id → profiles, badge_id → badges, earned_at, unique(user_id, badge_id)

streaks
  user_id → profiles unique, current_days int default 0, best_days int default 0,
  last_activity_date date
```

**Badge seed set:** First Step (first lesson), Course Champion (finish a course), 7-Day Flame / 30-Day Blaze / 90-Day Inferno (streaks), Storyteller (first approved post), Encourager (50 reactions given), Milestone Maker (goal fully funded), Steady Hand (10 mentor sessions — mentor badge), Homecoming (journey_stage → independent).

## Dashboard / Metrics (materialized views, refreshed nightly)

```
mv_org_engagement      -- per org per day: active participants, lessons completed, posts, sessions
mv_participant_health  -- per participant: last_active, course %, streak, mentor contact recency, risk_flag
mv_giving_summary      -- per org: donations count/sum, goals funded, avg gift, QR conversion
mv_outcomes            -- journey stage transitions over time (the grant-report gold)
```

`risk_flag` logic: no activity 7d = watch, 14d = at_risk, mentor session gap > 21d = flag. Surfaced on dashboard with staff task queue.
