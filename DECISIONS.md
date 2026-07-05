# Decisions Log

Judgment calls made while building, newest first. Format:
`YYYY-MM-DD · area · decision · why`.

- 2026-07-05 · protocol · Bootstrapped `/docs` from
  `project/design_handoff_my_struggle/platform-docs/` and authored the initial
  `/requirements` checklists from those specs + the handoff README · AUTOPILOT.md
  presumes both exist; they didn't. Checklist items marked done only after
  live verification this run.
- 2026-07-05 · data · Kept the in-memory store (no Supabase/Stripe yet) ·
  no credentials/project exist; store is the documented swap seam. All
  RLS/webhook requirements remain open P0s and are listed in DECISIONS-NEEDED.
- 2026-07-05 · seed · Seed generator is deterministic (mulberry32 PRNG, fixed
  epoch date) so every boot produces the same 500 members / 12-month history ·
  AUTOPILOT forbids empty-looking app; determinism keeps demos and spot-checks
  stable across restarts.
- 2026-07-05 · api · Feed API caps at latest 50 approved posts; admin roster
  returns all members but dashboard renders capped lists with counts · 500-member
  seed would otherwise make first paint and moderation unusable.
