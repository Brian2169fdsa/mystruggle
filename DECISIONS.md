# Decisions Log

Judgment calls made while building, newest first. Format:
`YYYY-MM-DD · area · decision · why`.

- 2026-07-06 · seed · docs/16's "Desert Hope" demo center maps to the existing
  `center-laveen` (Laveen Center) · the seed already anchors Danielle, Sarah,
  and the IOP cohort at Laveen; a second flagship center would fork the demo
  story. Every "Desert Hope runs 3 programs" requirement is satisfied by
  Laveen's 3 live programs (ISE 12-Step, IOP Core, Vocational Readiness).
- 2026-07-06 · types · Renamed the LMS string union `Program`
  ("PON"|"VOC"|"IOP"|"NAV") to `ProgramCategory` so the Center Operations
  Program ENTITY (docs/16 Part A) can own the `Program` name · TypeScript
  cannot export both under one name; `Course.program` keeps its field name and
  values, and the new `Program.category` reuses the same literals plus "other".
  Only one consumer (member-app LearnTab) imported the old alias; updated.
- 2026-07-06 · types · Extended the existing `LevelOfCare` union with "custom"
  instead of declaring a duplicate · docs/16's programs schema includes
  'custom' for center-defined offerings; additive to the docs/14 union, and no
  exhaustive Record over LevelOfCare exists in code (verified).
- 2026-07-06 · seed · Danielle keeps her historical "continuing"-phase episode
  AND holds an active Summer 2026 IOP Core enrollment linked to that same
  episode · requirements/13 demands both her alumni continuum arc (docs/14)
  and a live in-treatment portal demo; one episode keeps Client 360 a single
  continuous story rather than forking her history.
- 2026-07-06 · seed · Two new Laveen staff appended after all existing users:
  Angela (counselor on Danielle's care team) and Dev (tech by title, serving
  as peer_support on her care team) · docs/16 asks for a care team of 3 with
  Sarah as primary case manager; appending after every existing user keeps all
  prior seed-* ids byte-identical (verified old-vs-new seed diff: identical).
- 2026-07-06 · seed · Every IOP Core cohort member (not just Danielle) gets a
  small care-team assignment (Sarah + one new staff) · the My Caseload view
  (requirements/13 §C) would otherwise render a caseload of one.

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
