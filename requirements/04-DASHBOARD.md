# 04 — Center Dashboard (navy sidebar, staff desktop)

Spec: handoff README §Surface D + `docs/08-MODULE-CENTER-DASHBOARD.md`.
Audit 2026-07-05: SSR grep of `/dashboard` + /api/admin/* calls. NOTE: entire dashboard is demo-open — no staff auth (P0, tracked in 07-SYSTEM).

## Shell + sidebar

- [x] Navy sidebar shell: wordmark, section items, staff identity block, canvas content area ✔ verified: /dashboard 200, SSR shows sidebar + "Sarah K."
- [x] Sections: Overview · Participants · Giving desk · Moderation · Reports ✔ verified: SSR lists all five
- [ ] Full spec nav: Mentorship · Learning · Community · Settings sections (docs/08) — missing
- [x] Moderation pending-count badge is live (pending+flagged from /api/admin/posts) ✔ verified: overview.pendingModeration=5 matches admin/posts pending+flagged
- [ ] Staff identity from a real session/role (hardcoded "Sarah K. · Laveen Center · staff")

## Overview

- [x] Live KPI strip computed from store: members, total given, cash held, credits held, reentry savings held, weekly recurring, avg streak ✔ verified: GET /api/admin/overview → members 501, totalGiven 82620, cashHeld 36537.5, weeklyRecurring 652, avgStreak 12.7
- [x] Overview loads fast on the 500-member seed ✔ verified: /api/admin/overview in 0.018s
- [ ] Program KPI row PON/VOC/IOP/NAV real enrollment counts with date-range pill (hardcoded 128/64/43/87 — programs aren't in the data model)
- [ ] Second stat row (engagement 71% vs 65% goal, cash redeemed, savings, avg streak) from live data (static literals that shadow the live values)
- [ ] Engagement trend: 12 bars + dashed green 65% goal line from real activity (hardcoded array)
- [ ] Journey funnel Outreach→Independent from real journey stages (hardcoded; no journey_stage field)
- [ ] Needs-attention queue from real at-risk flags (2 of 3 rows hardcoded; only moderation count is live) — row buttons do navigate
- [ ] Milestones list from real events (hardcoded)

## Participants

- [x] Roster from live data: 500-member seed with name, member #, level, mentor, streak, points, joined ✔ verified: GET /api/admin/members → 501 members with all keys
- [x] Search filters by name/member # ✔ verified: client filter code + live data; SSR renders search input
- [ ] "Needs attention only" toggle uses real risk flags (currently streak===0 proxy)
- [ ] Stage/program/level/mentor filter dropdowns functional (buttons have no onClick)
- [ ] Risk chips per spec (amber "watch" / red-tint "follow up", never red on the name) — no risk model
- [ ] Pagination real ("1 →" is static; table renders full filtered list)
- [ ] "+ New member" enroll flow (button inert; no CSV bulk invite)

## Participant detail

- [x] Header card + balances (cash/credits/savings) + support requests with funding bars from live member data ✔ verified: member objects in /api/admin/members carry balances + requests
- [ ] Tabs Courses / Mentorship / Balances / Consent have content (4 of 5 tabs are "stub in this prototype" cards; only Journey renders)
- [ ] Journey timeline real (hardcoded demo timeline)
- [ ] Consent toggles persist (public page / photo / milestone updates are LOCAL state — no PATCH API; public-page toggle initializes from real consentPublic but toggling changes nothing server-side)
- [ ] Toggling page off actually flips /p/{slug} to the generic state + shows the confirmation copy (API supports generic state, but no way to change consent from the dashboard)
- [ ] "Print ID card" works (no onClick; docs/04 requires branded PDF batch printing)
- [ ] "Record redemption" preselects the member in Giving desk (navigates only)
- [ ] Balances tab shows "$100 daily cap · $N redeemed today" from real redemption records

## Giving desk

- [ ] Step 1 real card scan / member lookup (scan is pre-completed hardcoded "Danielle · $64 available")
- [ ] Step 2 amount picker enforces the $100/day cash cap (cap is display copy only — no enforcement, no redeemed-today tracking)
- [ ] Step 3 staff PIN is a real 4-digit input validated server-side (fake pre-filled dots; Confirm just advances)
- [ ] Completing redemption writes a dual-record ledger entry (card scan + staff PIN) and debits the member's cash balance (client-side arithmetic only; no API; balance untouched — verified /api/auth/me unchanged after UI flow exists)
- [ ] Redemption reflected on participant detail (balance + redeemed-today)
- [x] Split utilization stacked bar from live totals (cash / credits / savings held) ✔ verified: renders overview.cashHeld/creditsHeld/savingsHeld (36537.5 / 32823.5 / 122734)
- [ ] QR funnel real end-to-end (gifts + weekly recurring are live from overview; "1,204 scans" hardcoded — no scan tracking)
- [ ] Store-credit spend recorder per Store location (docs/08) — not built

## Moderation

- [x] Queue lists every post with status from /api/admin/posts, pending/flagged sorted first ✔ verified: GET → 100 posts, statuses {pending, flagged, approved, removed}
- [x] Approve / Flag / Remove are real actions that change post status and public visibility ✔ verified: POST /api/posts/{id}/moderate flag → status flagged → post absent from public GET /api/posts; approve/remove also verified
- [x] Resolving updates the pending badge (refetches posts + overview) ✔ verified: pendingModeration recomputed live
- [ ] AI REVIEW recommendation panels from a real moderation model (synthesized static text per status; docs/05 specifies Claude review rubric)
- [ ] Crisis card real: crisis-language detection, HELD status, staff alert, resources to author (pinned card is a hardcoded "DEMO — crisis handling preview"; "Assign to Sarah" inert)
- [ ] New posts enter the queue as pending before public (posts are auto-approved on create; only seeded posts are pending/flagged)
- [ ] Filter chips ("All posts" / "Resolved") functional
- [ ] Moderation actions audit-logged with actor (no auth → no actor; no moderation_events)

## Reports

- [ ] Retention table per program × 3/6/12-month vs 65/65/80 benchmarks from real cohorts (100% static)
- [ ] Summary cards (stage advances, reached Independent, savings released) from real data (static)
- [ ] Export CSV / PDF functional (buttons inert)
- [ ] Cohort selector functional

## States + responsive

- [x] Loading skeletons on Overview / Participants / Moderation / Giving desk while data loads ✔ verified: skeleton markup in SSR + code
- [x] Empty states (Participants "No members match", Moderation "No community posts yet") ✔ verified: code paths present with live-data render
- [ ] Error states visible on fetch failure (all fetches `.catch(() => {})` — failures leave skeletons forever)
- [ ] Tablet 768 layout (icon-rail 64px sidebar, 2×2 KPI grid) — fixed grids, no breakpoints anywhere in dashboard
