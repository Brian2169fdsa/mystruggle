# 07 — LMS & GAMIFICATION REQUIREMENTS

## LMS Engine
- [ ] Course → Module → Lesson hierarchy; program category (PON/VOC/IOP/NAV/other); self_paced vs group_facilitated
- [ ] Lesson blocks all functional: video (progress tracked), rich_text, journal (private: member + assigned staff; ≥20 chars to complete), quiz (pass %, retry), discussion (spawns org feed thread), testimonial
- [ ] Sequence locking; completion rules enforced server-side
- [ ] Assignments: org-wide, journey-stage, individual; due dates; notifications; overdue state
- [ ] Group-facilitated mode: cohort schedule display + staff attendance marking
- [ ] Offline journal: IndexedDB draft survives airplane-mode round trip (scripted test)
- [ ] 8 ISE course shells seeded (PON) + 1 mentor training course + 1 VOC sample + video library seeded across 3 categories

## Points (append-only points_events, all values configurable in one constants file)
- [ ] Lesson complete +10 (per-lesson override) · course complete +100 · daily activity +5 · approved post +5 · session attended +15 · badge bonus per badge
- [ ] Points ledger view on Me tab; totals never drift from event sum (property test)

## Badges (seeded, each with icon, criteria, points)
- [ ] First Step · Course Champion · 7-Day Flame · 30-Day Blaze · 90-Day Inferno · Storyteller · Encourager · Milestone Maker · Homecoming · Steady Hand 10/25/50 (mentor)
- [ ] Badge award engine fires on events (not polling); duplicate-award impossible
- [ ] Earn moment: confetti overlay + optional system post (grace opt-out) + badge sheet with criteria

## Streaks
- [ ] Qualifying activity: lesson progress, journal, session, approved post, video watch
- [ ] Nightly recalculation; timezone America/Phoenix default with per-user override
- [ ] One freeze token per 30 days auto-applied on a single missed day; UI shows token state
- [ ] Current + best streak on Home and Me; 7/30/90 milestones trigger badges

## Levels
- [ ] Bronze 0 · Silver 250 · Gold 1000 · Platinum 2500; cosmetic only (no feature gating — design review item)
- [ ] Level-up moment + profile display

## Anti-toxicity Guarantees (verified by absence)
- [ ] NO public member points leaderboard anywhere
- [ ] NO donation amount rankings or comparisons between members
- [ ] Mentor leaderboard: dashboard-only, opt-in flag respected
- [ ] Streak loss messaging is kind (copy review: no shame language)
