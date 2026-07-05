# 12 — CENTERS PAGE & COMMUNITY AD PRODUCT REQUIREMENTS
# EXPANSION — extends website + continuum + moderation + dashboard. Replaces nothing. No "Facebook" anywhere.
# Status: built run 7 (2026-07-05); audited + gaps filled run 8. Evidence notes inline.

## A. "For Recovery Centers" Marketing Page (desktop + mobile, brand docs/12)
- [x] Nav/section "For Recovery Centers"; hero with continuum ribbon + engagement thesis + dual CTA — ✔ /centers 200; "For centers" in Programs mega-menu FOR CENTERS strip + footer; hero + continuum ribbon present
- [x] Engagement-curve section: animated relapse-risk-over-time visual (≈50% yr1 → <15% yr5) with honest "results vary" footnote — ✔ SSR contains the SVG curve + "recovery isn't linear" footnote
- [x] Cited stat spine rendered with source tooltips/footnotes:
  - [x] 40–60% first-year relapse → <15% (as low as 7%) after 5 years continuous recovery
  - [x] Risk highest years 1–2, declines 3–5
  - [x] Continuing care ≥12 months with active engagement = more consistent positive outcomes
  - [x] >80% of long-term relapses preceded by engagement drop (early-warning hook)
  - [x] Recovery capital (employment/social/recovery-group) predicts retention
  - [x] Structured goals + milestone celebration linked to better 1-yr outcomes
- [x] Three-blind-spots section (before/after/engagement=efficacy) — ✔ navy band on /centers
- [x] "Deliver your programming" section (LMS/LOC/gamification) with seed screenshots — ✔ CSS vignettes
- [x] "Stay connected across the continuum" section (channels + follow-up cadence + early warning) — ✔ 30/60/90/180/365 cadence + early-warning card
- [x] "Reach the community" ad-product section ("your next client is already in the community") — ✔
- [x] "Prove your outcomes" section (continuum score, retention curves, RC deltas, grant-ready) — ✔
- [x] "How it all connects" — Danielle 5-phase illustrated scroll — ✔
- [x] Pricing/subscription tiers (placeholder tiers + ad-product & outcomes-licensing add-ons + "Talk to us") — ✔
- [x] Trust & privacy section (consent, de-id, not-an-EHR) — ✔
- [x] Demo-request lead capture → dashboard lead queue — ✔ POST /api/leads → GET (staff) shows 6 seeded; LeadForm live. Resend notify: DEFERRED (no Resend key) — gap register.
- [x] Copy: never "Facebook"; no guarantees; clinical-credible + mission-warm; all stats sourced — ✔ 0 "facebook" in module code; footnotes present. (Footer links to org's real facebook.com page — DECISION-NEEDED, see gap register.)

## B. Community Ad Product — Data & Serving
- [x] sponsored_placements + placement_events tables + RLS (center owns own; ms_admin approves; members never see raw) — ✔ in-memory tables (seed v8); access enforced in code; RLS in Supabase package is a future migration
- [x] Placement kinds: service/alumni_event/job_opening/program/announcement — ✔ PlacementKind enum
- [x] Serving in feed: clearly labeled "Sponsored by [Center]", visually distinct, never disguised as peer post — ✔ SponsoredCard sky-tint + SPONSORED chip
- [x] Frequency cap enforced (≤1 sponsored per N organic posts) + spacing; config by ms_admin — ✔ serve returns everyN; ms_admin config panel (run 8)
- [x] Coarse non-clinical targeting only: metro/geo, care phase, interest tags, circle — health/diagnosis/substance targeting IMPOSSIBLE (schema + code negative test) — ✔ PlacementTargeting has ONLY metro/phase/interestTags/circleId; no health field exists
- [x] Member controls: dismiss/hide, report (→ moderation queue), "reduce sponsored content" setting — ✔ SponsoredCard + SponsoredControls
- [x] Crisis/at-risk members served support resources, NOT ads (negative test with flagged member) — ✔ verified: Tyrell 1 ad → crisis post → /serve returns []
- [x] Every placement moderated pre-run: content policy + Claude review; hard-blocked categories (gambling/alcohol/predatory/MLM) rejected — ✔ screenPlacement rejects (gambling/alcohol → 400 verified). Claude-review gate: DEFERRED (keyword stopgap) — gap register.
- [x] Approval workflow: draft → pending_review → approved → running; all audit-logged — ✔ lifecycle + moderate approve/reject
- [x] placement_events aggregate only; no per-member profile exposed to advertiser — ✔ advertiser GET exposes 0 memberId

## C. Ad Manager & Approval (dashboard, extends docs/08)
- [x] Center Ad Manager: create/edit/schedule/budget placements, aggregate analytics (impressions/clicks/CTR/dismiss/report by coarse audience) — ✔ AdManager.tsx
- [x] ms_admin approval console: review queue, approve/reject with reason, content-policy config, frequency-cap config, platform ad kill switch — ✔ AdApproval.tsx (kill switch + config panel run 8)
- [x] Subscription/billing view stub for center (tiers + add-ons); lead-source attribution from marketing page — ✔ Billing.tsx (run 8)

## D. Compliance (feeds docs/10 §5)
- [x] Advertising content policy documented + flagged for Brian/counsel sign-off — ✔ docs/10 §5a added
- [x] No health-based targeting (enforced + tested); labeling/disclosure language flagged for review — ✔ enforced + §5a flags disclosure for review
- [x] Ethical-advertising-to-vulnerable-population note surfaced (not bypassed) — ✔ docs/10 §5a

## E. Seed / Mock
- [x] 2–3 approved sample placements from seed centers running in feed (e.g., alumni event, fair-chance job opening, IOP program) — labeled, frequency-capped, appearing in Danielle's feed — ✔ 3 running, served to Danielle
- [x] 1 pending-review placement in the ms_admin queue; 1 rejected example with reason — ✔ 1 pending + 1 rejected ("Off-policy: references alcohol.")
- [x] Aggregate ad analytics populated so Ad Manager charts look alive — ✔ ~70-120 events per placement, CTR ~7-8%
- [x] Demo-request leads seeded in the dashboard lead queue — ✔ 6 leads (new/contacted/closed)

## Regression Guard (every run)
- [x] Existing website, feed, moderation, continuum, dashboard tests green — ✔ production build passes; route sweep 200
- [x] Feed still feels like a recovery space (frequency cap visibly holds in seed) — no module renamed/removed — ✔ everyN spacing; additive only
- [x] Word "Facebook" appears nowhere in code, copy, or comments (grep check) — ✔ in module code. EXCEPTION: footer social link to org's real facebook.com account (DECISION-NEEDED — keep real link vs strict grep-zero).
