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
