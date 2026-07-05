# 13 — Module: Recovery Community, Member Profiles, Goals, Résumé & AI Companion (EXPANSION)

> **Read this first, Claude Code:** This is an EXPANSION of an already-built platform. Do NOT replace, rename, or rebuild anything. You are extending the existing feed (docs/05), The Guide (docs/02 AI touchpoint 1), gamification (docs/07), and QR giving (docs/04). Everything here must reuse existing tables, RLS patterns, brand tokens (docs/01/12), and the AUTOPILOT loop. Where this doc adds a table, it references existing FKs. Where it deepens a feature, it says "extend," not "create." Follow the same Definition of Done and write the gap report against the new checklist in `requirements/10-COMMUNITY-EXPANSION.md`.

---

## Why this design (evidence base)

Recovery outcomes are driven by **recovery capital** — the sum of resources a person can draw on, measured across three domains: **personal** (skills, motivation, coping), **social** (supportive relationships), and **community** (housing, employment, transportation, services). Digital peer communities that combine authentic peer connection with practical resource navigation show materially higher engagement and lower relapse than either alone. The validated **BARC-10** screener (10 domains, 0–50) is a lightweight way to make progress visible without turning the app into a clinical instrument.

So this expansion is organized around helping each member **grow recovery capital**: the community deepens *social* capital, the goals + résumé + companion grow *personal* and *community* capital, and the whole thing stays strengths-based (what's growing) rather than deficit-based (what's wrong). This framing is the connective tissue that makes the disparate features — feed, halfway-house goal, job goal, résumé, AI companion — one coherent product instead of a bundle.

---

## Part A — Member Profiles (extend existing `profiles` + `participants`)

The feed already has authors; now give members a real profile home.

**Public-facing profile (privacy-first, consent-gated):**
- Display name, avatar (existing consent flags), "in recovery since / journey since" optional date, short bio, lived-experience/interest tags
- Recovery capital snapshot (opt-in visibility): three small rings — Personal · Social · Community — sourced from the member's own activity + optional BARC-10 self-check, NOT clinical data
- Milestone wall: badges, sobriety anniversaries, goals achieved (member chooses what's public)
- Feed posts by this member (respecting audience rules)
- "Cheer" / follow (in-community only, never external), NOT friend-request mechanics that could expose identity

**Private profile settings (extend existing consent panel):** granular toggles for each block above; default is minimal-public. A member can run a fully private profile and still use everything.

New table (only if not already covered by profiles):
```
profile_details
  user_id → profiles unique, journey_since date null, tagline text,
  interests text[], recovery_capital_public boolean default false,
  show_milestones boolean default true
barc_selfchecks              -- optional, self-report, NOT clinical
  participant_id → participants, taken_at timestamptz,
  scores jsonb,              -- 10 BARC domains 0–5 each
  total int                  -- 0–50; trend shown to member + assigned staff only
```
BARC-10 is self-reflection, framed warmly ("Check in with yourself"), never gated, never shown as a diagnosis, results never public unless member explicitly shares a milestone.

## Part B — Community, done right (extend existing feed docs/05/06)

Keep everything that exists. Add the layers that turn a post-wall into a recovery community:

- **Groups / Circles**: topic and cohort spaces (e.g., "Job Seekers," "New in Recovery," "Parents in Recovery," center-specific alumni circles). Reuse the `posts.audience` pattern with a new `circle_id` scope; RLS mirrors org isolation. Members join/leave; some circles are staff-moderated, some peer-led.
- **Post enrichments** (extend `posts`): reactions beyond heart kept minimal but add "🙌 proud of you" and "🤝 same" (shared-experience signal — the research shows *shared experience* is the active ingredient, so surface it). Still no dunk/dislike.
- **Milestone auto-celebration**: already partly built for badges; extend so goal achievements and BARC upticks (if member opts to share) generate celebratory posts with the grace-period opt-out.
- **Prompts & rituals**: a daily optional reflection prompt in each circle ("One thing you're grateful for today"), gratitude threads, "win of the week." These drive the consistent low-pressure engagement that predicts retention.
- **Ask for support**: a distinct post type where a member can raise a hand ("I'm struggling today") that routes gentle peer visibility + optional mentor/staff awareness (respecting the existing crisis-escalation path — struggling ≠ crisis, but the classifier still watches).
- **Recognition**: peers can nominate a member for encouragement; opt-in "recovery milestones" spotlight rotated by staff.

Safety is non-negotiable and already spec'd (docs/06 moderation, crisis path). All new surfaces inherit it: moderation pipeline, report/block, no free DMs outside mentorship, display-name-only, no location.

## Part C — Member-Managed Goals (extend existing `journey_tasks` + `goals`)

Two goal concepts already exist and must NOT be merged or replaced:
- `goals` (docs/04) = **funding goals** donors give toward (money)
- `journey_tasks` (docs/07) = **tracker tasks** (to-dos)

This adds a middle layer they both roll up into: **Recovery Goals** — bigger life objectives the member owns and drives, mapped to recovery-capital domains.

```
recovery_goals
  participant_id → participants, title text, domain text
    check in ('housing','employment','education','health','relationships','legal','financial','transportation','other'),
  why text,                    -- member's own motivation (self-authored — powerful for adherence)
  status text check in ('active','achieved','paused','archived'),
  target_date date null, achieved_at timestamptz null,
  visibility text check in ('private','mentor','circle','public') default 'private',
  linked_funding_goal_id → goals null,      -- e.g. "Get a halfway house" links to the $175/wk funding goal
  progress_pct int default 0                -- derived from milestones below

goal_milestones               -- the concrete steps under a recovery goal
  recovery_goal_id → recovery_goals, title text, done boolean default false,
  sort int, due_date date null,
  creates_journey_task boolean default false -- optional: mirror a milestone into the daily tracker
```

**Signature flows the member drives themselves:**

1. **"I plan to get a halfway house"** → creates a `recovery_goals` row (domain=housing) with member's "why." The Companion (Part E) suggests milestones ("Call 3 houses," "Save first week's rent," "Gather ID"). Milestones can spawn `journey_tasks` for the daily tracker. If the house costs money, it links to a **funding goal** (existing QR giving) so donors can help — the recovery goal, the tracker tasks, and the donation goal are now one connected thing. This is the whole platform working as a loop for a single objective.

2. **"I plan to get a job"** → domain=employment recovery goal. Milestones: build résumé (Part D), practice interview (Companion), apply to N jobs (tracked), follow-ups. Employment is a top community-capital predictor of sustained recovery, so job goals get first-class treatment: a mini application tracker (`job_applications`: company, role, status applied/interview/offer/closed, notes, next_action_date) and Companion nudges on stale applications.

Members manage all of this from a new **"My Plan"** section (member app) — their goals, milestones, linked funding, linked tasks, and progress rings by recovery-capital domain. Staff see it (permission-gated) on the participant detail page; mentors see shared goals.

## Part D — Résumé Builder (new, member-owned)

A guided, dignity-first résumé tool designed for people with employment gaps and/or records — because a generic builder fails this population exactly where it matters.

```
resumes
  participant_id → participants, full_name text, headline text,
  contact jsonb, summary text, updated_at,
  template text default 'clean_blue', is_primary boolean default true
resume_sections
  resume_id → resumes, kind text check in
    ('experience','education','skills','certifications','volunteer','references','projects'),
  content jsonb, sort int
```

Features:
- Guided step-by-step builder (mobile-first), autosaves, plain-language prompts ("What did you do day to day?" not "Enumerate responsibilities")
- **Gap & record-aware coaching** (Companion-assisted): reframes gaps honestly and positively (recovery program time → "personal development / structured program," peer support roles → real transferable skills), guidance on when/how to address a record per fair-chance best practices, WITHOUT giving legal advice (routes legal questions to staff/resources)
- Skills extraction from lived experience (mentorship, program leadership, Store work, My Safety peer roles → concrete résumé lines)
- Export to clean branded PDF (reuse pdf skill + brand tokens: clean_blue template) + shareable link
- One-click "attach to a job application" (links to Part C `job_applications`)
- Version history; multiple tailored résumés per member

## Part E — The AI Companion (EXTEND the existing Guide, docs/02 — do not create a second assistant)

The Guide already exists as a reentry navigator (halfway house, license, jobs) with RAG over resources, task creation, and hard safety rules. **Expand its scope and give it memory of the member's plan** so it becomes a true companion across all of the above — one assistant, more capability.

New capabilities (all additive, all inside existing safety rails):
- **Plan-aware**: reads the member's `recovery_goals`, milestones, `journey_tasks`, `job_applications`, résumé state (with member consent) so it can coach specifically: "You've applied to 4 jobs — want to follow up on the two from last week?" / "Your halfway house goal is 60% funded; here are 3 houses that take your voucher."
- **Goal coaching**: helps break a goal into milestones, suggests realistic next steps, celebrates completions, gently re-engages stalled goals. Uses motivational-interviewing tone (affirm, evoke the member's own "why"), never pushy.
- **Résumé coach**: drives the Part D builder conversationally.
- **Interview practice**: mock-interview mode for the target job, kind feedback, common-question prep, record/gap coaching.
- **Resource concierge**: existing RAG over resources, expanded categories (housing vouchers, fair-chance employers, transportation, benefits, legal aid, food) — always as navigation, never as clinical/legal counsel.
- **Daily check-in** (opt-in): a warm "How are you today?" that can log a mood, surface today's tasks, and offer one encouraging nudge — the digital equivalent of the telephone-recovery-support check-in that research shows reduces use and improves retention.

**Hard rails (unchanged, re-verified):** never clinical/medical/legal counseling; crisis language → resource message + staff alert <60s, never handled solo; transcripts staff-visible; member can wipe Companion memory; tools remain scoped (search_resources, create_journey_task, create_goal_milestone, draft_resume_section, log_mood, log_job_application — each with member confirmation). The Companion advises and drafts; the member always confirms before anything is written.

## Part F — How it all connects (the coherence contract)

Everything above rolls up into **recovery-capital growth**, visible to the member as three domain rings on their profile and My Plan, and to staff as an outcome signal on the dashboard:
- Community activity (posts, circles, cheers, support asks) → **social capital**
- Goals, résumé, courses, streaks, BARC self-checks → **personal capital**
- Housing/employment/transportation goals achieved, resources accessed, funding goals met → **community capital**

A member working "get a halfway house" touches all three: they ask their circle for leads (social), the Companion coaches milestones and they check tasks off (personal), donors fund it via the linked QR goal and they move in (community) — and each of those emits a celebration post and points. That single storyline is the proof the whole platform is one thing, not seven.

## Dashboard additions (extend docs/08, do not rebuild)
- Participant detail gains: My Plan (recovery goals + milestones + job applications), résumé view, BARC trend (staff-visible), Companion transcript pane (already spec'd, extend to show goal coaching)
- New overview signal: recovery-capital domain averages + goals-achieved trend, added to existing outcomes reporting and the New Freedom benchmark lines
- Circles moderation folds into the existing moderation queue

## Definition of Done (this module)
Everything in `requirements/10-COMMUNITY-EXPANSION.md` checked with evidence, seeded with mock data (Danielle gets: a housing recovery goal linked to her $175/wk funding goal with 5 milestones, a job goal with 4 applications, a completed résumé, 3 circles joined, a BARC self-check trend, and Companion coaching history), all existing tests still green (no regressions to feed, giving, gamification, mentorship), RLS negative tests for every new table, mobile views for every member surface.
