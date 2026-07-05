# 08 — Community Surface (/community) + Supabase Readiness

The desktop-first public community: topic channels, the support-request
flow, and the giving board in one shell. The surface is being built
concurrently — every acceptance item below is UNCHECKED until the next
AUTOPILOT audit exercises it live (dev server + curl/browser, per the loop).
Data contract: `/api/posts` (topic/author/before/limit), `/api/community/stats`,
`/api/requests/board`, `/api/posts/[id]/{react,comments}`, `/api/requests`.

## Shell + navigation

- [ ] /community renders a desktop 3-column shell (left rail · feed · right rail) at lg+; center column is the feed
- [ ] Site nav (app/components/Nav.tsx) links to Community from the marketing site; active state on /community
- [ ] Mobile (<lg): rails collapse (drawer/accordion or stacked below), feed is first in DOM order, 44px touch targets preserved
- [ ] Signed-out state: feed is READ-ONLY (approved posts visible — the feed is public-read); composer/hearts/comments replaced by a "Join the community" prompt into /signup
- [ ] Brand rules hold: Montserrat, one Allura script accent max, no gold on the website, amber (never red) for concern states

## Left rail

- [ ] Profile card (signed-in): avatar tile, first name, level/streak/points; signed-out: join card
- [ ] Channel list: All + the 5 topics (general, jobs, housing, recovery, gratitude) with active-channel highlight
- [ ] Channel selection filters the feed via /api/posts?topic= (URL-reflected, e.g. ?topic=jobs, shareable)

## Feed

- [ ] Approved posts only, newest first; kind styling (regular/win/milestone) matches the member-app feed
- [ ] Hearts: toggle via POST /api/posts/[id]/react, optimistic count, authoritative on response; signed-out → join prompt
- [ ] Comments: expand/collapse, add via POST /api/posts/[id]/comments (≤1,000 chars, inline error on 400)
- [ ] Pagination: "Load more" cursor using nextBefore from /api/posts (before=timestamp), no duplicate/skipped posts across pages
- [ ] Request cards: posts with requestId render the goal (label, raised/weeklyTarget progress) with a Give button → /p/[slug] (only when the author consents — authorSlug non-null)
- [ ] Empty channel state is designed (not blank): invite to post in that channel

## Composer

- [ ] Signed-in members/mentors: body ≤2,000 chars with counter, kind picker (regular/win/milestone), topic picker defaulting to the active channel
- [ ] Support-request flow: attach one of my active requests (from /api/requests) OR create one inline (label + weekly target $1–$10,000) then attach; posted via requestId
- [ ] Crisis handling: when POST /api/posts returns { held: true, resources }, the UI shows the supportive resources panel (988 line + "care team will reach out"), does NOT show the post in the feed, and does not error
- [ ] Validation errors (empty body, over-limit) render inline, never as raw alerts

## Right rail

- [ ] Community stats card from /api/community/stats: members, posts this week, active/funded requests, given this month
- [ ] Support board: /api/requests/board cards (first name, avatar tile, label, progress bar, Give → /p/[slug]), max 12, newest first
- [ ] Stats and board degrade gracefully when fetches fail (skeleton → quiet fallback, no layout jump)

## Supabase readiness (this package — see docs/13-SUPABASE-MIGRATION.md)

Verified against a scratch Postgres 16 + Supabase auth stub on 2026-07-05
(no live Supabase project exists yet — hosted re-verification is phase 1–2
of the cutover checklist):

- [x] supabase/schema.sql: complete runnable DDL — 10 enums, 16 tables, uuid pks with defaults, created_at timestamptz defaults, FKs, feed/roster/giving indexes ✔ verified: applied cleanly with ON_ERROR_STOP (SCHEMA-OK); enum labels cross-checked against every app/lib/types.ts union
- [x] supabase/policies.sql: RLS enabled on all 16 tables, 49 policies, security-definer public_members + public_request_board views, negative-test blocks per table ✔ verified: applied cleanly; pg_tables shows zero rowsecurity=false; zero tables without a policy
- [x] RLS negative tests pass ✔ verified live: anon reads 0 profiles; Andre (consent off) absent from public_members; member cannot forge cash_cents (0 rows), forge post author/heart reactor (RLS violation), read another pair's DMs (0 rows), or see concerns/sessions about themself (0 rows); mentor can't read applications/other mentors' sessions; member↔member DM RPC rejected; staff consent revoke drops the member from public_members immediately
- [x] supabase/seed.sql: flagship demo rows only (Danielle #039521464 with story/goal/balances-in-cents, Tyrell, Andre, Marcus, Sarah, 2 centers, 2 requests, 2 hand-written posts + hearts + comment, 2 DM threads, 6 courses + Danielle's 3 enrollments); bulk 500-member seed documented as a store.ts→CSV script, not inlined ✔ verified: applied cleanly (SEED-OK); danielle row = slug danielle, #039521464, cash 6400¢, Silver
- [x] Money modeled as integer cents with the float-dollar conversion documented (×100 in, /100 out, floor/remainder split) ✔ verified: schema.sql header + docs/13 §(d)
- [x] docs/13-SUPABASE-MIGRATION.md: env vars, packages, auth swap (Supabase Auth replaces HMAC cookie, demo logins preserved), route→table→role map covering all 28 app/api route files (glob-enumerated), kill list, 8-phase cutover checklist with verification gates, rollback flag ✔ verified: route map count matches `app/api/**/route.ts` glob (28)
- [ ] Hosted verification: schema+policies+seed applied to the real Supabase project and negative-test script green (blocked on credentials)
- [ ] Route handlers swapped table-by-table behind DATA_BACKEND flag (phases 4–6 of docs/13)
