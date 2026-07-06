# 16 — Module: Center Operations Suite (dashboard deep build + client portal + care team + ROI)

> **Read this first, Claude Code:** EXPANSION. This deepens the dashboard (docs/08), LMS (docs/07), continuum (docs/14), and member app (docs/02 requirements) into a complete center operating system. Extend — never replace. Programs sit ABOVE existing courses; the client portal is a center-scoped mode of the existing member PWA, not a second app. New checklist: `requirements/13-CENTER-OPERATIONS.md`. Follow AUTOPILOT.

---

## What a center can do when this ships (the promise)

Build their own programming. Enroll cohorts. See every client's whole story — before they arrived, while they're in the building, and for years after they leave. Put every employee in genuine contact with clients. Give clients a portal that makes treatment engaging and prepares their return to society. And prove, in dollars and outcomes, that it worked.

---

## Part A — Program Builder (the LMS grows a level: centers create PROGRAMS)

A **Program** is a packaged, runnable offering — curriculum + schedule + people + gamification + communication — targeted at a level of care. Courses (docs/07) are ingredients; Programs are the meal.

```
programs
  org_id → orgs, title text, description text, cover_url,
  level_of_care text check in ('detox','residential','php','iop','op','recovery_maintenance','custom'),
  program_category text null check in ('PON','VOC','IOP','NAV','other'),
  duration_weeks int null, delivery text check in ('in_facility','remote','hybrid'),
  gamification_config jsonb,          -- points multipliers, program badges, completion certificate toggle
  is_template boolean default false,  -- shareable template (My Struggle publishes starters)
  status text check in ('draft','published','archived')

program_curriculum                    -- ordered building blocks
  program_id → programs, sort int,
  kind text check in ('course','session_series','task_pack','milestone'),
  course_id → courses null,           -- reuse existing courses
  config jsonb                        -- e.g. session cadence, task pack contents, milestone criteria

program_enrollments                   -- cohort membership
  program_id → programs, participant_id → participants, care_episode_id → care_episodes,
  cohort_label text null, enrolled_at, completed_at null,
  status text check in ('active','completed','withdrawn')

program_sessions                      -- scheduled group sessions (extends group-facilitated docs/07)
  program_id → programs, title text, starts_at timestamptz, duration_min int,
  location text null, facilitator_id → profiles null, channel_post boolean default true

session_attendance
  session_id → program_sessions, participant_id, status check in ('present','remote','excused','absent'),
  marked_by uuid
```

**Builder UX (dashboard → Learning → Programs):** create program → pick LOC + delivery → drag in courses from the library (own + My Struggle shared) → add session series (weekly cadence auto-generates program_sessions) → add task packs (pre-built `journey_tasks` bundles like "Reentry Documents Pack": get ID, SS card, MVD) → set milestones ("Week 4: first family session") → configure gamification (program badge, completion certificate, points multiplier) → publish → enroll cohort (multi-select from roster or CSV). Each program auto-creates its **program group channel** (docs/14) and its dashboard cockpit. **Program templates**: My Struggle publishes starter programs (ISE 12-Step, IOP Core, Vocational Readiness, Reentry Navigation); centers clone + customize. Preview-as-client before publishing.

## Part B — Client 360 (all metrics on a person: before · during · after)

One screen per person, the center's single pane of glass (extends participant detail, docs/08, and the continuum ribbon, docs/14):

- **Header**: photo/consent state, member #, care phase + LOC chip, continuum score (0–100) with 30-day trend arrow, risk flag
- **Ribbon**: full before/during/after timeline (docs/14) — pre-care baseline visible if consented
- **Tabs**:
  - *Engagement*: continuum-events sparkline by source (community/LMS/goals/giving/mentorship/companion), daily activity heatmap, streak
  - *Learning*: programs + courses, % complete, session attendance, quiz scores, journal-flag indicators (assigned staff only)
  - *Community*: activity-level signals + the member's posts that staff can legitimately see per audience rules (org/community); NEVER private journals or mentor DMs; circles joined
  - *Goals & Reentry*: recovery goals + milestones + journey tasks + job applications + résumé status (docs/13), RC domain rings with pre→now delta
  - *Giving*: balances, goal funding progress, redemptions (permission-gated)
  - *Care & Support*: care team, mentor, sessions, mood check-in trend, staff notes, follow-up cadence status (post-discharge)
- **Compare view**: this person vs cohort average on engagement/completion (private to staff; never shown to members — docs/07 anti-toxicity)
- Loads < 2s; every widget deep-links to its module

## Part C — Care Team & Employee Engagement (staff working WITH clients during treatment)

```
care_team_assignments
  care_episode_id → care_episodes, staff_id → profiles,
  role text check in ('case_manager','counselor','peer_support','tech','facilitator'),
  is_primary boolean default false, assigned_at, ended_at null

staff_engagements                     -- every human touch, logged lightweight
  care_episode_id, staff_id, kind text check in
    ('kudos','nudge','checkin','session_note','call','hallway'),   -- hallway = quick in-person touch
  body text null, occurred_at
```

- **Care team on every episode**: case manager, counselor, peer support, techs — all see their assigned clients in a **My Caseload** view (their clients, sorted by risk + last-touch recency, with "hasn't been touched in 3 days" surfacing)
- **Engagement actions from anywhere** (Client 360, caseload, cockpit): send **kudos** ("Marcus noticed your streak 🔥" — lands as a warm client notification), send a **nudge** (gentle assignment/session reminder), log a **check-in** (mood + note), message via the existing 1:1 care channel (docs/14)
- Every touch writes `staff_engagements` + a `continuum_event` — so *human contact itself becomes a measured engagement input*, and the ROI model can show staff-touch → outcome correlation
- **Staff task queue**: follow-ups assigned to specific staff ("call Danielle re: housing"), due dates, done-state
- Boundaries: engagement comms only, no PHI/clinical notes (docs/14 rule), all auditable

## Part D — Client Portal (the member PWA in "In Treatment" mode)

Not a new app: when a member has an active `in_program` care episode, their existing PWA Home gains a **My Program** panel at top (the rest of the app — community, giving, goals, chat — remains, per center policy toggles):

- **Today**: today's sessions (time/room/facilitator), today's assignments, today's tasks — one glance
- **My Program**: progress bar through the curriculum, next-up lesson, program badge progress, cohort channel entry
- **My Reentry Plan**: recovery goals + task packs (docs/13) — clients CREATE their own tasks and goals here ("get my license," "find housing"), with Companion coaching; staff can see and co-plan
- **Kudos inbox**: staff kudos + peer cheers land here (celebration styling)
- **Kiosk mode**: shared facility devices — PIN/QR quick-login, session-scoped, auto-logout, no notifications persistence
- **Center policy toggles** (Settings, per org): allow/limit community access during residential/detox phases, quiet hours, portal-only mode for early phases — configurable, never hardcoded

Gamification runs identically in-portal (streaks, points, badges, program badge, completion certificate PDF) — continuity with the outside world is the point.

## Part E — Engagement Toolkit (more ways to engage, center-driven)

- **Challenges**: staff create time-boxed cohort challenges ("Gratitude Week: post daily") with a challenge badge; opt-in, no public loser-boards (docs/07 anti-toxicity holds)
- **Events**: center events calendar (family day, alumni BBQ, job fair) → RSVP → reminder → attendance → continuum_event; alumni events can be sponsored placements (docs/15) or free posts
- **Pulse surveys**: 1–3 question check-ins ("How supported do you feel this week?") sent to a cohort; trends on the cockpit; anonymous-to-peers, visible-to-staff
- **Broadcast announcements** with read receipts (existing announcement channel, add receipts)
- **Milestone spotlights**: staff one-click celebrate a client milestone to the org feed (with client consent prompt)

## Part F — ROI & Executive Reporting (extends Reports docs/08)

```
mv_roi_inputs                         -- per org per month: enrolled, completed, dropout, engaged-days,
                                      -- staff_engagements count, alumni retained, sessions delivered
```

- **ROI dashboard** (center_admin): configurable assumptions panel (avg revenue per completed episode, clinician hourly cost, admin hours saved/day, alumni program revenue) × platform-measured actuals (completion delta, dropout delta, engagement, staff touches, alumni retention) → monthly + annualized ROI figure with the math shown honestly ("your assumptions × our measurements")
- **Benchmarks**: published case-study reference lines (completion 50→65%, engagement 40→65%, 2 hrs/day saved, ROI 2x→5x) rendered as targets, clearly labeled as case-study reference not guarantee
- **Executive one-pager export**: branded PDF — outcomes, retention curves, RC deltas, ROI summary, Claude narrative — the thing a director hands their board or a funder
- **Marketing-page ROI calculator** (Part G): same math, public, with sliders

## Part G — Update the "For Recovery Centers" page (extends docs/15)

Add/upgrade sections (keep everything already spec'd, including the engagement-curve stat spine):
1. **"Build your programming, your way"** — Program Builder showcase: template gallery (ISE, IOP Core, Vocational, Reentry), drag-and-drop composer shots, "publish to your cohort in an afternoon"
2. **"See the whole person"** — Client 360 showcase: the before/during/after ribbon + tabs, "one screen from first contact to year two"
3. **"Every employee, engaged"** — care team + kudos/nudges/caseload: "your techs and peers become measurable parts of the outcome"
4. **"A portal your clients actually use"** — My Program / Today view / reentry plan / kiosk mode, gamification continuity
5. **Interactive ROI calculator** — sliders (census, completion rate, avg episode revenue, clinician hours) → estimated annual impact, "based on your numbers + published benchmarks," honest footnote, CTA "Get your full ROI analysis" → demo lead
6. Refresh nav/anchors; page still cites sources; still zero "Facebook"

## Dashboard IA update (final left nav)
Overview · **Programs** (builder + cockpits) · Participants (roster + Client 360) · **Caseloads** · Mentorship · Community · Giving · **Engage** (challenges/events/surveys/announcements) · Reports (+ ROI) · Settings

## Definition of Done
Everything in `requirements/13-CENTER-OPERATIONS.md` checked with evidence. Seed: Desert Hope runs 3 programs (ISE clone, IOP Core, Vocational) with cohorts, sessions, attendance; Danielle enrolled in IOP Core with care team of 3, kudos history, challenge participation, pulse responses; Client 360 fully alive for her including pre-care baseline; ROI dashboard + one-pager render from seed; portal My Program panel + kiosk mode work; marketing page updated with calculator. Zero regressions; anti-toxicity + privacy rules re-verified (no member-facing comparisons, no journal leaks, no PHI in messages).
