# 08 — Module: Center Dashboard

## Purpose

The org-side command center. A recovery center sees participant engagement in facility AND after discharge, tracks success, assigns content, manages mentorships and moderation, and pulls outcome reports that win grants. This is the surface that makes centers pay for / partner on the platform.

## Navigation (left sidebar, navy)

Overview · Participants · Mentorship · Learning · Community · Giving · Reports · Settings

## Overview (the wow screen)

Top KPI card row (REPrieve pattern — big blue numbers with date-range edit): enrollment counts per program **PON · VOC · IOP · NAV**. Second row: Active Participants · Avg Engagement (7d) · Course Completion % · Active Mentorships · Funds Raised (30d) · At-Risk Count. Below: engagement trend chart (30/90d), journey-stage funnel (intake → in_program → transitional → independent → alumni), "Needs attention" task queue (at-risk flags, pending approvals, moderation items, mentor concerns), recent milestones ticker. North-star benchmarks from the New Freedom case study render as goal lines on charts: engagement 65%, completion 65%, digital scale 80%.

## Participants

- Roster table: search/filter by stage, risk, course %, mentor status, enrollment status (active/discharged/alumni — discharged people REMAIN visible, that's the differentiator)
- Participant detail: journey timeline (enrollments, milestones, stage changes), engagement sparkline, courses + progress, mentorship + session history, goals + ledger (staff-permission gated), consent panel (public profile / photo / story approvals), notes (staff-only)
- Actions: enroll (single + CSV bulk invite), assign course, propose mentor match, record disbursement, print QR card, change journey stage (with reason — feeds mv_outcomes)

## Mentorship

Match workbench (mentee needs × mentor specialties score grid), mentor roster with capacity/activity, application review queue, session log audit, concern escalations inbox.

## Learning

Course builder (07 spec), assignment manager, completion heatmap (participants × lessons), journal review pane (assigned staff only, flagged-entry highlights).

## Community

Org announcement composer (pinned posts), moderation queue with Claude-recommendation context shown, reported-content inbox, member management (mute/suspend with reason).

## Giving

Org + per-participant giving analytics: scans → conversion funnel, recurring donors, goals near completion ("$45 to go — nudge the followers?"), **split utilization** (cash redeemed vs credits spent vs reentry savings held), cash redemption desk (card-scan flow), Store credit redemption recorder per `stores` location, ID/QR card batch printing, receipt/ledger export (CSV).

## Reports (grant gold)

- Outcomes report: stage-transition rates, retention-in-recovery at 3/6/12 months post-discharge, engagement vs outcome correlation
- Export: branded PDF + CSV; date-range + cohort filters
- "Narrative summary" button → Claude drafts the quarter's impact story from the numbers for staff to edit

## Roles

`center_staff`: everything except Settings, disbursements, consent overrides. `center_admin`: all org powers. `ms_admin`: cross-org god view + platform settings + course sharing approvals. All destructive/financial actions audit-logged.

## Done When

- Overview loads < 2s on seeded demo data (500 participants) using materialized views
- A discharged participant's ongoing course + mentor activity is visible in their center's dashboard
- center_staff at Org A gets zero rows for Org B in every view (RLS negative test suite)
