# 04 — Module: QR Code Giving (source: My Struggle pitch deck + give.my-struggle.org concept)

## Purpose

"Have you ever wanted to give to someone and not have any cash?" A donor scans a member's QR code and gives through the app in under 60 seconds. The model answers the #1 donor objection ("they'll just buy drugs") head-on:

**The 50/50 Split (the product's signature mechanic):**
- **50% Cash** — redeemable by the member at My Struggle outreach centers with their **organization ID card**
- **50% Store Credits** — spendable on necessary items at **The Store** (on-site and free-standing locations in the community)
- Members can choose to **save either balance for their reentry into society**

Donation domain: **give.my-struggle.org** (public giving pages live here; QR codes resolve to this domain).

## Balances & Ledger

Every member has two sub-balances: `cash_cents` and `credit_cents`. Each donation splits per the platform-configurable ratio (default 50/50, ms_admin can adjust globally or per program). All movements are append-only `ledger_entries`:
- `credit_cash` / `credit_store` — from donation webhook (atomic, both legs in one transaction)
- `redeem_cash` — staff-recorded at an outreach center; requires member ID card scan (QR on card) + staff PIN
- `redeem_store` — recorded at The Store point-of-redemption (v1: staff dashboard flow; v2: dedicated POS app; see docs/11-ECOSYSTEM.md)
- `reserve_reentry` — member moves funds into a locked "reentry savings" bucket (releases on journey_stage → transitional/independent, or staff-approved early release)
- `adjustment` — ms_admin only, reason required

## Flows

### Donor (no auth, give.my-struggle.org)
1. Scan QR → `/p/[qr_slug]`: photo or brand avatar, display name + member #, approved story, goal progress, and the **"Where your gift goes" split explainer** (the 50/50 graphic is the trust-builder — make it prominent and beautiful)
2. Amount picker ($10/$25/$50/custom + weekly recurring) → Stripe Checkout → receipt via Resend → follow-the-journey opt-in
3. Followers receive consented milestone updates

### Member (PWA /give tab)
- My QR code + printable card; my balances (cash / credits / reentry savings) with big friendly numbers; recent redemptions; "Save for my future" transfer action; thank-you note prompts (staff-approved)

### Staff (dashboard)
- Cash redemption desk flow: scan member ID card QR → verify identity → enter amount → ledger entry with dual-record (staff id + member card scan)
- Store credit redemption recorder (item categories, no receipts of shame — just totals)
- ID card + QR card batch printing (PDF, brand template; card carries member #, QR, photo optional)
- Split configuration, goal approval, giving analytics (scans → conversion, recurring donors, split utilization, reentry savings totals)

## Stripe

Checkout Sessions (one-time + weekly subscription), metadata: `participant_id`, `goal_id`, `qr_slug`. Webhook idempotent on `stripe_event_id`; one transaction inserts the donation + both ledger legs. Refunds mirror with negative legs.

## Guardrails

- Cash redemptions ONLY at centers with card-present scan — the app never dispenses money and balances are never transferable member-to-member
- Public pages never reveal last name, center affiliation, health info, or journey stage
- Donor messages moderated before display; consent revocation flips the public page to a generic org-giving state within minutes
- Daily cash redemption cap (org-configurable, default $100/day) — protects members from coercion/theft
- **Compliance note:** the cash component affects tax-deductibility language and member benefit eligibility (SNAP/SSI) — see docs/10-COMPLIANCE.md §2. Build the split as specified; the receipt/terms language comes from counsel.

## Done When

- Full loop with Stripe test cards: scan → give → split ledger → member sees balances → staff records a cash redemption via card scan → donor page shows impact
- Split explainer renders on every public giving page
- Reentry savings lock/release logic passes tests; anon cannot read base tables (negative test)
