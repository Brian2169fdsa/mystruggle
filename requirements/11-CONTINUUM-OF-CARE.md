# 11 — CONTINUUM OF CARE REQUIREMENTS
# EXPANSION — extends enrollments/LMS/community/giving/dashboard/Guide. Replaces nothing. No regressions each run.

## A. Care Record Spine
- [ ] care_episodes + phase_transitions + continuum_events tables + RLS (member owns; center sees only consented episodes)
- [ ] care_phase (pre_care/intake/in_program/transition/continuing) tracked per episode alongside existing journey_stage (neither replaces the other)
- [ ] level_of_care on episodes (detox/residential/php/iop/op/recovery_maintenance)
- [ ] phase_transitions append-only; every phase/LOC change logged with reason + actor
- [x] continuum_events emitted via thin hooks from EVERY existing module (community, lms, goal, giving, mentorship, companion, checkin, session, phase) — modules extended, not rewritten (verify each source writes an event)
- [x] Single write path, many readers: score, risk, timeline UI, and export all read continuum_events

## B. Pre-Care (the differentiator)
- [ ] Unaffiliated member can fully use community/giving/goals/Companion with zero center
- [ ] No center can see a pre-care member until member consents to connect
- [ ] Pre-care history shared to a center only on explicit separate opt-in
- [ ] Baseline recovery-capital captured pre-care so during/after deltas are provable (seed proves it)

## C. Intake & Consent Handshake
- [ ] Center connects member (invite+consent OR outreach enrollment)
- [ ] Granular, revocable consent grant to a SPECIFIC center for continuum access (extends existing consent panel)
- [ ] Revocation cuts center access to future data within minutes; audit-logged
- [ ] Intake content/orientation assignable

## D. In-Program: Center↔Client Communication (NEW, engagement not clinical)
- [x] care_channels + care_messages tables + RLS + moderation pipeline reuse
- [x] Program group channel (IOP cohort) — schedule/assignments/discussion, moderated
- [x] 1:1 staff↔client channel (reminders, check-ins), staff-auditable, distinct from mentor chat + public feed
- [x] Announcement (one-way broadcast) channel
- [x] UI + policy bar PHI/clinical notes in messages (copy warns staff); negative test: no clinical fields exist
- [ ] Realtime delivery + read receipts + notifications

## E. In-Program: Level-of-Care Programming (extends LMS docs/07)
- [ ] level_of_care targeting on courses/assignments; facility vs remote delivery context
- [ ] In-facility/kiosk consumption mode; attendance + completion feed continuum_events
- [ ] Group-facilitated sessions tied to program group channel with attendance
- [ ] Gamification identical inside facility and outside (continuity verified)
- [ ] Live per-cohort + per-client engagement analytics for staff

## F. Transition
- [ ] Discharge-planning surface: aftercare recovery goals (docs/13), post-discharge mentor match, suggested continuing circles
- [ ] Step-down logged in phase_transitions; discharge_type captured

## G. Continuing (post-discharge outcomes engine)
- [ ] Member retains all features; center retains consented visibility indefinitely
- [x] Automated follow-up cadence 30/60/90/180/365d (Companion/staff), each writes continuum_event + optional BARC pulse
- [x] Alumni dashboard: post-discharge roster, continuum score, cadence status, re-engagement queue, relapse-risk early-warning (engagement dip)

## H. Data Product (licensed outcomes)
- [x] mv_continuum_score (0–100 rolling engagement index per person, all phases)
- [x] mv_care_outcomes (phase-transition rates, completion by LOC, retention-in-recovery 30/60/90/180/365d, recovery-capital pre→during→post deltas)
- [x] mv_efficacy (engagement-vs-outcome correlation)
- [x] Two separated data planes: identified-consented-single-center vs de-identified-aggregated-licensed (code-enforced; licensed path cannot read identifiable fields — negative test)
- [x] De-identification: min cohort size k≥11, no small-cell/rare-combo leakage, aggregate-only export
- [ ] Member research-use opt-out that still allows full platform use
- [ ] Governance gates from docs/10 §6 enforced; licensing blocked until counsel items checked (surfaced, not bypassed)

## I. Dashboard (extends docs/08)
- [ ] Continuum ribbon view: full timeline pre_care→continuing with engagement sparkline + module event markers (the demo screen)
- [x] Program cockpit: cohort roster, group channel, live engagement, attendance, completion, mid-program at-risk flags
- [x] Alumni/continuing dashboard (per G)
- [ ] Outcomes reporting extended: pre→during→post recovery-capital deltas, retention curves, efficacy correlation, branded PDF + Claude narrative

## J. Website "For Recovery Centers" (extends docs/01/12)
- [ ] Section/nav "For Recovery Centers"; hero "Treatment ends. The continuum doesn't." with animated before/during/after ribbon
- [ ] Three-blind-spots explainer (before / after / engagement=efficacy)
- [ ] Live-looking demo dashboard from seed (continuum ribbon + outcomes curves)
- [ ] ROI/outcomes section with published case-study benchmarks (40→65 / 50→65 / 30→80 / +20% / 2hrs)
- [ ] "How the community follows them into the world" plain-language explainer tying community+goals+giving to center outcomes
- [ ] Data & privacy/consent/licensing trust section
- [ ] Request-a-demo / Partner CTA → lead capture
- [ ] Desktop + mobile for every new page

## K. Coherence & Seed
- [ ] Seed-Danielle traverses ALL FIVE phases end to end (pre_care → continuing) with events from every module on her ribbon
- [ ] 60+ seeded members distributed across phases/LOCs with 12-mo histories so cohorts, curves, cockpit, and alumni dashboard all look alive
- [ ] De-identified export produces valid aggregate outcomes from seed (min-cohort enforced)
- [ ] The full coherence storyline (docs/14) demonstrable in a click-through

## Regression Guard (every run)
- [ ] All existing tests green; enrollments/journey_stage/LMS/community/giving/dashboard untouched except documented extends in DECISIONS.md
- [ ] No module rewritten to emit continuum_events — hooks only
