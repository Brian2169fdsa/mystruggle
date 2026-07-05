# Gap Report — run 2026-07-05-3

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
