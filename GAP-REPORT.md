# Gap Report — run 2026-07-05-7 (centers page + community ad product)

## Run 7 summary
Shipped the "For Recovery Centers" marketing expansion + the Community Ad
Product, all trust rules enforced IN CODE and negative-tested live:
- /centers expanded: animated relapse-risk curve, cited stat spine (6 stats
  w/ footnotes), three blind spots, deliver-programming, stay-connected
  cadence, reach-the-community ad section, prove-outcomes, Danielle 5-phase
  scroll, placeholder pricing tiers, trust/privacy, demo-lead capture form.
- Ad product data layer (seed v8): sponsored_placements + placement_events
  + demo_leads; 3 approved/running + 1 pending + 1 rejected("alcohol") + 6
  leads seeded. screenPlacement() content policy. Kill switch.
- Feed serving: labeled "Sponsored by [Center]" cards, frequency cap
  (everyN 5), dismiss/report/reduce controls.
- Dashboard: Ad Manager (create/lifecycle/aggregate metrics), Ad Review
  console (approve/reject/kill switch), Demo Leads queue.
- VERIFIED live: crisis member served 0 ads (Tyrell: 1→post crisis→0);
  gambling/alcohol rejected 400; advertiser reads expose 0 memberId;
  no health/diagnosis targeting field exists (structurally impossible);
  frequency cap live; zero "facebook" in new code. Build passes.
- Homepage: 3 real photos wired (Danielle spotlight, GED + pantry cards).
- AI Guide chat widget replaced the floating PROTOTYPE bar.

## GAP REGISTER — run 7 deferrals
1. **Footer "facebook" grep hit** (DECISION NEEDED): footer links to the
   org's real facebook.com page — the module's zero-facebook grep rule hits
   it. Keep the real social link or remove the FB icon? Awaiting user.
2. Ads: real Claude-review gate (keyword screen is the stopgap); a distinct
   ms_admin role (staff currently acts as ms_admin); Resend email notify on
   new leads; scheduling window enforcement (status is source of truth).
3. Continuum requirements/11 still open (intake consent handshake, care
   channels, LOC targeting/kiosk, transition/discharge, alumni dashboard +
   relapse early-warning, licensed outcomes data product + de-id k≥11,
   program cockpit) + the continuum-event hooks on live routes.
4. Carried: AI Companion (plan-aware Guide), dashboard My Plan/résumé/BARC
   panes, milestone→journey_task mirror, report/block, real PDF export,
   employer accounts + posting flow, Supabase schema for all new tables,
   requirements/10+11+12 checkbox audits with per-item evidence.
5. Standing DECISIONS-NEEDED: Stripe keys, Supabase keys, verbatim copy,
   GitHub-app push connection, real prices for /centers pricing tiers.

# Prior run — 2026-07-05-6 (fixes + continuum of care)

## Run 6 summary
Quick fixes shipped + pushed: footer text readability (inline color
fallbacks — arbitrary utilities weren't rendering), street address removed,
phone → 602-402-5121, hero "Become a mentor" forced white, FOR EMPLOYERS
band on Home, HIRING card on the community rail, and the "Treatment ends.
The continuum doesn't." ribbon story on /centers. In flight this run: AI
Guide chat widget replacing the floating PROTOTYPE bar; continuum-of-care
data spine (care_episodes / phase_transitions / continuum_events + seed v7
Danielle 5-phase storyline + /api/continuum); dashboard continuum ribbon.
Note: Fable ran out of credits mid-run (5 agents died); resumed on Opus,
re-verified partial edits, completed the missing EmployerBand.

## GAP REGISTER — run 6 deferrals (per user instruction)
1. **PHOTOS NOT IN REPO**: user's images (Danielle member-story portrait,
   GED celebration, pantry restock, day-at-center video, Position of
   Neutrality) were expected in GitHub but are absent as of this pull.
   When present in public/, wire them into: Home Danielle spotlight
   (replace striped placeholder), Home social wall (GED + pantry + center
   video cards), and the PON section. Currently still striped placeholders.
2. **Continuum-event hook wiring**: emitContinuumEvent() helper exists but
   the live routes (posts create, lessons/complete, donations, sessions,
   BARC) don't call it yet — new activity won't append to timelines until
   wired. (Seed backfills Danielle's history so the demo ribbon is alive.)
3. Continuum requirements/11 remaining: intake consent handshake, in-program
   care_channels (staff↔client + cohort group + announcements), LOC course
   targeting + kiosk mode, transition/discharge planning, continuing
   follow-up cadence 30/60/90/180/365, alumni dashboard + relapse-risk,
   the licensed outcomes data product (mv_continuum_score/care_outcomes/
   efficacy + two data planes + de-identification k≥11), program cockpit.
4. Employer accounts / dashboards (create-a-dashboard for employers to post
   jobs into the system) — messaging in place ("contact us / coming soon");
   the actual employer role + posting flow is not built.
5. Carried from run 5: AI Companion (plan-aware Guide), dashboard My Plan /
   résumé / BARC panes, milestone→journey_task mirror, report/block, real
   PDF export, Supabase schema for the 9 expansion + continuum tables.
6. Standing DECISIONS-NEEDED: Stripe keys, Supabase project keys, verbatim
   copy, GitHub-app push connection.

# Prior run — 2026-07-05-4/5 (website expansion + community expansion)

## Run 4 summary (website)
Footer redesigned for contrast (hairline, #8FBCF0 headings, sky-tint links);
nav gained Giving + For Centers; new /giving (canonical 50/50: half now —
unhoused or currently incarcerated — half held as Reentry Fund, released on
re-entry) and /centers (platform pitch: client messaging, programming, LMS,
dashboard); ALL "The Store / Store Credits" language replaced site-wide.

## Run 5 summary (community expansion — docs/13, additive-only honored)
All six agents landed, verified, zero regressions (existing feed/giving/
gamification/mentorship E2E checks re-passed by each agent):
- Circles: 6 seeded, join/leave, circle-scoped posts (main feed excludes),
  alumni center-privacy (negative-tested), Proud/Same-here reactions
  (heart contract byte-compatible), daily reflection ritual, crisis +
  moderation inheritance verified.
- Recovery Goals + My Plan: goals API w/ linked funding (create-or-link),
  milestones w/ tracker-style toggles, achieve → +25 pts (idempotent),
  visibility tiers (mentor/staff negative-tested), job-application tracker
  w/ forward-only ladder + stale detection; My Plan card on Home.
- Résumé builder: /resume 6-step fair-chance builder (autosave, lived-
  experience strength inserts, no-legal-advice guardrail), clean_blue
  template, /resume/print browser-PDF.
- Profiles + BARC: consent-gated /community/u/[slug] w/ activity-derived
  recovery-capital rings (never clinical), profile settings, warm BARC-10
  check-in w/ member+assigned-staff-only trend; post authors now link to
  profiles.
- Analytics (systems pass): mentors see ONLY their own mentees (zero
  cross-mentor leakage, negative-tested); staff per-center rollups incl.
  recovery-capital averages + goals-achieved trend on Reports.
- Seed v6: deterministic (byte-identical reseeds, 65ms) — Danielle flagship
  storyline exact; 191 circle memberships, 42 goals, 22 job apps, 11
  résumés, 28 BARC checks.

## GAP REGISTER — not reached this run (per user instruction)
1. AI Companion (docs/13 Part E): plan-aware Guide extension (goal
   coaching, résumé coach mode, interview practice, daily check-in,
   scoped tools w/ member confirmation, memory wipe). Guide remains the
   existing canned quick-chip assistant.
2. Dashboard participant detail: My Plan pane, résumé view, BARC trend,
   Companion transcript (docs/13 dashboard additions — Reports/Overview
   done, detail pane not).
3. Milestones → journey_tasks bidirectional mirror (creates_journey_task).
4. Peer nomination / staff-rotated spotlight; gratitude/win-of-week
   threads beyond the daily prompt; milestone auto-celebration for goal
   achievements + shared BARC upticks (grace opt-out).
5. Report/block controls on posts; member-level block.
6. Real PDF library for résumé export (browser print today); resume
   shareable link; version history / multiple résumés.
7. BARC domain vocabulary alignment (seed uses sobriety/self-care…, UI
   uses housing…finances — API accepts both shapes).
8. requirements/10 checkbox audit with per-item evidence (next AUTOPILOT
   audit run) + merge of *-UPSTREAM.md requirement bundles.
9. Supabase schema/policies extension for the 9 new expansion tables.
10. Prior DECISIONS-NEEDED still open: Stripe links/keys, Supabase project
    keys, real photography, verbatim copy confirmations.

# Prior run — 2026-07-05-3

## Run 3 summary
Shipped the desktop Facebook-style recovery community at /community: 3-column
shell, 5 topic channels (jobs/housing/recovery/gratitude), composer with the
ask-for-support flow (creates a real weekly goal + posts it with a live
progress bar and Give button to the member's giving page — verified E2E as
Danielle), hearts/comments, cursor pagination + polling, crisis-held 988 care
card, signed-out read-only with join card, profile/channels rail, live
stats + Support Board rail, full site-chrome integration + Home teaser.
Backend: post topics, request-linked posts, GET /api/posts filters/cursor,
public /api/community/stats + /api/requests/board (consent-gated).
Supabase migration package complete and verified against a real Postgres 16:
schema.sql (16 tables, 10 enums, integer cents), policies.sql (49 RLS
policies, ALL negative tests passing live: anon sees no PII, members can't
forge balances/authors, DMs participant-only, consent revocation removes
public rows), seed.sql (flagship demo), docs/13-SUPABASE-MIGRATION.md
(route→table→role map covering all 28 API routes, 8-phase cutover),
requirements/08-COMMUNITY.md. Remaining to go live on Supabase: a project +
keys (DECISIONS-NEEDED #2). Next run: AUTOPILOT audit pass on the community
checklist, journal persistence, dashboard error/tablet states, Privacy/Terms,
auth rate limiting.

# Prior run — 2026-07-05-2

## Run 2 summary
Closed P0 #1 and P1 #5–7. Admin surface is now staff-gated end-to-end
(verified role matrix: anonymous 401 on all admin routes/moderation/
redemption; staff full access; mentors sessions-only; members neither;
dashboard shows a staff sign-in gate — demo login sarah@themystruggles.com).
Consent revocation propagates live (dashboard toggle → /p/[slug] generic
state, verified round-trip). Mentor applications: real public intake with
validation + anti-spam, staff queue with new→contacted→approved. Concern
escalation: quiet mentor sheet → staff needs-attention queue with resolve
(one live demo concern seeded: Marcus → Tyrell). Remaining P0s (Stripe,
Supabase/RLS, session hardening) still wait on DECISIONS-NEEDED credentials;
next run: journal persistence + quiz grading, dashboard error/tablet states,
Privacy/Terms pages, rate limiting on auth endpoints.

# Prior run — 2026-07-05-1

## Summary
Bootstrap run: authored `/docs` + `/requirements` (281 items) and audited the
entire codebase against them with executed verification (full API sweep,
SSR greps, giving/moderation/chat round-trips). Built this run: deterministic
500-member seed (2 centers, 8 mentors, 12-month history), Donate mega-menu +
working newsletter + PWA manifest, live Reports (retention cohorts,
giving-by-month, CSV export), real cash-redemption API + Giving Desk flow
($100/day cap, PIN, balance debits), real session logging, LMS backend
(courses/enrollments/lesson completion → points/levels/streaks), and the
crisis-alert path (text screening → held from feed → 988 resources → pinned
moderation card). Trajectory: core demo loops are real end-to-end; the
remaining P0s are infrastructure (auth roles, payments, database).

## Completion by surface
Audited at 43% overall (120/281) BEFORE this run's builds landed; items
closed this run are being checked with evidence as they verify. Post-run
estimate in parentheses.

| Surface | Audited % | Verified how |
|---|---|---|
| Website (01) | 74% (→ ~85%) | curl + SSR greps, newsletter API round-trip |
| Member app (02) | 37% (→ ~55%) | login flows, lesson completion E2E |
| Mentor app (03) | 30% (→ ~40%) | session POST E2E, thread polling |
| Dashboard (04) | 27% (→ ~45%) | redemption E2E, reports API, moderation actions |
| Public giving (05) | 52% | full donate loop incl. goal funding |
| APIs/data (06) | 71% (→ ~80%) | 17-handler sweep w/ cookie jars (`scratchpad/audit.sh`) |
| System/auth (07) | 15% (→ ~20%) | negative tests (unauthenticated admin reads succeed = open P0) |

## Spot-check results
Audit re-verified volatile items after the mid-run reseed: seed KPIs
(500 members, $82,565 given), feed cap ≤50, public-member payload, QR SVG,
moderation openness — all hold. Danielle flagship intact (#039521464,
64/58/240, Silver 640) after redemption testing used generated members only.

## REGRESSIONS
None found.

## Closed this run
- Seed hard rule — ✔ 500 members / 2 centers / 2,500 donations / 340 sessions,
  deterministic (identical totals across two reseeds), generation 126ms
- Donate mega-menu (guide §4) — ✔ SSR contains DIRECT SUPPORT panel, drawer parity
- Newsletter — ✔ POST 200/409/400 round-trip; success state
- PWA basics — ✔ manifest + 3 icons serve 200
- Reports live — ✔ cohorts from 500 members, giving-by-month sums $82,330, CSV export
- Cash redemption — ✔ happy path/wrong PIN/cap/insufficient all verified (400/404/422)
- Sessions API + logging — ✔ mentor POST → member history (see agent evidence)
- LMS — ✔ 6 courses + 438 enrollments seeded (SEED_VERSION 3); Danielle
  lesson-3 completion E2E: points 640→650, streak 12→13, level recompute,
  idempotent re-complete (alreadyDone, no re-award), persists across restart;
  Learn tab renders real rings; celebration posts name the real course
- Crisis path — ✔ crisis text held from feed, 988 resources returned, queue pins it
- API bug: mood=0 now 400s instead of coercing to 1

## Open gaps (priority order)
### P0
1. Admin surface demo-open: no staff role; unauthenticated reads of all
   member balances + moderation actions. Needs role field + gating.
2. Payments: donations are trusted JSON, no Stripe Checkout/webhook/receipts;
   tier CTAs have no Stripe URLs (need the org's live links).
3. No database: in-memory store resets on Vercel cold starts; Supabase + RLS
   migration unbuilt (store is the designed seam).
4. Session hardening: demo SESSION_SECRET fallback, no rate limiting.
### P1
5. Consent toggles not operable (no PATCH API → revocation can't propagate).
6. Mentor application form submits to nowhere (needs endpoint + dashboard queue).
7. "I'm concerned" escalation is a dead link; roster health chips static.
8. Journal drafts not persisted; quiz ungraded.
### P2–P3
9. Dashboard statics: program KPIs (no programs data model), engagement trend,
   funnel, needs-attention queue; tablet layout; error states.
10. Website: real photography slots, Privacy/Terms pages, real FAQ/mission
    copy confirmation, Amazon/Stripe link verification.

## DECISIONS-NEEDED (for the human)
1. Stripe: provide the live subscription/donate URLs (or keys for Checkout)
   to make money paths real.
2. Supabase: provide a project URL + keys to start the DB/RLS migration.
3. Staff auth: OK to add a "staff" role + gate /dashboard + admin APIs behind
   it (adds a staff demo login)?
4. Real photography for the striped placeholder slots (Danielle portrait,
   story grid, social wall).
5. Confirm verbatim copy: mission paragraphs, Brian Reinhart quote, FAQ
   answers, tier descriptions.

## Recommended focus for next run
Close P0 #1 (staff role + admin gating — fully buildable without external
credentials), then P1 #5–7 (consent PATCH, mentor-application intake,
concern escalation), then dashboard error/tablet states. Payments/DB wait on
DECISIONS-NEEDED credentials.
