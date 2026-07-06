# 13 — Supabase Migration Plan (the mechanical swap)

The moment credentials arrive, this executes top to bottom. The in-memory
store (`app/lib/store.ts`) was always the swap-out seam; **the route handlers
under `app/api/` are the stable contract** — no page or component changes,
every route keeps its request/response shape.

Deliverables already in the repo (this package):

| File | What it is |
|---|---|
| `supabase/schema.sql` | Core DDL (v1): 10 enums, 16 tables, FKs, indexes, signup trigger |
| `supabase/schema-expansion.sql` | **Expansion DDL (v2): 21 enums, 21 tables** — community expansion, continuum of care, ad product, + optional employers/job_posts |
| `supabase/policies.sql` | RLS on every v1 table + 49 policies + public views + negative tests |
| `supabase/policies-expansion.sql` | **RLS on every v2 table + 76 policies + consent helpers + `placement_stats()` RPC + negative tests** |
| `supabase/schema-run9-10.sql` | **Engagement DDL (Runs 9–10 / store seed v11): 3 enums, 5 tables** — `notifications`, `community_events` + `event_rsvps`, `member_blocks`, `post_reports` |
| `supabase/policies-run9-10.sql` | **RLS on all 5 engagement tables + 18 policies + `event_rsvp_count()` aggregate RPC + negative tests** |
| `supabase/apply-employer-role.sql` | **Reconciliation of the locked employer-as-role decision — runs LAST** (adds `'employer'` to `user_role`, `profiles.company`, repoints `job_posts.employer_id → profiles(id)`, drops standalone `employers`, owner-scoped `job_posts` RLS via `is_employer()`) |
| `supabase/outcomes-analytics.sql` | **The two-plane outcomes data product: `analytics.*` (identified center plane) + `licensed.*` matviews (`mv_continuum_score` / `mv_care_outcomes` / `mv_efficacy`, k≥11 suppressed) + the `licensed_research` role** |
| `supabase/seed.sql` | Flagship demo rows (Danielle, Tyrell, Andre, Marcus, Sarah, 2 centers, requests, posts, threads, courses) |

The full v1+v2 sequence was executed against a scratch **Postgres 16** with a
Supabase auth stub (schema → schema-expansion → policies → policies-expansion
→ outcomes-analytics): every file applies cleanly, all 21 expansion tables end
with RLS enabled, and the trust-boundary negative tests pass —

- **k≥11 suppression:** a bucket/LOC/quartile with <11 members returns `NULL`
  for its value while `cohort_n` shows the true (small) size.
- **consent gate:** center staff see a member in `analytics.center_member_outcome`
  ONLY with an active `consent_grant` to their center; revoking `revoked_at`
  drops the member on the very next query.
- **plane isolation:** the `licensed_research` role reads the three `licensed.*`
  aggregates and is `permission denied` on `public.continuum_events`,
  `analytics.member_outcome_all`, and `analytics.center_member_outcome`.

No live Supabase project exists yet — rerun `supabase db reset` verification on
the real project as phase 1. **The package is Supabase-ready**: it depends only
on `auth.users` / `auth.uid()` / the `anon`/`authenticated`/`service_role`
roles Supabase provisions, plus the v1 signup trigger. See §(h) for the ordered
apply sequence, the store→table map, and the decisions still needed.

---

## (a) Environment variables

```bash
# .env.local (and Vercel project env)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>          # safe for the browser — RLS is the guard
SUPABASE_SERVICE_ROLE_KEY=<service role key>      # SERVER ONLY. Never NEXT_PUBLIC_*, never in a client bundle (docs/10 §4)
SUPABASE_DB_URL=postgres://...                    # for migrations/seed scripts only, not the app

# transition flag — see (g) Rollback
DATA_BACKEND=supabase                             # 'memory' falls back to app/lib/store.ts
```

`SESSION_SECRET` (HMAC cookie) is deleted once the auth swap lands.

## (b) Packages

```bash
npm i @supabase/supabase-js @supabase/ssr
```

New files (the only new app code, alongside `app/lib/store.ts` until cutover):

- `app/lib/supabase/server.ts` — `createServerClient` (from `@supabase/ssr`)
  bound to Next 15 `cookies()`; used by every route handler. Runs as the
  signed-in user → RLS applies.
- `app/lib/supabase/admin.ts` — `createClient(url, SERVICE_ROLE_KEY)` with
  `auth: { persistSession: false }`. Imported ONLY by: donations webhook,
  signup enrichment, redeem, lesson-complete reward writes. Add
  `import "server-only"` at the top so a client-bundle import fails the build.
- `middleware.ts` — `@supabase/ssr` token refresh (the standard snippet).

## (c) Auth swap — Supabase Auth replaces `app/lib/auth.ts`

Email/password via Supabase Auth (GoTrue). The HMAC cookie
(`ms_session`), `sessionToken/verifyToken`, and `scrypt` password fields all
die; `@supabase/ssr` manages the session cookies.

- **Role mapping**: `profiles.role` (enum `member|mentor|staff`) is the source
  of truth. The `on_auth_user_created` trigger (schema.sql) creates the
  profile from `auth.signUp({ options: { data: { name, role, avatar_color } } })`.
  Optionally mirror the role into a JWT claim via a Custom Access Token Hook
  (Dashboard → Auth → Hooks) so middleware can route surfaces without a DB
  hit; **policies never trust the raw claim for staff checks** — they use
  `is_staff()` which reads `profiles`.
- **`getSessionUser()` →** `supabase.auth.getUser()` + `select * from profiles where id = user.id`.
  `getRoleUser(...roles)` keeps its exact signature ("staff passes every
  check") as a thin wrapper over that.
- **Signup extras** (slug, member number, first support request): after
  `auth.signUp`, an admin-client call fills member fields (slug/`member_number`
  generation moves to SQL: `slugify` → unique-suffix loop, member number →
  9-digit leading-zero with unique retry) and inserts the optional first
  `support_requests` row. Members can't write these themselves under RLS —
  that is intentional.
- **Demo logins stay**: `seed.sql` creates the five flagship accounts as
  auth users with password `mystruggle` (danielle@ / marcus@ / sarah@ /
  tyrell@ / andre@ themystruggles.com), matching CLAUDE.md.
- **Login/logout/me routes** keep their URLs and response shapes
  (`{ user: SafeUser }`) so no client component changes; they proxy to
  `signInWithPassword` / `signOut` / `getUser`+profile select. `SafeUser`
  stops carrying anything password-ish (it already does).

## (d) The seam — route → tables → RLS role

Replace `db()`/`save()` table-by-table. Every `app/api` route (28 route
files, glob-verified), what it touches, and the Supabase role it runs as:

| Route (methods) | Tables / views / RPCs | Runs as |
|---|---|---|
| `POST /api/auth/signup` | `auth.signUp` → trigger inserts `profiles`; admin client enriches member fields + optional `support_requests` | anon → service role (enrichment) |
| `POST /api/auth/login` | `auth.signInWithPassword`; `profiles` (self) for the response payload | anon → authenticated |
| `POST /api/auth/logout` | `auth.signOut` — no tables | authenticated |
| `GET /api/auth/me` | `profiles` (self), `support_requests` (own) | authenticated (RLS: self) |
| `GET /api/members/[slug]` | `public_members` view + `public_request_board` view (active requests for the slug) | anon (consent enforced by the view; non-consented → `{generic:true}`) |
| `GET /api/qr/[slug]` | `public_members` view (slug existence check) | anon |
| `POST /api/donations` | `donations` insert, `profiles` cash/credits update, `support_requests` raised/status update — **one RPC `record_donation()` or admin-client transaction; becomes the Stripe webhook handler** | service role ONLY (docs/02 §Security) |
| `GET/POST /api/requests` | `support_requests` (own select / own insert) | authenticated member |
| `GET /api/requests/board` | `public_request_board` view | anon |
| `GET /api/posts` | `posts` + join `profiles` (author name/role/color) + `post_hearts` + `comments` + `support_requests` (decorate `requestId`) | anon (approved only) / authenticated (`author=me` adds own any-status) |
| `POST /api/posts` | `posts` insert (crisis text → `status='flagged'`), `support_requests` (validate own requestId) | authenticated |
| `POST /api/posts/[id]/react` | `post_hearts` insert/delete (toggle) | authenticated |
| `POST /api/posts/[id]/comments` | `comments` insert | authenticated |
| `POST /api/posts/[id]/moderate` | `posts` status update | staff |
| `GET /api/threads` | `thread_participants` (own) → `threads`, `messages` (last), `profiles` (other participant); `get_or_create_thread()` RPC for the member↔mentor auto-thread | authenticated participant |
| `GET/POST /api/threads/[id]/messages` | `messages` (participant select / insert-as-self), `?after=` → `created_at > ...` | authenticated participant |
| `GET /api/community/stats` | aggregate counts over `profiles`, `posts`, `support_requests`, `donations` — **needs a definer RPC `community_stats()`** returning counts only (anon can't scan those tables, by design) | anon via definer RPC |
| `GET /api/courses` | `courses` + `enrollments` (own) | authenticated |
| `POST /api/lessons/complete` | `enrollments` upsert + `profiles` points/streak/level/`last_activity_at` — **RPC `complete_lesson()` (definer)**: reward columns are deliberately not self-writable | authenticated → definer RPC |
| `GET/POST/PUT /api/mentor-applications` | `mentor_applications` (anon insert / staff select / staff update) | anon (POST); staff (GET/PUT) |
| `GET/POST /api/concerns` | `concerns` (+ `profiles` names for staff view) | mentor insert-as-self; staff read/update |
| `GET/POST /api/sessions` | `sessions` (+ `profiles` mentor name) | mentor (own) / staff (all). NOTE: RLS scopes a mentor to their OWN sessions — tighter than today's route, which let any mentor read any member's sessions; the mentor app only ever asks for its own mentees, so nothing breaks. |
| `GET /api/admin/overview` | `profiles`, `donations`, `support_requests`, `posts`, `centers` (aggregates) | staff |
| `GET /api/admin/members` | `profiles` (role='member') + `support_requests` | staff |
| `POST /api/admin/consent` | `profiles.consent_public` update | staff (compliance action; view drops the member instantly) |
| `GET /api/admin/posts` | `posts` (all statuses, latest 100) | staff |
| `GET /api/admin/reports` | `profiles`, `donations` (retention/giving aggregates) | staff |
| `POST /api/admin/redeem` | `profiles.cash_cents` decrement — **RPC `redeem_cash()` (definer, staff-gated, cap-checked)**; PHASE 2: append `ledger_entries` instead | staff via definer RPC |
| `GET/POST /api/newsletter` | `newsletter_subscribers` (anon insert; unique lower(email) → 409). GET count: staff, or a definer `newsletter_count()` if the public count stays | anon (POST) / staff (GET) |

**Money at the seam**: SQL is integer cents; JSON stays dollars until the UI
migrates. Convert in the handler: `amount_cents: Math.round(dollars * 100)`
in, `cents / 100` out. Split: `cash = Math.floor(cents / 2)`,
`credits = cents - cash`.

**Course ids**: app course ids (`course-ise-3`) live in `courses.slug`;
handlers translate slug↔uuid (or select by slug directly).

## (e) What dies

- `.data/db.json` + the `/tmp` Vercel persistence path
- `seedVersion` / `SEED_VERSION` machinery and `load()`/`save()`
- `hashPassword` / `newSalt` / scrypt fields (`passwordHash`, `salt`) on User
- `SESSION_COOKIE` / `sessionToken` / `verifyToken` / `SESSION_SECRET`
- The module-level `subscribers` array in `app/api/newsletter/route.ts`
- The in-memory daily-cap `Map` in `app/api/admin/redeem/route.ts` (cap check
  moves into the `redeem_cash()` RPC, where it survives restarts)
- Eventually `app/lib/store.ts` itself — after the rollback window closes

## (f) Ordered cutover checklist

Each phase has a verification gate; do not start the next phase until it
passes (AUTOPILOT: RLS items require the negative test).

1. **Schema** — `supabase db push` (or run `schema.sql` in the SQL editor).
   *Verify:* all 16 tables + 10 enums exist; `on_auth_user_created` trigger
   present; `\d posts` shows `posts_feed_idx (status, created_at desc)`.
2. **Policies + negative tests** — run `policies.sql`.
   *Verify:* `select count(*) from pg_policies` ≥ 49; zero tables with
   `rowsecurity = false`; run every NEGATIVE TEST comment block in
   `policies.sql` with per-user JWTs (script it — it must be re-runnable in
   CI). Anon: profiles → 0 rows; Andre absent from `public_members`; member
   cannot forge `cash_cents`, hearts, senders, or see concerns/sessions.
3. **Seed** — run `seed.sql` (local: as-is; hosted: create the 5 auth users
   via Admin API with the same fixed UUIDs first, then the rest).
   *Verify:* sign in as danielle@themystruggles.com / mystruggle via
   supabase-js; `public_members` shows danielle+tyrell, not andre; bulk seed:
   run the store→CSV converter (`seed()` output → cents ×100, epoch-ms →
   timestamptz, `seed-*` ids → deterministic uuids e.g. `uuid5(ns, seedId)`)
   and `\copy` the ~500 members / requests / donations / posts / sessions /
   enrollments.
4. **Auth swap** — middleware + `app/lib/supabase/{server,admin}.ts`;
   rewrite the four `/api/auth/*` routes; `getSessionUser`/`getRoleUser`
   reimplemented over Supabase.
   *Verify:* demo logins work on /login; `/api/auth/me` returns the same
   SafeUser shape; forged/expired token → `{ user: null }`; staff-only route
   returns 401 for danielle.
5. **Read routes** — members/[slug], qr, requests/board, posts GET,
   community/stats (add the definer RPC), courses, threads GET, admin GETs.
   *Verify:* route sweep with curl + cookie jars (same method as
   requirements/06) comparing response shapes against the memory store;
   `/p/danielle` renders story + $105/$175 progress; signed-out /community
   shows approved posts only.
6. **Write routes** — posts POST/react/comments/moderate, requests POST,
   threads/messages POST, sessions, concerns, mentor-applications,
   lessons/complete + redeem RPCs, admin/consent, newsletter, and finally
   donations → `record_donation()` behind the (future) Stripe webhook.
   *Verify:* each write re-read through the API AND spot-checked in the
   table editor; crisis composer text lands as `flagged` and never appears
   in anon GET /api/posts; donation of $25 → cash +1250¢, credits +1250¢,
   request raised +2500¢, funded flip at target.
7. **Realtime (optional, after cutover works)** — replace `?after=` polling:
   channel `dm:{thread_id}` on `messages` inserts; channel `feed` on `posts`
   where `status = 'approved'` for the community feed; enable
   `supabase_realtime` publication for those two tables only (RLS applies to
   realtime payloads).
   *Verify:* two browsers, message appears without polling; feed updates on
   new approved post.
8. **Cutover** — set `DATA_BACKEND=supabase` in Vercel, deploy, delete
   `.data/db.json`. Run the full requirements/06 route sweep one more time.
   After a quiet week: remove `store.ts`, the flag, and `SESSION_SECRET`.

## (g) Rollback

Keep `app/lib/store.ts` intact through the transition. A single env flag
(`DATA_BACKEND=memory|supabase`, default `memory` until phase 8) selects the
data layer inside the seam helpers (`getSessionUser`, and a per-route
`dataBackend()` switch during phases 5–6). Rollback = flip the env var and
redeploy — no code revert. The flag (and the memory store) are deleted only
after the cutover has survived a week of AUTOPILOT audits.

**Caveat:** auth sessions don't survive a rollback (Supabase cookies ≠ HMAC
cookie) — users re-login. Data written to Supabase during the window stays
there; the memory store reseeds. Acceptable while everything is demo data;
after real users exist, rollback is forward-fix only.

---

## (h) Expansion package (v2) — the tables added since v1

The v1 package above covered the tables the app used at seed v5. Since then the
store grew three domains + an outcomes data product (store seed v6–v9). This
section covers `schema-expansion.sql`, `policies-expansion.sql`, and
`outcomes-analytics.sql`. Same seam rule: `app/lib/store.ts` `interface DB`
arrays → tables; route handlers keep their shapes.

### Ordered apply sequence

Run top to bottom. Each SQL file is idempotent-per-object (no `if not exists`
on tables — reset the DB to re-run) and was verified in this order (a scratch
**Postgres 16** + the Supabase auth stub — `auth.users`, `auth.uid()` reading
`request.jwt.claims`, and the `anon`/`authenticated`/`service_role` roles):

1. `supabase/schema.sql` — v1 tables + enums + signup trigger.
2. `supabase/schema-expansion.sql` — v2 enums + tables + indexes.
3. `supabase/schema-run9-10.sql` — engagement enums + tables + indexes
   (`notifications`, `community_events`, `event_rsvps`, `member_blocks`,
   `post_reports`). Depends only on `profiles` / `centers` / `posts`.
4. `supabase/policies.sql` — v1 RLS (defines `is_staff()`, `is_mentor()`,
   `is_mentor_of()`, `is_thread_participant()` — **required by the expansion
   policies, so this must run before step 5**).
5. `supabase/policies-expansion.sql` — v2 RLS + `caller_center()`,
   `has_active_consent()`, `staff_has_consent()`, `can_read_care_channel()`,
   `is_circle_member()`, and the `placement_stats()` aggregate RPC.
6. `supabase/policies-run9-10.sql` — engagement RLS (reuses `is_staff()` /
   `is_mentor()`) + the `event_rsvp_count()` aggregate RPC.
7. `supabase/apply-employer-role.sql` — **RUNS LAST.** The employer-as-role
   reconciliation supersedes objects that `schema-expansion.sql §4` and the
   `policies-expansion.sql §Employers` block define, so it MUST come after both.
   (Verified: running it earlier fails twice — it references `is_staff()` before
   `policies.sql` creates it, and it drops `employers` before
   `policies-expansion.sql` re-creates policies on it.) Run WITHOUT
   `--single-transaction`: step 1 (`alter type … add value 'employer'`) commits
   before later steps use the value; every step is guarded to re-run safely.
8. `supabase/outcomes-analytics.sql` — `analytics` + `licensed` schemas,
   score functions, `member_outcome_all` matview, the `center_member_outcome`
   security-invoker view, the three `licensed.*` matviews, `refresh_outcomes()`,
   and the `licensed_research` role + grants.
9. `supabase/seed.sql` — flagship rows (then the bulk store→CSV loader for the
   generated breadth, per §Seed; extend the converter to the v2 + v11 arrays).

*Verify after step 5:* `select analytics.refresh_outcomes();` then confirm
`set role licensed_research; select * from public.continuum_events;` →
permission denied, while `select * from licensed.mv_continuum_score;` works.

### store.ts arrays → tables

| `interface DB` array (store.ts) | Table(s) | Notes |
|---|---|---|
| `profileDetails` | `profile_details` | PK = `user_id`; public rings via `public_profile_details` view |
| `barcChecks` | `barc_checks` | `scores` → jsonb; self + staff only, never public |
| `circles` | `circles` | `circle_kind` enum |
| `circleMemberships` | `circle_memberships` | unique (circle, member) |
| `recoveryGoals` | `recovery_goals` | `visibility` widens read to mentor/circle |
| `goalMilestones` | `goal_milestones` | owner via parent goal |
| `jobApplications` | `job_applications` | TS `role` → `job_title` column |
| `resumes` | `resumes` | one primary per member (partial unique idx) |
| `resumeSections` | `resume_sections` | `content` → jsonb (shape varies by kind) |
| `careEpisodes` | `care_episodes` | `center_id` NULL = pre-care/unaffiliated |
| `phaseTransitions` | `phase_transitions` | append-only (no update/delete policy) |
| `continuumEvents` | `continuum_events` | single write path (service role/emit hook) |
| `careChannels` | `care_channels` | `one_to_one`/`program_group`/`announcement` shape check |
| `careMessages` | `care_messages` | `flagged` (held) not broadly readable |
| `consentGrants` | `consent_grants` | member-owned; **the center-plane gate** |
| `followUps` | `follow_up_checkins` | 30/60/90/180/365d cadence |
| `sponsoredPlacements` | `sponsored_placements` | `targeting` jsonb, non-clinical CHECK guard |
| `placementEvents` | `placement_events` | `member_id` internal-only; aggregate via `placement_stats()` |
| `demoLeads` | `demo_leads` | public write-only drop box |
| `notifications` | `notifications` | one inbox per user; NO user insert path (`emit_notification` hook / service role); `(user_id, read, created_at)` index |
| `events` | `community_events` | `event_kind` enum; `center_id` nullable; public-read (GET /api/events is open) |
| `eventRsvps` | `event_rsvps` | own rows only; per-event `rsvpCount` via `event_rsvp_count()` RPC; unique (event, user) |
| `memberBlocks` | `member_blocks` | blocker-owned; unique (blocker, blocked) + self-block CHECK |
| `postReports` | `post_reports` | `post_report_status` enum (open/reviewed); member files own, staff resolve (all-staff — posts have no center linkage) |
| *(outcomes data product)* | `analytics.member_outcome_all` (matview), `analytics.center_member_outcome` (view), `licensed.mv_continuum_score` / `mv_care_outcomes` / `mv_efficacy` (matviews) | mirror `app/api/outcomes/compute.ts` |
| `users` (role='employer') | `profiles` (role `employer`, `company`) + `job_posts` | **RESOLVED** — employer is a User with role `'employer'`; `job_posts.employer_id → profiles(id)`. `apply-employer-role.sql` (runs last) drops the standalone `employers` table |

New route handlers that will bind to these (glob the current `app/api/` tree at
cutover — the seam rule is unchanged): `outcomes/*` → `analytics.*` /
`licensed.*` (staff = center plane via `center_member_outcome`; licensing seat =
`licensed_research`); `placements/*` → `sponsored_placements` +
`placement_events` (serve trust gates stay in app code) + `placement_stats()`;
`continuum/*`, `care-channels/*`, `consent/*`, `checkins/*` → the continuum
tables under the consent gate; `circles/*`, `goals/*`, `resumes/*`,
`job-applications/*`, `barc/*`, `profile-details/*` → the community-expansion
tables. The engagement routes bind to the Run 9–10 tables: `notifications/*` →
`notifications` (self-scoped read/mark-read; writes via `emit_notification`),
`events/*` + `events/[id]/rsvp` → `community_events` + `event_rsvps` (+
`event_rsvp_count()` for the shown count), `blocks/*` → `member_blocks`,
`reports/*` → `post_reports` (member files own; staff GET/PATCH the queue).
`continuum_events` **and `notifications`** writes go through definer RPCs
(`emit_continuum_event()` / `emit_notification()`, like `record_donation`) —
reward/engagement/inbox rows are never self-writable.

### The two-plane outcomes data product (the P0 trust boundary)

`outcomes-analytics.sql` is the SQL realization of `app/api/outcomes/compute.ts`
and encodes the same two planes as database structure, not convention:

- **Identified center plane (`analytics`).** `analytics.center_member_outcome`
  is a `security_invoker` view over the RLS'd base tables, so a staff member
  sees identifiable rows for **their own center's consented members only** — the
  `consent_grant` gate in `policies-expansion.sql` applies to the caller. A
  member sees only their own row. Not suppressed (single center, consented,
  identified). `analytics.member_outcome_all` is the private global frame the
  aggregates are grouped from; it is granted to **no one** (revoked from
  `anon`/`authenticated`/`licensed_research`).
- **De-identified licensed plane (`licensed`).** `mv_continuum_score`,
  `mv_care_outcomes`, `mv_efficacy` are matviews that `GROUP` the frame into
  distributions/rates and **select no name/member_number/slug/member_id** — a
  leaked identity is unreachable by construction. Score parity with compute.ts:
  `round(100·raw/(raw+40))`, `raw` = trailing-90-day event weights from
  `ref_now` (the latest recorded event).
- **k≥11 minimum-cohort suppression, in SQL.** Every aggregate cell computes its
  distinct-member cohort size `n`; the value column is
  `case when n >= analytics.min_cohort() then <value> end` (= `NULL` below 11).
  Applied per cell — each bucket, phase edge, LOC, retention horizon and
  engagement quartile is its own cohort, so a 1–10-member cell is nulled the
  same way. `cohort_n` is kept beside each value so a reader sees *why* a cell is
  blank, never the members.
- **Structural role isolation.** A `licensed_research` NOLOGIN role gets `USAGE`
  on schema `licensed` + `SELECT` on the three aggregate matviews and **nothing
  else** — `USAGE` on `public`/`analytics` is revoked, so it literally cannot
  name a table that has an identifiable column. A licensing seat's connection
  maps into this role.

### Supabase-ready — decisions still needed

The package assumes the standard Supabase surface (`auth.users`, `auth.uid()`,
`anon`/`authenticated`/`service_role`). Open items before/at cutover:

- **Auth provider mapping (HMAC cookie → Supabase Auth).** Same swap as §(c):
  the current HMAC `ms_session` cookie and `app/lib/auth.ts` are replaced by
  Supabase Auth; `profiles.role` stays the source of truth and expansion
  policies read it via `is_staff()`. The **`employer` role** decision is
  **RESOLVED** (next item): `apply-employer-role.sql` adds it to
  `public.user_role` (`alter type … add value 'employer'`, run outside a txn
  block, LAST in the apply sequence).
- **Employers/job_posts model — RESOLVED (employer = a User with role
  `'employer'`).** `schema-expansion.sql §4` still ships the provisional
  **standalone** `employers` table + placeholder `job_posts` policies, and
  `policies-expansion.sql §Employers` its provisional RLS — both are now
  **superseded** by `supabase/apply-employer-role.sql`, which runs **LAST** and
  reconciles the base package to the locked decision: it adds `'employer'` to
  `user_role`, adds `profiles.company` (`User.company`), repoints
  `job_posts.employer_id → profiles(id)`, drops the standalone `employers`
  table, and replaces the placeholder job_posts RLS with owner-scoped writes
  (`employer_id = me AND is_employer()`) + public SELECT of open jobs. It runs
  last (not at its intuitive spot after `schema-expansion.sql`) because it
  references `is_staff()` — defined in `policies.sql` — and because
  `policies-expansion.sql` re-creates policies on `employers`; running it early
  fails on both counts. Do NOT hand-edit `schema-expansion.sql` /
  `policies-expansion.sql` to remove the standalone tables — the reconciliation
  file is the single, re-runnable source of the resolved model.
- **"Center staff" vs "platform staff" role.** Expansion policies gate
  center-plane reads with `is_staff()` **AND** `caller_center()` **AND**
  `has_active_consent()`. Today `profiles.role='staff'` is a single role and a
  staff member's center = `profiles.center_id`. If/when a distinct per-center
  admin vs. platform (`ms_admin`) role lands, split `is_staff()` accordingly —
  the consent + center-match predicates already scope correctly, but ad
  approval (`sponsored_placements` moderate) should move to the platform role.
- **`continuum_events` write path.** Add the `emit_continuum_event()` definer
  RPC (mirrors the emit hook in `store.ts`) so the single-write-path guarantee
  holds under RLS; no user-facing insert policy exists by design.
- **Outcomes licensing governance gate (docs/10 §5–6).** `compute.ts` surfaces
  `GOVERNANCE.licensingBlockedUntilCounselItemsChecked = true`. The
  `licensed_research` role and matviews exist, but **do not provision a real
  licensing seat** until the Part 2/BAA + IRB-grade governance + privacy/ToS
  items are signed off. Refresh cadence for the matviews (pg_cron vs. edge
  function after continuum writes settle) is an ops decision.
- **Ad-product content policy.** The schema makes clinical targeting
  unrepresentable (jsonb CHECK guard + coarse `targeting` only), but the written
  advertising policy + human review gate (docs/10 §5a) must be signed off before
  paid placements run.
