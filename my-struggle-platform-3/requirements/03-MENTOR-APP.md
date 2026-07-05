# 03 — MENTOR APP & MENTORSHIP SYSTEM REQUIREMENTS

## Mentor Lifecycle
- [ ] Public application form (website) → dashboard review queue
- [ ] Application review screen: story, lived-experience tags, specialties, approve/decline with reason
- [ ] Background check status tracking field (manual v1) — mentor CANNOT be activated without status=cleared (enforced in code)
- [ ] Mentor training course auto-assigned on approval; training_completed gates activation
- [ ] Capacity setting (default 3); capacity respected by match workbench

## Matching
- [ ] Staff match workbench: mentee needs × mentor specialties/lived-experience overlap score grid, capacity + activity shown
- [ ] Propose match → both sides receive in-app accept/decline → active on dual accept
- [ ] Intro thread auto-created with icebreaker prompt on activation

## Mentor Mobile Views (same PWA, mentor role)
- [ ] Mentee roster: cards with health-at-a-glance (streak, course %, last active, last mood, days since last session)
- [ ] Mentee detail: journey snapshot, session history, goals note
- [ ] One-tap session logger sheet: mode (in-person/call/video/chat), duration, note (staff-visible only)
- [ ] "Send a badge cheer" celebration shortcut → mentee notification
- [ ] "I'm concerned" escalation button → staff email < 60s, discreet confirmation
- [ ] Mentor feed access + mentors_only audience posting

## Accountability
- [ ] Mood check-ins visible to mentor + staff; two consecutive 1s → staff visibility flag
- [ ] Mentor inactivity nudge email (no contact 14d with active mentee)
- [ ] Mentor annual impact summary view ("46 hours across 3 journeys")
- [ ] Steady Hand badge line fires at 10/25/50 sessions
- [ ] RLS: mentor sees only own mentees (negative test); session notes never public/never donor-visible
