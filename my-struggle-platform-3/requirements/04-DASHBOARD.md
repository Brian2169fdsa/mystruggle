# 04 — CENTER DASHBOARD REQUIREMENTS (desktop 1440; Overview also verified at 768)

## Shell
- [ ] Navy sidebar: wordmark, Overview · Participants · Mentorship · Learning · Community · Giving · Reports · Settings; active = blue bar + tint
- [ ] Org switcher for ms_admin (cross-org god view); role gating per docs/08
- [ ] Global search (members by name/number)

## Overview
- [ ] Program KPI card row: PON · VOC · IOP · NAV enrollment counts, giant blue tabular numbers, date-range edit per card
- [ ] Second KPI row: Active Members · Avg Engagement 7d · Course Completion % · Active Mentorships · Funds Raised 30d · At-Risk
- [ ] Engagement trend chart (30/90d toggle) with 65% goal line; journey-stage funnel; loads < 2s on 500-member seed (MVs)
- [ ] "Needs attention" queue: at-risk members, pending approvals (goals/stories/photos/mentors), moderation items, mentor concerns — each row deep-links
- [ ] Recent milestones ticker

## Participants
- [ ] Roster table: search + filters (stage, risk, program, course %, mentor status, enrollment status incl. discharged/alumni), stage chips, risk flags, CSV export
- [ ] Discharged/alumni members remain visible with ongoing activity (verified with seed data)
- [ ] Detail page: journey timeline, engagement sparkline, courses + %, mentorship + sessions, balances + ledger (permission-gated), consent panel with approval controls, staff notes
- [ ] Actions: enroll single + CSV bulk invite, assign course, propose match, change stage (reason required), print QR/ID card
- [ ] Risk flag logic: 7d watch / 14d at_risk / 21d session gap (nightly cron, verified by manipulating seed dates)

## Mentorship
- [ ] Application review queue · match workbench · mentor roster with capacity/activity · session log audit · concern escalations inbox

## Learning
- [ ] Course builder: create course (program, delivery mode), modules/lessons drag-order, block editor (video/rich text/journal/quiz/discussion/testimonial), publish toggle, preview-as-member
- [ ] Assignment manager: assign to org/stage/individual, due dates, notification fire
- [ ] Completion heatmap (members × lessons) · journal review pane (assigned staff only, flag highlights)
- [ ] 8 ISE course shells seeded under PON

## Community
- [ ] Announcement composer with pinning
- [ ] Moderation queue: pending/flagged posts with Claude recommendation context, approve/flag/remove one-click, full audit trail
- [ ] Reported content inbox · member mute/suspend with reason
- [ ] Crisis alert log view (who was alerted, when, resolution note)

## Giving
- [ ] Giving analytics: scans→conversion funnel, recurring donors, avg gift, split utilization (cash vs credits vs reentry)
- [ ] Approval queues: goals, public stories, photos (consent checklist enforced in UI)
- [ ] Cash redemption desk: scan member card QR → identity confirm → amount (daily cap enforced) → dual-record ledger entry
- [ ] Store credit redemption recorder per store location; stores CRUD (ms_admin)
- [ ] ID card + QR card batch print (brand PDF templates)
- [ ] Ledger export CSV; receipts resend

## Reports
- [ ] Outcomes: stage-transition rates, 3/6/12-month post-discharge retention cohorts, engagement-vs-outcome view
- [ ] New Freedom benchmark lines (65/65/80) on relevant charts
- [ ] Branded PDF export + CSV; date range + cohort filters
- [ ] "Narrative summary" button → Claude-drafted quarter story, editable before save
