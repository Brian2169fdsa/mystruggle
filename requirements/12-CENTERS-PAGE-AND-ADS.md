# 12 — CENTERS PAGE & COMMUNITY AD PRODUCT REQUIREMENTS
# EXPANSION — extends website + continuum + moderation + dashboard. Replaces nothing. No "Facebook" anywhere.

## A. "For Recovery Centers" Marketing Page (desktop + mobile, brand docs/12)
- [ ] Nav/section "For Recovery Centers"; hero with continuum ribbon + engagement thesis + dual CTA
- [ ] Engagement-curve section: animated relapse-risk-over-time visual (≈50% yr1 → <15% yr5) with honest "results vary" footnote
- [ ] Cited stat spine rendered with source tooltips/footnotes:
  - [ ] 40–60% first-year relapse → <15% (as low as 7%) after 5 years continuous recovery
  - [ ] Risk highest years 1–2, declines 3–5
  - [ ] Continuing care ≥12 months with active engagement = more consistent positive outcomes
  - [ ] >80% of long-term relapses preceded by engagement drop (early-warning hook)
  - [ ] Recovery capital (employment/social/recovery-group) predicts retention
  - [ ] Structured goals + milestone celebration linked to better 1-yr outcomes
- [ ] Three-blind-spots section (before/after/engagement=efficacy)
- [ ] "Deliver your programming" section (LMS/LOC/gamification) with seed screenshots
- [ ] "Stay connected across the continuum" section (channels + follow-up cadence + early warning)
- [ ] "Reach the community" ad-product section ("your next client is already in the community")
- [ ] "Prove your outcomes" section (continuum score, retention curves, RC deltas, grant-ready)
- [ ] "How it all connects" — Danielle 5-phase illustrated scroll
- [ ] Pricing/subscription tiers (placeholder tiers + ad-product & outcomes-licensing add-ons + "Talk to us")
- [ ] Trust & privacy section (consent, de-id, not-an-EHR)
- [ ] Demo-request lead capture → dashboard lead queue + Resend notify
- [ ] Copy: never "Facebook"; no guarantees; clinical-credible + mission-warm; all stats sourced

## B. Community Ad Product — Data & Serving
- [ ] sponsored_placements + placement_events tables + RLS (center owns own; ms_admin approves; members never see raw)
- [ ] Placement kinds: service/alumni_event/job_opening/program/announcement
- [ ] Serving in feed: clearly labeled "Sponsored by [Center]", visually distinct, never disguised as peer post
- [ ] Frequency cap enforced (≤1 sponsored per N organic posts) + spacing; config by ms_admin
- [ ] Coarse non-clinical targeting only: metro/geo, care phase, interest tags, circle — health/diagnosis/substance targeting IMPOSSIBLE (schema + code negative test)
- [ ] Member controls: dismiss/hide, report (→ moderation queue), "reduce sponsored content" setting
- [ ] Crisis/at-risk members served support resources, NOT ads (negative test with flagged member)
- [ ] Every placement moderated pre-run: content policy + Claude review; hard-blocked categories (gambling/alcohol/predatory/MLM) rejected
- [ ] Approval workflow: draft → pending_review → approved → running; all audit-logged
- [ ] placement_events aggregate only; no per-member profile exposed to advertiser

## C. Ad Manager & Approval (dashboard, extends docs/08)
- [ ] Center Ad Manager: create/edit/schedule/budget placements, aggregate analytics (impressions/clicks/CTR/dismiss/report by coarse audience)
- [ ] ms_admin approval console: review queue, approve/reject with reason, content-policy config, frequency-cap config, platform ad kill switch
- [ ] Subscription/billing view stub for center (tiers + add-ons); lead-source attribution from marketing page

## D. Compliance (feeds docs/10 §5)
- [ ] Advertising content policy documented + flagged for Brian/counsel sign-off
- [ ] No health-based targeting (enforced + tested); labeling/disclosure language flagged for review
- [ ] Ethical-advertising-to-vulnerable-population note surfaced (not bypassed)

## E. Seed / Mock
- [ ] 2–3 approved sample placements from seed centers running in feed (e.g., alumni event, fair-chance job opening, IOP program) — labeled, frequency-capped, appearing in Danielle's feed
- [ ] 1 pending-review placement in the ms_admin queue; 1 rejected example with reason
- [ ] Aggregate ad analytics populated so Ad Manager charts look alive
- [ ] Demo-request leads seeded in the dashboard lead queue

## Regression Guard (every run)
- [ ] Existing website, feed, moderation, continuum, dashboard tests green
- [ ] Feed still feels like a recovery space (frequency cap visibly holds in seed) — no module renamed/removed
- [ ] Word "Facebook" appears nowhere in code, copy, or comments (grep check)
