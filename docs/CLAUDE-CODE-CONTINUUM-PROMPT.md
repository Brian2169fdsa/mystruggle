# CLAUDE CODE PROMPT — Continuum of Care (the platform thesis)
# Paste into Claude Code in the existing My Struggle repo.

Read `AUTOPILOT.md`, `CLAUDE.md`, `docs/14-MODULE-CONTINUUM-OF-CARE.md`, `requirements/11-CONTINUUM-OF-CARE.md`, and `docs/10-COMPLIANCE.md` §6 in full before writing code. Also re-read the parts you're extending: enrollments + journey_stage + materialized views in docs/03, LMS docs/07, community docs/05+13, giving docs/04, dashboard docs/08, The Guide/Companion docs/02+13, and the website design in docs/12.

**This is the platform's central spine and an EXPANSION. Iron rule: expand, never replace.** Do not rename, delete, merge, or rebuild enrollments, journey_stage, the LMS, community, giving, mentorship, or the dashboard. You add new tables (care_episodes, phase_transitions, continuum_events, care_channels, care_messages, the new MVs) and you add *thin hooks* so existing modules emit `continuum_events` — you do not rewrite those modules. Log every extend in `DECISIONS.md`. Conflicts go to the gap report's DECISIONS-NEEDED, then keep building.

Build the continuum per docs/14:
- **The care record spine** — five phases (pre_care → intake → in_program → transition → continuing) tracked per center relationship alongside the existing journey_stage, with an append-only phase-transition log and the unified `continuum_events` stream that every module writes to via hooks.
- **Pre-care** — an unaffiliated member uses the full platform with no center; centers see nothing until the member consents to connect. This is the differentiator — make baseline recovery capital measurable before any treatment episode.
- **Intake consent handshake** — granular, revocable, per-center, extending the existing consent panel.
- **In-program clinical communication layer** — program group channels (IOP cohort), 1:1 staff↔client channels, announcements, all reusing the existing moderation + crisis pipeline, all barred from carrying PHI/clinical notes (engagement comms, not therapy).
- **Level-of-care programming** — extend the LMS with LOC targeting and facility/kiosk delivery; gamification runs identically inside and outside the facility so engagement is measured the same everywhere.
- **Transition + continuing** — discharge planning into aftercare goals/mentor/circles, and the post-discharge outcomes engine with 30/60/90/180/365-day follow-up cadence and an alumni dashboard with relapse-risk early-warning.
- **The licensed outcomes data product** — mv_continuum_score, mv_care_outcomes, mv_efficacy; TWO code-separated data planes (identified-consented-single-center vs de-identified-aggregated-licensed); the licensed export path can never read identifiable fields; min cohort size k≥11; research-use opt-out. Enforce the docs/10 §6 governance and surface (never bypass) the counsel-blocking items.
- **Dashboard** — the continuum ribbon timeline (the demo screen), the in-program program cockpit, the alumni/continuing dashboard, and extended outcomes reporting with pre→during→post recovery-capital deltas.
- **Website "For Recovery Centers"** — the before/during/after story that sells centers: "Treatment ends. The continuum doesn't.", the three blind spots, a seed-driven live-looking demo dashboard, the published case-study ROI benchmarks, the plain-language "how the community follows them into the world" explainer, the data/privacy trust section, and a request-a-demo CTA. Desktop + mobile.

Make the whole thing cohere via the storyline in docs/14: one member, all five phases, every module feeding her continuum ribbon — community → continuum events → engagement score → center analytics → licensed outcomes → website proof → more centers. Seed Danielle traversing all five phases plus 60 members across phases/LOCs so every cockpit, curve, ribbon, and alumni view looks alive, and prove the de-identified export works.

Follow the AUTOPILOT loop: audit → rewrite GAP-REPORT.md → build highest-priority gaps (P0 = consent/data-plane separation + no-regression) → verify each by running it → check boxes in requirements/11 with evidence → re-report → commit. Run the full existing test suite every session; any regression to enrollments/LMS/community/giving/mentorship/dashboard is a P0 stop. Keep running against `requirements/11-CONTINUUM-OF-CARE.md` until it's 100% complete, verified end to end, mobile-checked, RLS- and data-plane-negative-tested, with zero regressions.

Do not ask me questions mid-run; batch them into DECISIONS-NEEDED and keep building elsewhere.
