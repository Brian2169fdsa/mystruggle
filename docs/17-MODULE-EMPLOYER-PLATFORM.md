# 17 — Module: Second-Chance Employer Platform (EXPANSION — reuse-first)

> **Read this first, Claude Code:** EXPANSION with a strict **reuse-first mandate**. Much of this already exists — you add ONLY what doesn't. Before building anything, audit and wire into: `job_applications` + résumé builder + Companion job coaching (docs/13), `sponsored_placements` with kind `job_opening` (docs/15), employment recovery goals + RC community-capital domain (docs/13/14), `continuum_events` (docs/14), care team referrals (docs/16), My Safety ecosystem context (docs/11), and orgs/memberships/RLS (docs/03). Do NOT create parallel application, résumé, messaging, or moderation systems. New checklist: `requirements/14-EMPLOYER-PLATFORM.md`.

---

## Purpose

Fair-chance employers post jobs directly to the recovery community; members find work through the same platform that's rebuilding the rest of their lives; centers and the data prove it. Employment is the strongest community-capital predictor of sustained recovery — this module turns that finding into a marketplace: **employers get vetted access to motivated, supported candidates; members get employers who already said yes to their past.**

## What already exists (REUSE — do not rebuild)
- Member job tracking: `job_applications` (docs/13) — extend with nullable `posting_id`; external self-tracked applications keep working unchanged
- Résumé builder + PDF + "attach to application" (docs/13)
- Companion: job coaching, interview practice, résumé tailoring (docs/13) — point it at postings
- Feed promotion: `sponsored_placements` kind `job_opening` (docs/15) — a posting can be promoted via the existing ad system
- Employment goals + RC rollup + `continuum_events` (hired = community-capital event)
- Care-team referral surface (docs/16 caseload) and orgs/memberships/roles (docs/03)

## New: Employer Orgs & Vetting

- Extend `orgs.type` enum with `'employer'`; employer staff use existing `memberships` with new roles `employer_admin`, `recruiter`
- **Vetting gate (P0)**: employers apply (company, EIN, contact, roles they hire, fair-chance pledge acceptance) → ms_admin review → verified before any posting is visible. The **Fair-Chance Pledge** is the trust product: hire based on qualifications; records considered individually per EEOC guidance, never blanket-excluded; no requirement that candidates disclose recovery or justice history beyond lawful background-check process.
```
employer_profiles
  org_id → orgs unique, ein text, website, industry, about text,
  pledge_signed_at timestamptz, pledge_signed_by uuid,
  verification_status text check in ('pending','verified','suspended'), verified_by uuid
```

## New: Job Postings & Discovery

```
job_postings
  org_id → orgs (employer), title text, description text,
  employment_type check in ('full_time','part_time','temp','apprenticeship'),
  pay_min_cents int null, pay_max_cents int null, pay_period text,
  location text, metro text, remote boolean default false,
  requirements text, benefits text,
  fair_chance_notes text null,          -- e.g. "we sponsor fidelity bonding", "record-friendly after individual review"
  status check in ('draft','pending_review','open','paused','filled','closed'),
  posted_at, filled_at null
```
- Every posting passes the existing moderation review (content policy + Claude gate from docs/15) before going live — no exploitative, commission-only-MLM, or predatory listings
- **Member job board** (member app, inside Goals & Reentry / employment area + Guide entry point): browse/filter (metro, type, pay, remote), save jobs, one-tap **Apply with my résumé** → creates a `job_applications` row linked to the posting; Companion offers to tailor the résumé to the posting first
- Care staff can **refer** a client to a posting from the caseload/Client 360 (creates a suggested-job card for the client — client always decides)

## New: Candidate Pipeline (employer side) — privacy-first

```
posting_candidates
  posting_id → job_postings, job_application_id → job_applications unique,
  stage check in ('applied','screening','interview','offer','hired','closed'),
  stage_changed_at, employer_notes text
```
- **What the employer sees**: the candidate's chosen name, résumé, and application answers. NOTHING else — no recovery details, no journey stage, no center, no continuum data, no community activity (RLS negative-tested). Membership in the community is inherently visible by context; the consent screen tells the member this plainly before their first apply, and offers "export résumé + apply externally instead" as an always-available alternative.
- Pipeline board (kanban by stage), stage changes notify the member, hire marks the posting progress
- **Hired**: writes `continuum_events` (source `goal`, employment), advances the member's employment recovery goal, fires celebration (member-consented feed post), and shows in center outcomes (employment = community capital delta in mv_care_outcomes)
- Messaging: reuse a scoped care-channel-style thread per candidate (moderated, no-PII rules); no free-form employer→member DMs outside an active application

## New: Employer Dashboard (own surface, same design system)

Nav: Overview · Postings · Candidates · Hires · Resources · Settings
- **Overview**: open postings, pipeline counts, time-to-fill, hires YTD, retention snapshot
- **Postings**: create/edit/pause/fill; "Promote in community" hands off to the existing sponsored-placement flow
- **Candidates**: kanban pipeline per posting; résumé viewer; interview scheduling note field
- **Hires & retention**: hires list, 30/90/180-day retention check-ins (simple employer confirm: still employed? — each confirm writes a continuum_event and powers the retention stat both sides brag about)
- **Resources**: WOTC (Work Opportunity Tax Credit) explainer + Federal Bonding Program info + fair-chance hiring guides — surfaced as employer value ("hiring second-chance can come with real incentives"), flagged as informational-not-tax-advice
- **Settings**: company profile, team (recruiter invites), pledge status

## Website: "For Employers" page (extends docs/01/12/15 patterns)
- Hero: "Hire people with something to prove — and a community behind them." Value props: motivated candidates with active support systems (mentor + care team + Companion = lower-risk hire), retention data, WOTC/bonding incentives, simple pipeline, the pledge as a badge of honor ("Fair-Chance Verified" mark employers can display)
- Honest stat spine: employment as a top predictor of sustained recovery (recovery-capital research); retention framing from platform data as it accrues
- How it works (post → review → pipeline → hire → retention), pricing placeholder (free/flat while seeding supply — Brian decision), employer application CTA
- My Safety cross-link: "We also staff peer safety officers" (docs/11)

## Compliance additions (feed docs/10 §5 — counsel before launch)
- [ ] Fair-chance pledge language + EEOC individualized-assessment framing reviewed by counsel
- [ ] Ban-the-box / state fair-chance law variance (AZ + remote postings) reviewed
- [ ] Platform is NOT a background-check provider (FCRA) — no background data stored or brokered; confirm posture
- [ ] Candidate-disclosure consent screen language reviewed (applying reveals community affiliation)
- [ ] WOTC/bonding content labeled informational, not tax/legal advice

## Definition of Done
Everything in `requirements/14-EMPLOYER-PLATFORM.md` checked with evidence. Seed: 4 verified employers (incl. My Safety and The Store as in-ecosystem employers — the loop from docs/11 made real), 12 open postings across types/metros, Danielle's job goal linked to a posting application moving through the pipeline to hired with the celebration + continuum event + center outcome visible; 2 pending employer verifications; retention confirms populated. Employer can see ONLY name/résumé/application (negative tests). Zero regressions; reuse audit logged in DECISIONS.md proving no parallel systems were built.
