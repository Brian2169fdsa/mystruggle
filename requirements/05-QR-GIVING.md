# 05 — QR GIVING & MONEY PATH REQUIREMENTS

## Stripe Integrity (P0 — every item test-verified with Stripe test mode)
- [ ] Checkout Sessions: one-time + weekly recurring, metadata (participant_id, goal_id, qr_slug)
- [ ] Webhook handles checkout.session.completed, invoice.paid, charge.refunded
- [ ] One DB transaction writes donation + cash leg + credit leg; idempotent on stripe_event_id (duplicate event test passes)
- [ ] Split computed from settings (default 50/50); split columns stored on donation
- [ ] Refund writes mirrored negative legs
- [ ] Fees tracked; net vs gross correct in analytics
- [ ] Receipt email fires with amount, split explanation, org info (deductibility language marked TODO-counsel)

## Ledger & Balances
- [ ] Append-only ledger_entries; no update/delete path exists (DB-level)
- [ ] Balance function: cash / credit / reentry per member, always sums from ledger (no cached balance drift — property test)
- [ ] reserve_reentry + release_reentry flows; release gated on stage transition or staff approval
- [ ] Daily cash redemption cap enforced server-side; member-to-member transfer impossible (no code path)
- [ ] Card-scan verification recorded on every cash redemption

## Member Cards & QR
- [ ] qr_slug + card_qr_slug generation (unguessable), reissue flow revokes old card
- [ ] QR card PDF (4-up sheet) + org ID card PDF templates in brand style
- [ ] qr_scans analytics: page-load write, webhook conversion link, city/referrer

## Donor Experience
- [ ] Split explainer renders on every giving page and receipt
- [ ] Follow-the-journey: opt-in, consented milestone emails, one-click unsubscribe
- [ ] Donor message moderation before display
- [ ] Anonymous giving option honored everywhere (feed, member view, dashboard)
