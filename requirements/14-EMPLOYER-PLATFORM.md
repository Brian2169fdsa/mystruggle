# 14 — EMPLOYER PLATFORM REQUIREMENTS
# EXPANSION, reuse-first. Build ONLY what doesn't exist; wire into job_applications/résumé/Companion/placements/continuum. No parallel systems.

## A. Reuse Audit (first run, before any code)
- [ ] Audit logged in DECISIONS.md mapping every employer feature to existing systems reused (job_applications, résumés, Companion, sponsored_placements, continuum_events, care channels, moderation, orgs/memberships)
- [ ] job_applications extended with nullable posting_id; external self-tracked applications unchanged (regression test)

## B. Employer Orgs & Vetting
- [ ] orgs.type gains 'employer'; roles employer_admin + recruiter via existing memberships
- [ ] employer_profiles table + RLS; employer application flow (company/EIN/contact/pledge)
- [ ] Fair-Chance Pledge acceptance recorded (who/when); ms_admin verification queue; nothing visible until verified (negative test)
- [ ] Suspend switch (ms_admin) hides all employer postings immediately

## C. Postings & Discovery
- [ ] job_postings table + RLS; full lifecycle draft→pending_review→open→paused/filled/closed
- [ ] Every posting passes existing moderation gate (predatory/MLM blocked) before open
- [ ] Member job board in Goals & Reentry: browse/filter (metro/type/pay/remote), save, posting detail
- [ ] Apply with my résumé → job_applications row linked to posting; Companion offers tailoring first
- [ ] First-apply consent screen: plain-language disclosure that applying reveals community affiliation + "export résumé & apply externally" alternative always offered
- [ ] Staff referral from caseload/Client 360 → suggested-job card; client decides (no auto-apply)
- [ ] "Promote in community" hands posting to existing sponsored_placements flow (job_opening kind) — no duplicate ad path

## D. Candidate Pipeline (privacy-first)
- [ ] posting_candidates table + RLS; kanban applied→screening→interview→offer→hired→closed
- [ ] Employer sees ONLY: chosen name, résumé, application answers — negative tests prove no access to recovery/journey/center/continuum/community data
- [ ] Stage changes notify member; scoped moderated message thread per candidate; no employer→member contact outside active application (negative test)
- [ ] Hired: continuum_event written, employment recovery goal advanced, consented celebration post, visible in center outcomes (mv_care_outcomes employment delta)

## E. Employer Dashboard
- [ ] Overview (open postings, pipeline counts, time-to-fill, hires, retention snapshot)
- [ ] Postings CRUD + promote; Candidates kanban + résumé viewer; team management + pledge status in Settings
- [ ] Hires & retention: 30/90/180-day employer confirm flow; each confirm writes continuum_event; retention stat computed
- [ ] Resources: WOTC + Federal Bonding + fair-chance guides, labeled informational-not-advice
- [ ] Same design system; desktop 1440 verified

## F. "For Employers" Website Page (desktop + mobile)
- [ ] Hero + value props (supported candidates, retention, incentives, Fair-Chance Verified mark)
- [ ] Honest stat framing (employment as recovery predictor; no guarantees), how-it-works, pricing placeholder, employer application CTA → verification queue
- [ ] My Safety cross-link; zero "Facebook"; citations where stats used

## G. Compliance (docs/10 §5 additions surfaced, not bypassed)
- [ ] Pledge/EEOC language, ban-the-box variance, not-a-background-check-provider posture, disclosure consent language, WOTC labeling — all flagged for counsel

## Seed
- [ ] 4 verified employers incl. My Safety + The Store; 12 open postings across types/metros; 2 pending verifications; 1 suspended example
- [ ] Danielle: application on a posting progressing to hired with celebration + continuum event + center outcome delta visible
- [ ] Retention confirms populated so dashboards look alive

## Regression Guard
- [ ] All existing suites green; job_applications/résumé/Companion/placements untouched except documented extends; no parallel messaging/moderation/application systems (audit check)
