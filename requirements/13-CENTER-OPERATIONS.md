# 13 — CENTER OPERATIONS SUITE REQUIREMENTS
# EXPANSION — deepens dashboard/LMS/continuum/member-app. Replaces nothing. Portal = mode of existing PWA, not a second app.

## A. Program Builder
- [ ] programs + program_curriculum + program_enrollments + program_sessions + session_attendance tables + RLS (org-scoped; My Struggle templates readable by all)
- [ ] Builder flow: create → LOC + delivery → drag courses (own + shared library) → session series with cadence auto-generating sessions → task packs (journey_tasks bundles incl. "Reentry Documents Pack") → milestones → gamification config (program badge, certificate, multiplier) → preview-as-client → publish
- [ ] Cohort enrollment: multi-select roster + CSV; enrollment links care_episode
- [ ] Publishing auto-creates program group channel (docs/14) + program cockpit
- [ ] 4 My Struggle starter templates seeded (ISE 12-Step, IOP Core, Vocational Readiness, Reentry Navigation); clone + customize works
- [ ] Session scheduling: facilitator, location, channel announcement toggle; attendance marking (present/remote/excused/absent) feeds continuum_events
- [ ] Completion: certificate PDF (brand template) + program badge + celebration

## B. Client 360
- [ ] Header: consent-aware identity, phase+LOC chip, continuum score + 30d trend, risk flag
- [ ] Continuum ribbon embedded (pre-care baseline shown only with pre-care consent)
- [ ] Tabs all live: Engagement (source sparkline + heatmap + streak) · Learning (programs/courses/attendance/quiz; journal flags assigned-staff-only) · Community (audience-legitimate posts + activity signals ONLY — negative test: no private journals, no mentor DMs) · Goals & Reentry (goals/milestones/tasks/job apps/résumé + RC rings with pre→now delta) · Giving (permission-gated) · Care & Support (care team, mentor, sessions, mood trend, notes, cadence status)
- [ ] Staff-only cohort compare; NEVER member-facing (negative test)
- [ ] < 2s load on seed; every widget deep-links

## C. Care Team & Staff Engagement
- [ ] care_team_assignments (case_manager/counselor/peer_support/tech/facilitator, primary flag) + staff_engagements tables + RLS (staff see own caseload; admins see org)
- [ ] My Caseload view: assigned clients sorted by risk + last-touch; "untouched 3 days" surfaced
- [ ] Actions from Client 360/caseload/cockpit: kudos (client gets warm notification), nudge, check-in (mood+note), open 1:1 care channel
- [ ] Every touch writes staff_engagements + continuum_event (verified for each kind)
- [ ] Staff task queue: assign follow-ups to staff with due dates + done state
- [ ] No-PHI rule enforced in all touch/message UIs (copy + validation); all touches auditable

## D. Client Portal (In-Treatment mode of existing PWA)
- [ ] Active in_program episode → My Program panel appears atop existing Home (nothing else removed)
- [ ] Today view: today's sessions + assignments + tasks in one glance
- [ ] My Program: curriculum progress, next-up lesson, program badge progress, cohort channel entry
- [ ] My Reentry Plan: client CREATES own goals/tasks (docs/13 tables) with Companion coaching; staff co-plan visibility
- [ ] Kudos inbox with celebration styling (staff kudos + peer cheers)
- [ ] Kiosk mode: PIN/QR quick-login on shared devices, session-scoped, auto-logout, no notification persistence
- [ ] Center policy toggles (org Settings): community access by phase, quiet hours, portal-only early phases — enforced, not hardcoded
- [ ] Gamification identical in portal (streak/points/badges/certificate) — continuity verified

## E. Engagement Toolkit
- [ ] Challenges: staff-created, time-boxed, cohort-scoped, opt-in, challenge badge, NO public loser-boards (negative check)
- [ ] Events calendar: create → RSVP → reminder → attendance → continuum_event; alumni events linkable to sponsored placements
- [ ] Pulse surveys: 1–3 questions to cohort, anonymous-to-peers, staff trend view on cockpit
- [ ] Announcements gain read receipts
- [ ] Milestone spotlight: one-click staff celebration to org feed WITH client consent prompt

## F. ROI & Executive Reporting
- [ ] mv_roi_inputs (monthly per org: enrolled/completed/dropout/engaged-days/staff touches/alumni retained/sessions)
- [ ] ROI dashboard (center_admin): assumptions panel × measured actuals → monthly + annualized ROI, math shown transparently
- [ ] New Freedom benchmark lines labeled as case-study reference, not guarantee
- [ ] Executive one-pager: branded PDF (outcomes + retention + RC deltas + ROI + Claude narrative)
- [ ] Staff-touch → outcome correlation view (from staff_engagements × outcomes)

## G. Marketing Page Update (extends docs/15 page; everything existing kept)
- [ ] "Build your programming" section: template gallery + composer showcase
- [ ] "See the whole person" section: Client 360 + ribbon showcase
- [ ] "Every employee, engaged" section: care team/kudos/caseload story
- [ ] "A portal your clients actually use" section: Today view/reentry plan/kiosk/gamification continuity
- [ ] Interactive ROI calculator: sliders (census, completion, episode revenue, clinician hours) → estimated annual impact, honest footnote, "Get your full ROI analysis" → demo lead
- [ ] Nav/anchors refreshed; citations intact; "Facebook" grep still zero; desktop + mobile

## H. Dashboard IA
- [ ] Left nav updated: Overview · Programs · Participants · Caseloads · Mentorship · Community · Giving · Engage · Reports · Settings; nothing orphaned; role gating correct

## Seed
- [ ] Desert Hope: 3 live programs with cohorts, generated sessions, attendance history
- [ ] Danielle: enrolled IOP Core, care team of 3, kudos + nudges + check-in history, 1 challenge joined, pulse responses, Client 360 fully alive incl. pre-care baseline
- [ ] ROI dashboard + executive one-pager render meaningfully from seed; marketing ROI calculator defaults produce sane numbers

## Regression Guard (every run)
- [ ] All existing suites green; anti-toxicity (no member-facing comparisons), privacy (no journal/DM leaks), no-PHI rules re-verified
- [ ] Existing member app surfaces unchanged except the additive My Program panel + policy toggles
