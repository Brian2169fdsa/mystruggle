# CLAUDE CODE PROMPT — Community + Goals + Résumé + Companion Expansion
# Paste into Claude Code in the existing My Struggle repo.

Read `AUTOPILOT.md`, `CLAUDE.md`, `docs/13-MODULE-COMMUNITY-EXPANSION.md`, and `requirements/10-COMMUNITY-EXPANSION.md` in full before writing any code. Also skim docs/02 (The Guide), docs/04 (goals/giving), docs/05 + docs/06 (feed/moderation), docs/07 (journey_tasks/gamification), and docs/12 (design) so you extend them correctly.

**This is an EXPANSION of the already-built platform. Iron rule: expand, never replace.** Do not rename, delete, merge, or rebuild any existing table, route, component, or module. Every addition either introduces a new table/route or *extends* an existing one, and every extend is logged in `DECISIONS.md`. If something here seems to conflict with what's built, keep both, flag it in the gap report's DECISIONS-NEEDED, and continue.

Build the expansion per docs/13:
- **Member profiles** with consent-gated public pages and the recovery-capital 3-ring snapshot (+ optional BARC-10 self-check, framed warmly, never clinical, never public without consent)
- **Community/Circles** layered onto the existing feed — topic/cohort/alumni circles, shared-experience reactions, daily reflection + gratitude rituals, an "ask for support" post type, all inheriting the existing moderation + crisis path
- **Recovery Goals** as the middle layer that connects existing `journey_tasks` (to-dos) and existing `goals` (donations) without merging them — member-owned, mapped to recovery-capital domains, with the two signature flows fully working: "get a halfway house" (goal → milestones → tasks → linked funding goal → move-in celebration) and "get a job" (goal → résumé → job-application tracker → Companion nudges → offer)
- **Résumé builder** — guided, mobile-first, gap/record-aware, branded PDF export, attachable to job applications
- **AI Companion** — EXTEND the existing Guide into one plan-aware companion (goal coaching, résumé coaching, interview practice, resource concierge, opt-in daily check-in). Do NOT create a second assistant. All existing safety rails stay and are re-verified; every write tool requires member confirmation; member can wipe Companion memory.

Tie everything together via the **recovery-capital coherence contract** (docs/13 Part F): community grows social capital, goals/résumé/companion grow personal capital, housing/employment outcomes grow community capital — surfaced as three domain rings for the member and an outcome signal on the dashboard.

Follow the AUTOPILOT loop: audit → rewrite GAP-REPORT.md → build highest-priority gaps → verify each by running it → check boxes in requirements/10 with evidence → re-report → commit. **Seed rich mock data** (Danielle's full storyline per the checklist + 40 other members so every circle and chart looks alive). **Run the full existing test suite every session and treat any regression to feed/giving/gamification/mentorship as a P0.** Keep running against `requirements/10-COMMUNITY-EXPANSION.md`, writing the gap report each run, until it is 100% complete, verified end to end, mobile-checked, and RLS-negative-tested — with zero regressions to what was already built.

Do not ask me questions mid-run; batch them into DECISIONS-NEEDED and keep building elsewhere.
