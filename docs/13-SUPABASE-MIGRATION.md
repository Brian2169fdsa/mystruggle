# 13 — Supabase Migration Plan (the mechanical swap)

The moment credentials arrive, this executes top to bottom. The in-memory
store (`app/lib/store.ts`) was always the swap-out seam; **the route handlers
under `app/api/` are the stable contract** — no page or component changes,
every route keeps its request/response shape.

Deliverables already in the repo (this package):

| File | What it is |
|---|---|
| `supabase/schema.sql` | Complete DDL: 10 enums, 16 tables, FKs, indexes, signup trigger |
| `supabase/policies.sql` | RLS on every table + 49 policies + public views + negative tests |
| `supabase/seed.sql` | Flagship demo rows (Danielle, Tyrell, Andre, Marcus, Sarah, 2 centers, requests, posts, threads, courses) |

All three were executed against a scratch Postgres 16 with a Supabase auth
stub (2026-07-05): schema/policies/seed apply cleanly; every RLS negative
test in `policies.sql` passes. No live Supabase project exists yet — rerun
`supabase db reset` verification on the real project as phase 1.

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
