# 07 — System: Auth, Roles, Privacy, Compliance, Integrations

Spec: `docs/02-ARCHITECTURE.md`, `docs/10-COMPLIANCE.md`, `docs/04/05/06`. Audit 2026-07-05.

## Session + credential security

- [x] Sessions are HMAC-SHA256-signed httpOnly cookies (sameSite lax, 30d), timing-safe verify; tampered tokens rejected ✔ verified: forged cookie → {user:null}; auth.ts code
- [x] Passwords scrypt-hashed with per-user salt; credentials never returned by any API ✔ verified: login round-trip; /api/auth/me payload has no passwordHash/salt
- [ ] SESSION_SECRET set from environment in production (falls back to a hardcoded demo secret — anyone knowing it can forge sessions)
- [ ] Session revocation/rotation (token is a bare signed userId — valid 30d, no logout-everywhere, no expiry claim)
- [ ] Rate limiting / lockout on login + signup + donations (none; unauthenticated POST /api/donations mutates balances)

## Role gating

- [x] Member-only actions enforced server-side (support requests: mentor cookie → 401) ✔ verified live
- [x] Thread access restricted to participants (404 otherwise) ✔ verified: 3rd-party cookie → 404
- [ ] P0 — Admin APIs behind staff auth: /api/admin/overview, /api/admin/members, /api/admin/posts are OPEN ✔ verified open: unauthenticated curl returns 501 members with balances + full moderation queue
- [ ] P0 — Moderation behind staff auth: POST /api/posts/[id]/moderate is OPEN ✔ verified open: unauthenticated flag/remove of any post succeeds
- [ ] /dashboard page behind staff login (renders for anyone; staff identity hardcoded)
- [ ] Staff/admin roles exist in the data model (Role = member|mentor only; no center_staff/center_admin/ms_admin per docs/08)
- [ ] Org/center scoping: staff of Org A sees zero rows of Org B (multi-org model absent)

## Privacy rules (docs/10 + handoff)

- [x] Public surfaces show first name + member # only — no last name, email, center, health info, or journey stage ✔ verified: /api/members/danielle keys limited; signup stores first name only
- [x] Consent gates the public page: consent off → generic org-giving state, donations blocked ✔ verified: andre → {generic:true}, donate → 404
- [ ] Consent is granular (page/photo/milestones), timestamped, revocable from the dashboard, propagating within minutes (flag exists but is not editable anywhere; dashboard toggles are local-only)
- [ ] Journals private to member + assigned staff (journal is never persisted at all — privacy by omission; the mentor-app activity list correctly shows a privacy note, hardcoded)
- [ ] $100/day cash redemption cap enforced server-side (display copy only; no redemption API exists)
- [ ] Dual-record redemption: card-present scan + staff PIN both recorded (giving-desk PIN is fake; nothing recorded)
- [ ] 5-minute share grace on milestone/system posts is a real timer with default-private outcome (copy only in celebration overlay)
- [ ] No clinical data anywhere + UI copy warning staff/mentors not to record clinical info (no note fields warn)
- [ ] Report/block controls on posts + comments (none)
- [ ] Age gate 18+ at signup (none)
- [ ] Data export + soft-delete account with 7-year ledger retention (none)
- [ ] Audit log for consent changes, disbursements, moderation, role grants, stage changes (none)

## Money integrity

- [ ] Stripe integration: Checkout (one-time + weekly), signature-verified idempotent webhook, metadata participant/goal/qr_slug, receipts + EIN language, refunds mirrored (NOT BUILT — donations are trusted JSON posts; site tier CTAs have no Stripe URLs)
- [ ] Append-only ledger with entry types credit_cash/credit_store/redeem_cash/redeem_store/reserve_reentry/adjustment (not built; balances mutate in place)
- [ ] Reentry savings lock/release rules (savings is a plain number; no lock semantics)
- [ ] No member-to-member transfer paths ✔ true today by absence of any transfer API — re-verify once ledger lands
- [ ] Fee tracking (fee_cents) for net reporting

## Crisis + moderation pipeline

- [ ] Crisis-language detection holds the post, alerts staff (email/SMS) within a minute, shows resources to the author (dashboard crisis card is a labeled DEMO preview; no detection, no alert path)
- [ ] Auto-moderation first pass (blocklist) + Claude review for flagged/media content (docs/05 — none; posts auto-approve)
- [ ] Mentor "I'm concerned" escalation reaches staff (dead link in mentor app)
- [ ] 988/local-AZ resource footers on relevant surfaces (grep "988" → 0 hits)
- [ ] Mood-1 ×2 consecutive → staff visibility flag (not built)

## Platform / migration

- [ ] Supabase/Postgres migration with RLS on every table + negative-test suite (not started; in-memory store; RLS untestable today)
- [ ] Service-role keys never in client bundles; storage buckets private (n/a until Supabase — keep on checklist)
- [ ] PWA: manifest, service worker, installability, offline journal drafts (nothing — no manifest/SW in app/ or public/)
- [ ] Email delivery (receipts, nudges, digests) via Resend or similar (none)
- [ ] Nightly cron: streak recalculation, mentor-inactivity nudges (none)
- [ ] Vercel persistence caveat resolved (/tmp store resets per cold start — acceptable for demo only; real DB required before any production data)
- [ ] Pre-launch counsel checklist tracked (EIN/501(c)(3) confirmation, donation terms, benefits one-pager, Part 2/BAA, background-check provider, PON licensing, privacy policy + ToS)
