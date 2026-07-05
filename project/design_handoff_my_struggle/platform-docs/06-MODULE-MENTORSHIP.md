# 06 — Module: Mentorship

## Purpose

Pair people in need with mentors who have lived similar experiences — trust, hope, accountability. The product must make mentoring easy enough that a mentor with a full-time job can meaningfully guide 2–3 mentees from their phone.

## Mentor Lifecycle

1. Apply (public form → dashboard queue): story, lived-experience tags, specialties (life skills, career, education, recovery, reintegration, emotional support), availability
2. Staff review → background check status tracked → training course assigned via LMS (mentors are LMS users too) → `training_completed` gate
3. Activated with capacity (default 3 mentees)

## Matching

- v1 is **staff-assisted matching**: dashboard shows mentee needs vs mentor specialties/lived-experience overlap, capacity, and org proximity, with a simple score; staff confirm the match. (Auto-matching is v2 — trust requires a human in the loop first.)
- Match proposed → both sides accept in-app → `mentorships.status=active` → intro thread auto-created with icebreaker prompt

## The Relationship Surface

**Mentee view (`/chat` + mentor card on Home):** my mentor, next check-in nudge, message thread, session history, "How are you today?" mood check-in (1–5, optional, feeds mentor + staff visibility)

**Mentor view (mentor role in same PWA):** mentee roster with health-at-a-glance (streak, course %, last active, last mood), thread per mentee, one-tap session logging (mode, duration, note), celebration shortcuts ("Send a badge cheer"), escalation button ("I'm concerned about this mentee" → staff alert)

## Session Logging & Accountability

- Every session logged → `mentorship_sessions`; notes visible to mentor + org staff only, never public, never to donors
- Mentor inactivity nudges (no contact 14d with an active mentee → email)
- Mentor recognition: Steady Hand badge line, mentor leaderboard opt-in on dashboard, annual impact summary ("You gave 46 hours across 3 journeys this year")

## Boundaries (product-enforced)

- Messaging only inside mentorship threads; no free-form DMs platform-wide
- No money flows between mentor and mentee in-product; UI copy explicitly discourages out-of-band lending
- Mood check-ins of 1 two times consecutively → staff visibility flag (supportive outreach, framed as care not surveillance)

## Done When

- Full lifecycle works: apply → approve → train → match → accept → chat → log session → dashboard reflects it
- Mentor cannot see mentees outside their `mentorships` rows (RLS negative test)
- Concern escalation reaches org staff email within one minute
