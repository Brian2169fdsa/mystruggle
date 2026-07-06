# 07 — Module: LMS + Gamification

## Purpose

Centers and My Struggle assign structured content — flagship: the **Position of Neutrality Interactive Step Experience (ISE)**, an 8-course guided journey through the 12-step process with videos, journaling, discussion, and testimonials. Gamification turns consistency into visible momentum, because in recovery, streaks ARE the outcome.

## Course Structure

Course → Modules → Lessons. Lesson `content` is a jsonb block array:

```
{ type: 'video',   url, duration_s }
{ type: 'rich_text', html }
{ type: 'journal', prompt }            -- entry saved PRIVATE (participant + assigned staff)
{ type: 'quiz',    questions: [{q, options[], answer_idx}] , pass_pct }
{ type: 'discussion', prompt }         -- creates an org-audience feed post thread linked to lesson
{ type: 'testimonial', video_url, person }
```

`sequence_locked=true` (default): lesson N+1 unlocks on N completion — mirrors the ISE guided-journey design. Completion rule: all blocks touched, quiz passed if present, journal ≥ 20 chars if present.

## Authoring & Assignment

- Dashboard course builder: drag-order modules/lessons, block editor, publish toggle, preview-as-participant
- My Struggle (org 1) courses are shareable platform-wide; centers author private courses
- Assign to: whole org, journey stage, or individual; optional due date; assignment triggers in-app + email notification
- Seed content task: scaffold the 8 ISE course shells with placeholder lessons ready for real media (Position of Neutrality content licensing/coordination is a Brian-side task — build the container)

## Gamification System

- **Points** (`points_events`, append-only): lesson complete (+10 default, per-lesson override), course complete (+100), daily activity (+5), approved post (+5), session attended (+15)
- **Streaks**: any qualifying activity per day (lesson progress, journal, session, post). Nightly cron recalculates; timezone = America/Phoenix default, per-user override. Grace: one freeze token per 30 days (life happens — punitive streaks backfire in recovery).
- **Badges**: seed set in 03-DATA-MODEL. Earning → confetti moment → optional system feed post (grace-period opt-out)
- **Levels**: Bronze (0) / Silver (250) / Gold (1000) / Platinum (2500) shown on profile — cosmetic only, no feature gating
- **No public point leaderboards for participants.** Comparison is toxic in recovery cohorts. Progress is self-relative (my streak, my journey %). Mentor leaderboard on dashboard is opt-in and staff-facing only.

## Programs, Videos & Journey Tasks (REPrieve lineage)

- Courses carry a `program` category — **PON** (Position of Neutrality 12-step) · **VOC** (vocational) · **IOP** · **NAV** (navigation/case management) — powering the dashboard's per-program KPI cards and enrollment counts.
- `delivery`: `self_paced` (default) or `group_facilitated` — group mode shows session schedule info and lets staff mark cohort attendance, mirroring the ISE's dual delivery model.
- Standalone **video library** on the Learn tab with category chips (e.g., published case-study, Motivational, Steps) — watchable outside course flow, counts toward daily streak activity.
- **My Tracker / My Center** on the PWA Home: two progress rings over `journey_tasks` — personal + care-team tasks ("Job interview at ABC Painting") vs program tasks — with one-tap check-off. The Guide (docs/02 AI touchpoint 1) can add tasks conversationally.

## Participant Learn Tab

My assignments (due-date sorted) → course cards with ring-progress and program chips → lesson player (full-screen, mobile-first, video + blocks, autosave journal drafts offline via IndexedDB, sync on reconnect) → completion celebration. Video library section below assignments.

## Done When

- ISE shell (8 courses) seeded; a participant can be assigned, complete a lesson with video+journal+quiz, earn points, unlock the next lesson, and see streak/badge update
- Journal entries invisible to other participants and to non-assigned staff (RLS negative test)
- Offline: journal draft survives airplane-mode round trip
