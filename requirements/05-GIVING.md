# 05 — Public QR Giving Pages (/p/[slug])

Spec: handoff README §Surface B + `docs/04-MODULE-QR-GIVING.md`.
Audit 2026-07-05: curl /p/*, /api/members/*, /api/donations, /api/qr/* (no auth — donor flow).

## Page states

- [x] Loading state: skeleton (no spinner) while fetching ✔ verified: SSR of /p/danielle contains animate-pulse skeleton
- [x] Full member state backed by /api/members/{slug}: name, member # chip, consented story quote ✔ verified: API returns {slug,name,memberNumber,story,requests,savings} for danielle
- [x] Generic org-giving state when consent is off: page exists, zero personal info ✔ verified: GET /api/members/andre → {member:null,generic:true}; /p/andre serves the page
- [x] 404 state for unknown slugs ✔ verified: GET /api/members/zzz-nope → 404 (page renders not-found view client-side)
- [x] Consent line "Story shared with {name}'s consent · approved by My Struggle" on full state ✔ verified: component code + API consent flag (client render not browser-checked)

## 50/50 split explainer (trust-builder)

- [ ] Explainer card on every member page: navy "WHERE YOUR GIFT GOES / Every dollar splits *two ways*" header, 50/50 bar, Cash vs Store Credits columns, reentry-savings footnote — implemented in component (code-read); renders after client fetch, needs browser verification
- [x] Split semantics are real: every donation credits 50% cash / 50% store credits ✔ verified: POST /api/donations 25 → {split:{cash:12.5,credits:12.5}}; member balances updated
- [ ] Split ratio org-configurable (docs/04 — default 50/50 hardcoded, no settings)

## Goals + amount picker

- [x] Weekly goal progress card per active request (label · $target/week, raised, gradient bar) from live data ✔ verified: API requests include weeklyTarget/raised/status
- [x] Donations advance the goal; reaching target flips status to funded ✔ verified: $25 then $30 against a $50 goal → raised 55, status "funded"
- [x] Reentry savings surfaced (green card) ✔ verified: API returns savings (danielle 240)
- [ ] Amount picker $10/$25/$50/Custom, selected = 2px blue border + sky-tint, custom numeric input — client interaction, code-read only
- [ ] "Make it weekly" toggle default ON with amount-reactive hint — code-read only (weekly flag IS persisted: donation records weekly:true)
- [ ] Reactive 60px donate pill label ("Give $25 weekly ❤" / "Enter an amount") — code-read only
- [ ] Trust line: Stripe · email receipt · follow-the-journey opt-in (copy present in code; none of the three are real — no Stripe, no receipts, follow CTA is a stub)

## Donate flow

- [x] Donate posts a real donation: validates amount 1–10,000, 404s for non-consented/unknown members ✔ verified: 0→400, 20000→400, andre→404, valid→{ok:true}
- [x] Donation is recorded (drives dashboard totals) ✔ verified: /api/admin/overview donations/totalGiven increment
- [ ] Thank-you state: green check, split recap, receipt line, follow-the-journey CTA — client render, code-read only; follow CTA is a no-op stub
- [ ] Real payment: Stripe Checkout (one-time + weekly subscription), webhook writes ledger legs idempotently, receipts via email (docs/04) — nothing built; "donation" is a trusted JSON POST
- [ ] Donor gift completes in <60s end-to-end with real payment — blocked on Stripe
- [ ] Donor message + moderation before display (docs/04) — not built
- [ ] Refund mirroring with negative ledger legs — not built

## QR + entry points

- [x] Per-member QR SVG endpoint resolving to the giving page ✔ verified: GET /api/qr/danielle → 200 image/svg+xml (512px, navy on white); unknown slug → 404
- [x] /give redirects to the flagship demo page /p/danielle ✔ verified: /give 200 with client router.replace("/p/danielle") + placeholder copy
- [ ] Signup QR reveal: new member sees their QR + member # + links immediately after signup — signup API verified (slug+memberNumber returned); success-screen render is code-read only
- [x] Member-created "request online" appears on their public page ✔ verified: POST /api/requests → new active request listed by /api/members/{slug}
- [ ] Page lives at give.my-struggle.org domain (routing/domain not configured)

## Privacy on public pages

- [x] Public payload never exposes last name, email, cash/credit balances, center, or journey stage ✔ verified: /api/members/danielle keys = [consentPublic, memberNumber, name, requests, savings, slug, story] only
- [x] Non-consenting members are un-donatable ✔ verified: POST /api/donations slug=andre → 404
- [ ] Consent revocation propagates to the public page within minutes (API honors the flag, but no UI/API exists to revoke — dashboard toggle is local-only)
- [ ] Photo shown only with photo consent (no photo support at all yet — brand avatar only)
