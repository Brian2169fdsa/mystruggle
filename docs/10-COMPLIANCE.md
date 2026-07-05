# 10 — Compliance, Privacy & Trust (read before building anything money- or health-adjacent)

This platform serves people in addiction recovery and reentry — among the most privacy-sensitive populations that exist. These are build requirements, not legal advice; Brian should validate the flagged items with the nonprofit's counsel/CPA.

## 1. Participant Privacy (42 CFR Part 2 / HIPAA adjacency)

The platform is NOT an EHR and must never become one by accident. Being identifiable on this platform can itself reveal a person's history — so:

- **No diagnoses, treatment details, medications, or clinical notes anywhere in the schema.** Session notes and journals are supportive, not clinical; UI copy tells staff/mentors not to record clinical info.
- Public surfaces show display name + participant number only; center affiliation is never public.
- Consent is granular, explicit, revocable, and timestamped (`consent_*` fields + signed consent record). Revocation propagates to public pages within minutes.
- If partner centers are Part 2 programs, the center↔platform data relationship needs a QSOA/BAA-style agreement — **flag for counsel before onboarding a licensed treatment facility.** Design assumption: platform holds engagement data, not treatment records.
- Minors are out of scope: age gate 18+ at enrollment.

## 2. Donation Model (the $800K lesson — do this right)

- **Model as designed**: donations to My Struggle (assumed 501(c)(3) — verify status/letter) split **50% member cash / 50% Store credits** with a save-for-reentry option (docs/04). The platform builds this exactly.
- **Counsel must resolve before live mode**: (a) whether gifts earmarked to a named individual — especially the cash leg — are tax-deductible at all, or whether receipts must distinguish deductible/non-deductible portions; the nonprofit retaining discretion and control (variance power) is the classic requirement. (b) How cash and credit distributions interact with members' SNAP/SSI/benefit eligibility — a benefits one-pager belongs in member onboarding. (c) Whether The Store credit leg is cleanly structured as in-kind charitable assistance. The daily cash cap, card-present redemption, and append-only ledger exist precisely to make whatever structure counsel lands on auditable.
- UI language pending counsel: default to "supports [Name]'s journey through My Struggle."
- Receipts: automated, with EIN + deductibility language; annual donor statements exportable.
- Refunds handled via Stripe; ledger adjustment entries mirror them. Fees tracked (`fee_cents`) for honest net reporting.
- No participant is ever ranked, scored, or compared publicly by donations received.

## 3. Safeguarding

- Mentor gates: application review + background-check tracking + training completion before any mentee contact. (Background check provider integration is v2; v1 tracks status manually — **do not activate mentors without it**.)
- All mentor↔mentee communication in auditable threads; no platform-wide DMs.
- Crisis-language detection → human alert path (05 spec). Resource footer (988, local AZ resources) on relevant surfaces.
- Report/block on all social surfaces; moderation events fully audit-logged.

## 4. Data Rights & Security

- Participant data export + account deletion (soft-delete with ledger retention for financial records — 7 years).
- RLS negative tests are part of Definition of Done on every module.
- Service-role key never in client bundles; Stripe webhooks signature-verified; storage buckets private by default.
- Audit log table for: consent changes, disbursements, role grants, moderation, stage changes.

## 5. Items Requiring Brian/Counsel Before Launch (checklist)

- [ ] Confirm 501(c)(3) status + EIN for receipt language
- [ ] Donation terms + variance power language reviewed by counsel
- [ ] Benefits-interaction one-pager for participants (SNAP/SSI)
- [ ] Part 2/BAA question resolved before first licensed treatment center onboards
- [ ] Background check provider selected + mentor policy signed off
- [ ] Position of Neutrality content licensing agreement for ISE hosting
- [ ] Privacy policy + ToS drafted (platform-specific, not the website's)

### 5a. Community Ad Product (docs/15) — advertising to a vulnerable population

The sponsored-placement system serves ads to people in recovery. This is
ethically loaded and MUST be reviewed before it runs for real money.

- [ ] **Advertising content policy signed off by Brian/counsel.** The code
      enforces a keyword screen (`app/lib/ad-policy.ts`) that hard-blocks
      gambling, alcohol, predatory lending, and MLM. Counsel must confirm the
      category list and approve a formal written policy. A human/Claude review
      gate on every placement is required before launch (keyword screen is a
      stopgap, not the final gate).
- [ ] **No health-based ad targeting** — enforced in code (the placement
      schema has NO diagnosis/substance/health field; targeting is coarse
      only: metro / care phase / interest tags / circle). Negative-tested:
      a crisis-flagged member is served support resources, never ads. Counsel
      to confirm this satisfies applicable advertising + privacy standards for
      a health-adjacent audience.
- [ ] **Disclosure / labeling language reviewed.** Every placement renders a
      distinct "Sponsored by [Center]" label and is never disguised as a peer
      post; frequency-capped so the feed stays a recovery space first. Counsel
      to review the disclosure wording.
- [ ] **Ethical-advertising-to-vulnerable-population note (surfaced, not
      bypassed):** even recovery-relevant advertising to people in early
      recovery carries risk of exploitation. Do not enable paid placements for
      any org that is not a vetted, approved recovery center/partner. Aggregate
      analytics only — no per-member behavioral profile is ever exposed to an
      advertiser (enforced + tested).
