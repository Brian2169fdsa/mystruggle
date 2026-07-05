# 15 — Module: "For Recovery Centers" Marketing Page + Community Ad Product (EXPANSION)

> **Read this first, Claude Code:** EXPANSION of the website (docs/01/12) and the continuum module (docs/14). Adds one marketing surface (the centers sales page) and one small platform capability (sponsored placements in the community, sold to centers). Extends the moderation pipeline (docs/06) and the dashboard (docs/08). New checklist: `requirements/12-CENTERS-PAGE-AND-ADS.md`. Follow AUTOPILOT. Never say "Facebook" anywhere in product or marketing copy — the community is "the recovery community" / "the community feed."

---

## Purpose

The buyer is the recovery center. This is the page that converts them. It sells three things bundled into one subscription: (1) **deliver your programming** through the platform (LMS, level-of-care curricula, gamified engagement), (2) **stay connected to clients** before, during, and after care (the continuum, docs/14), and (3) **reach the recovery community** with sponsored placements — the center can promote its services, alumni events, and openings directly inside the community feed members already live in.

The emotional/logical spine of the page: **engagement over time is the single strongest lever a center has on outcomes, and this platform is the only thing that keeps a person engaged for the year-plus that changes the odds.**

---

## The Engagement Argument (lead with this — all claims cited, framed honestly)

Use these as the page's proof spine. Present as "what the research shows," never as a guarantee of individual results. Citations belong in footnotes/tooltips so a clinical buyer trusts the page.

- **Relapse risk falls dramatically the longer someone stays engaged in recovery.** First-year relapse rates run **40–60%**; after **five years of continuous recovery, relapse risk drops below 15% — some studies as low as 7%**, approaching the general-population baseline. (NIDA; Betty Ford Consensus Panel; multiple longitudinal reviews.)
- **The first year is the highest-risk window** — which is exactly the window most centers lose visibility after discharge. Risk is highest in years 1–2 and declines through years 3–5.
- **Continuing care that lasts 12 months or longer, with active efforts to keep people engaged, produces more consistently positive outcomes** than shorter or passive follow-up. (Journal review of continuing-care studies, McKay et al.)
- **Over 80% of long-term relapses are preceded by a gradual drop in recovery-activity engagement** — meaning an engagement dip is an early, measurable warning the platform can surface. (Kelly et al., 2026.)
- **Recovery capital growth — employment, social support, recovery-group involvement — predicts retention and better outcomes.** The platform is built to grow exactly these. (REC-CAP / BARC-10 longitudinal studies.)
- **Structured goals and celebrated milestones matter**: people who set structured goals are meaningfully more likely to maintain sobriety at one year; milestone celebration is associated with lower relapse. (Multiple studies.)
- Pair with the center-side ROI benchmarks already in the platform (New Freedom case study): engagement 40→65%, program completion 50→65%, digital reach 30→80%, +20% long-term sobriety, ~2 clinician hours/day saved.

**Headline stat treatment**: a hero animated stat — the relapse-risk curve dropping from ~50% (year 1) toward <15% (year 5) — with the caption "Every month of engagement moves someone down this curve. We keep them on it." An honest footnote: individual outcomes vary; recovery is not linear; these are population-level findings.

---

## Page Structure ("For Recovery Centers", desktop + mobile, brand system docs/12)

1. **Hero** — "Keep them engaged. Keep them alive." (or softer alt: "The year after treatment decides everything.") Subhead on the continuum + engagement thesis. Dual CTA: Request a demo / See the platform. Background: the before/during/after continuum ribbon (docs/14) animated.
2. **The engagement curve** — the relapse-risk-over-time visual + the cited stat spine above. The single most persuasive section; give it room.
3. **The three blind spots** (from docs/14) — before care, after discharge, and engagement-as-efficacy — and how the platform fills each.
4. **Deliver your programming** — LMS + level-of-care curricula + gamification; assign the ISE/PON, IOP curricula, vocational tracks; in-facility + remote; the engagement mechanics (streaks, badges, goals) that keep clients coming back. Screenshots from seed.
5. **Stay connected across the continuum** — program group channels, 1:1 client messaging, alumni follow-up cadence (30/60/90/180/365d), relapse-risk early-warning. The "treatment ends, the continuum doesn't" story.
6. **Reach the community (the ad product)** — see below. "Your next client is already in the community."
7. **Prove your outcomes** — the analytics + licensed outcomes data (docs/14): continuum score, retention curves, recovery-capital deltas, grant-ready reports. "Show funders what works."
8. **How it all connects** — the one-member storyline (Danielle across five phases) as an illustrated scroll: their community life, goals, giving, and learning all becoming the center's outcome data.
9. **Pricing / subscription tiers** — center subscription (platform + programming + continuum + their own client analytics), with the ad product and the outcomes-licensing tier as add-ons. Exact prices TBD by Brian — build the layout with placeholder tiers and a "Talk to us" CTA.
10. **Trust & privacy** — consent, de-identification, not-an-EHR, HIPAA-adjacency posture (docs/10). Clinical buyers need this to say yes.
11. **Demo request / lead capture** — form → dashboard lead queue + Resend notification.

Copy voice: confident, clinical-credible, mission-warm. Never fear-mongering, never "Facebook," never guarantees. The center is a partner in saving lives, and the numbers back the approach.

---

## The Community Ad Product (new capability — sold on the page, delivered in the feed)

Centers (and only approved orgs — never arbitrary advertisers) can place **sponsored placements** in the community feed and relevant surfaces. This is member-safe advertising: recovery-relevant only, clearly labeled, tightly moderated, never exploitative.

```
sponsored_placements
  org_id → orgs, title text, body text, media jsonb, cta_label text, cta_url text,
  kind text check in ('service','alumni_event','job_opening','program','announcement'),
  audience_scope text check in ('community','geo','circle','phase'),  -- e.g. target continuing-phase alumni, or a metro
  targeting jsonb,                    -- coarse, non-clinical: metro, phase, interest tags — NEVER health/diagnosis targeting
  status text check in ('draft','pending_review','approved','running','paused','ended'),
  starts_at, ends_at, budget_cents int null, priced_model text,       -- flat placement fee v1 (not auction)
  approved_by uuid null

placement_events
  placement_id → sponsored_placements, kind text check in ('impression','click','dismiss','report'),
  participant_id null, occurred_at            -- aggregate analytics; no creepy per-user profiles surfaced to advertiser
```

**Rules (member trust is the product — these are non-negotiable):**
- **Labeled** clearly as "Sponsored by [Center]" with a distinct style; never disguised as a peer post.
- **Recovery-relevant only**: services, alumni events, job openings (fair-chance employers), programs, community announcements. No gambling, alcohol, predatory lending, MLM, or anything a person in recovery should not see. A hard content policy + Claude review gates every placement before it runs.
- **Frequency-capped** and spaced (e.g., no more than 1 sponsored item per N organic posts) so the feed stays a recovery space first.
- **Targeting is coarse and non-clinical only**: metro/geo, care phase (e.g., alumni), interest tags, circle topic. **Never** target by diagnosis, substance, health status, or any sensitive attribute (docs/10). No individual health profiles are ever exposed to an advertiser — analytics are aggregate.
- **Member controls**: dismiss/hide, report, and a setting to reduce sponsored content. Reported placements route to the existing moderation queue.
- **Approval workflow**: center drafts → platform (ms_admin) content-policy review + Claude check → approved → runs. Every placement audit-logged.
- **No ads targeted at active-crisis or high-risk signals**, ever. If a member is in a flagged/at-risk state, they see support resources, not sponsored content.

**Ad manager (dashboard, extends docs/08):** center creates/manages placements, sees aggregate impressions/clicks/dismiss/report, schedule + budget, review status. ms_admin approval console + platform-wide content policy controls + kill switch.

**Analytics surfaced to advertiser**: aggregate only — impressions, clicks, CTR, by coarse audience. Never per-member behavior.

## Dashboard additions (extend docs/08)
- Center: Ad Manager (create/manage/analytics), subscription/billing view, lead-source attribution
- ms_admin: placement review + approval console, content-policy config, frequency-cap config, platform ad kill switch
- Lead queue for demo requests from the marketing page

## Compliance additions (feeds docs/10)
- Add to §5 checklist: advertising content policy signed off by Brian/counsel; confirm sponsored placements to a vulnerable population meet ethical + legal advertising standards; confirm no health-based ad targeting; disclosure/labeling language reviewed.

## Definition of Done
Everything in `requirements/12-CENTERS-PAGE-AND-ADS.md` checked with evidence; the centers page live (desktop+mobile) with cited engagement stats and the animated relapse-risk curve; the sponsored-placement system built with all trust rules enforced and negative-tested (no health targeting possible, frequency cap holds, crisis-state members never served ads, every placement moderated); ad manager + approval console built; demo-request lead capture working; seed data shows 2–3 sample approved placements from seed centers running in Danielle's feed; zero regressions; never the word "Facebook" anywhere.
