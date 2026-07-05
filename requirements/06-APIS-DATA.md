# 06 — APIs + Data Store (app/api/* contracts, app/lib/store.ts)

Audit 2026-07-05: every route exercised live with curl + cookie jars (danielle, marcus, fresh signup). Store is the in-memory + JSON-file swap-out seam; route handlers are the stable contract for the Supabase migration.

## Auth

- [x] POST /api/auth/signup: validates name/email/password≥6 (400), rejects duplicate email (409), creates member with slug + unique 9-digit leading-0 member #, consentPublic default, zero balances, auto-assigned mentor, optional first support request; sets session ✔ verified: signup → {slug:"audit", memberNumber:"027659021", consentPublic:true, mentorId set}; dupe→409; bad→400
- [x] POST /api/auth/login: verifies scrypt hash, wrong password → 401, success sets HMAC cookie + returns safe user ✔ verified: bad pw 401; danielle → full member payload
- [x] GET /api/auth/me: session user + their requests; null when signed out; never leaks passwordHash/salt ✔ verified: {user:null} unauth; signed-in payload has no hash/salt keys
- [x] POST /api/auth/logout clears the session ✔ verified: logout → me returns {user:null}
- [x] Forged/tampered session cookies rejected ✔ verified: Cookie ms_session=fakeid.deadbeef → {user:null}

## Members + giving

- [x] GET /api/members/[slug]: public-safe projection (name, member #, story, active requests, savings only); {generic:true} when consent off; 404 unknown ✔ verified: all three cases live
- [x] POST /api/donations: amount int 1–10,000 (else 400), member must exist + consent (else 404), splits 50/50 into cash/credits, advances targeted-or-first-active request, flips to funded at target, records donation {amount, weekly, requestId} ✔ verified: 25→{cash:12.5,credits:12.5} raised 25; +30 → raised 55 "funded"; 0/20000→400; andre→404
- [x] GET /api/requests: 401 unauth; signed-in member's own requests ✔ verified both
- [x] POST /api/requests: member-role only (mentor → 401), label + weeklyTarget 1–10,000 validated (400) ✔ verified: created "Work boots"; invalid→400; as marcus→401
- [x] GET /api/qr/[slug]: SVG QR (512, navy/white) encoding {origin}/p/{slug}, 1h cache; 404 unknown ✔ verified: 200 image/svg+xml; zzz→404

## Posts / feed

- [x] GET /api/posts: approved-only, newest-first, capped at 50, viewerId included ✔ verified: count 50, statuses {approved}, newest-first true
- [x] POST /api/posts: 401 unauth; body required ≤2000 chars (400); kind regular/milestone/win; auto-approved ✔ verified: 401, 400 empty, created win post
- [x] POST /api/posts/[id]/react: 401 unauth; toggles heart, returns authoritative count ✔ verified: on {hearts:1,hearted:true} → off {hearts:0}
- [x] POST /api/posts/[id]/comments: 401 unauth; body ≤1000 (400); appends comment with author identity ✔ verified live
- [x] POST /api/posts/[id]/moderate: action approve/flag/remove (else 400); status change hides/shows post in public feed ✔ verified: flag → absent from /api/posts, present in /api/admin/posts as flagged; approve + remove round-trip
- [ ] Moderation endpoint requires staff auth (currently NO auth — anyone can approve/flag/remove any post; P0, see 07-SYSTEM)
- [ ] New posts enter pending moderation before public (docs/05 pipeline; currently status:"approved" on create)
- [ ] Feed pagination beyond the 50-cap (no cursor/offset — older posts unreachable via API)

## Threads / messages

- [x] GET /api/threads: 401 unauth; user's threads with other-participant identity, last message, count; member↔mentor thread auto-created on demand ✔ verified: danielle [Marcus], marcus [Danielle, Tyrell], fresh signup auto-threaded
- [x] GET /api/threads/[id]/messages: participant-only (404 otherwise), ?after=ts incremental polling ✔ verified: 3rd-party cookie → 404; after-filter returns only new
- [x] POST /api/threads/[id]/messages: text (≤2000, 400 empty) / mood 1–5 / cheer kinds ✔ verified: all three kinds stored and returned
- [ ] Mood validation edge: kind=mood with mood:0 should 400 (currently coerced to 1 and accepted — Math.max before the !mood check)

## Admin (all currently demo-open — no auth; P0 in 07-SYSTEM)

- [x] GET /api/admin/overview: live KPIs (members, mentors, active/funded requests, donations, weeklyRecurring, totalGiven, cash/credits/savings held, avgStreak, pendingModeration) + per-center rollup ✔ verified: members 501, mentors 8, donations 2502, totalGiven 82620, centers [Laveen 298, South Phoenix …]
- [x] GET /api/admin/members: full member roster with balances, requests, streak, points, level, mentorName ✔ verified: 501 members, all keys present
- [x] GET /api/admin/posts: every post regardless of status, newest-first, capped at 100 ✔ verified: 100 posts, 4 statuses

## Store + seed

- [x] Deterministic seed (fixed PRNG + fixed EPOCH, no Date.now() in seed) generating org + 2 centers, ~500 members, 8 mentors, 12mo donations/posts, pending/flagged moderation items ✔ verified: /api/admin/overview reflects 501/8/2502/2 centers; mulberry32 + EPOCH in store.ts
- [x] Danielle flagship intact post-seed: #039521464, balances 64/58/240, streak 12, 640 pts Silver, Hallway house 175/105, Marcus mentor, login works ✔ verified: login + /api/members/danielle
- [x] API responses stay fast at 500-member volume ✔ verified: overview 0.018s, posts 0.41s (first compile)
- [x] JSON file persistence: mutations written to .data/db.json ✔ verified: file exists, 742KB, mtime updates on writes
- [ ] State survives dev-server restart (could not verify — concurrent build session reseeds; re-test when stable)
- [ ] Response caps documented/consistent everywhere (posts 50, admin posts 100; admin/members returns all 501 with nested requests — no cap or pagination)
- [ ] Money as integer cents (docs/04 cash_cents/credit_cents; current floats produce 12.5 halves)
- [ ] Append-only ledger_entries for balance movements (balances are mutated in place; no ledger, no redemption/reserve/adjustment entry types)
- [ ] Sessions, courses, points_events, journey stages, programs, consent-photo/milestone fields in the data model (absent — blocks mentor session logs, Learn backend, funnel, program KPIs)
- [ ] Input hardening: JSON body size limits / rate limiting on unauthenticated POSTs (donations, signup) — none
