# 10 — COMMUNITY EXPANSION REQUIREMENTS (profiles, community, goals, résumé, companion)
# EXPANSION — extends existing modules, replaces nothing. Verify no regressions to feed/giving/gamification/mentorship each run.

## A. Member Profiles
- [ ] profile_details + barc_selfchecks tables + RLS (member owns; staff assigned-only for BARC)
- [ ] Public profile page: avatar, journey-since, bio, interest tags, milestone wall, member's posts — all consent-gated, minimal-public default
- [ ] Recovery-capital 3-ring snapshot (Personal/Social/Community), opt-in visibility, derived from activity (not clinical)
- [ ] BARC-10 self-check: warm framing, 10 domains, 0–50 total, trend to member + assigned staff only, never public unless shared, never a diagnosis
- [ ] In-community "cheer"/follow only; no external exposure; no identity-revealing friend mechanics
- [ ] Extends existing consent panel (no duplicate consent system)

## B. Community / Circles (extends feed docs/05/06)
- [ ] circles table + membership + RLS mirroring org isolation; join/leave
- [ ] Circle types: topic + cohort + center alumni; peer-led vs staff-moderated flag
- [ ] Post scope extended with circle_id; existing audience rules intact
- [ ] Added reactions: 🙌 proud / 🤝 same (shared-experience); still no dislike
- [ ] Daily reflection prompt + gratitude/win-of-week rituals per circle
- [ ] "Ask for support" post type → gentle peer visibility + mentor/staff awareness; crisis classifier still applies
- [ ] Peer nomination / staff-rotated spotlight (opt-in)
- [ ] Milestone auto-celebration extended to goal achievements + shared BARC upticks (grace opt-out)
- [ ] ALL new surfaces inherit moderation, report/block, no-DM, crisis path (negative + crisis tests pass)
- [ ] Circles fold into existing dashboard moderation queue (no second queue)

## C. Recovery Goals (extends journey_tasks + goals; merges neither)
- [ ] recovery_goals + goal_milestones + job_applications tables + RLS (member-owned, visibility tiers)
- [ ] recovery_goals.domain across 9 recovery-capital domains; member-authored "why"
- [ ] Milestones optionally spawn journey_tasks (existing tracker) — bidirectional status
- [ ] linked_funding_goal_id connects a recovery goal to an existing QR funding goal (housing example works end to end)
- [ ] "My Plan" member section: goals, milestones, linked funding, linked tasks, domain progress rings
- [ ] Housing goal flow ("get a halfway house") verified: goal → milestones → tasks → linked donation goal → achieve → celebration + points
- [ ] Job goal flow verified: goal → résumé milestone → job_applications tracker → Companion nudges on stale apps → offer → celebration
- [ ] Staff see My Plan (permission-gated) on participant detail; mentors see shared goals

## D. Résumé Builder
- [ ] resumes + resume_sections tables + RLS (member-owned)
- [ ] Guided mobile-first builder, plain-language prompts, autosave, section reordering
- [ ] Gap/record-aware coaching via Companion (positive reframing, fair-chance guidance, NO legal advice — routes to staff/resources)
- [ ] Skills extraction from lived experience (mentorship/Store/My Safety roles → résumé lines)
- [ ] Branded PDF export (pdf skill, clean_blue template) + shareable link + version history + multiple résumés
- [ ] "Attach to job application" links résumé → job_applications

## E. AI Companion (EXTENDS The Guide — one assistant, not two)
- [ ] Guide gains plan-awareness: reads recovery_goals/milestones/tasks/job_applications/résumé with member consent
- [ ] Goal coaching (MI tone: affirm + evoke "why"), milestone suggestions, stalled-goal re-engagement, completion celebration
- [ ] Résumé coach mode drives Part D conversationally
- [ ] Interview practice mode (target-job aware, kind feedback, record/gap prep)
- [ ] Resource concierge with expanded categories (vouchers, fair-chance employers, transport, benefits, legal aid, food)
- [ ] Opt-in daily check-in (mood + today's tasks + one nudge) — telephone-recovery-support pattern
- [ ] Tools scoped + member-confirmed: search_resources, create_journey_task, create_goal_milestone, draft_resume_section, log_mood, log_job_application
- [ ] Hard rails re-verified: no clinical/legal counsel; crisis → alert <60s never solo; transcripts staff-visible; member can wipe Companion memory
- [ ] Still ONE assistant surface (no duplicate Guide/Companion) — existing Guide entry points reused

## F. Coherence & Dashboard
- [ ] Recovery-capital rollup (personal/social/community) computed and shown on profile, My Plan, and dashboard outcomes
- [ ] Dashboard participant detail extended: My Plan, résumé view, BARC trend, Companion goal-coaching transcript
- [ ] Overview gains recovery-capital averages + goals-achieved trend on existing reports (no rebuild)

## Seed / Mock (Danielle flagship)
- [ ] Housing recovery goal (5 milestones) linked to her $175/wk funding goal
- [ ] Job goal + 4 job_applications in varied statuses + completed résumé (PDF renders)
- [ ] 3 circles joined with posts; BARC self-check trend (3 points); Companion coaching history
- [ ] 40+ other members seeded with goals/résumés/circle activity so every new chart and circle looks alive
- [ ] Demo verifies the full housing storyline touches all 3 recovery-capital domains + emits posts/points

## Regression Guard (run every session)
- [ ] Existing feed, QR giving, gamification, mentorship, dashboard tests all still green
- [ ] No existing table/route/component renamed or removed; only additions + documented extends in DECISIONS.md
