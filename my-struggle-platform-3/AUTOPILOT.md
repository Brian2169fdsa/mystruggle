# AUTOPILOT.md — Run-Until-Done Protocol for Claude (Fable 5 / Claude Code)

You are building the My Struggle Platform autonomously. This file governs EVERY session. The specs live in `/docs` (design + architecture truth). The acceptance checklists live in `/requirements` (completion truth). You are done ONLY when every checklist item in `/requirements` is checked and verified.

## The Loop (execute this every single run, in order)

1. **ORIENT** — Read `CLAUDE.md`, this file, and `GAP-REPORT.md` (if it exists). Read the `/requirements` file(s) for the area you'll work on, and the matching `/docs` spec before writing any code.
2. **AUDIT** — Compare the actual codebase against `/requirements`. Do not trust checked boxes from prior runs blindly: spot-verify 5 random previously-checked items each run (run the app, hit the route, run the test). If a checked item fails verification, uncheck it and log it as a REGRESSION in the gap report.
3. **REPORT** — Rewrite `GAP-REPORT.md` from scratch using the format in `requirements/GAP-REPORT-FORMAT.md`. This happens EVERY run, before building, and is updated again after building. The gap report is the single source of truth for project status.
4. **PLAN** — Pick the highest-priority open gaps (priority order: P0 blockers → security/RLS → money paths → core flows → UI polish → nice-to-haves). Plan a batch you can genuinely complete and verify this run. Prefer finishing one area completely over starting three.
5. **BUILD** — Implement. Follow `/docs` specs exactly; log any judgment call in `DECISIONS.md`. Every feature ships with its empty/loading/error states and its mobile view where applicable.
6. **VERIFY** — For each item you built: run it (dev server, route, or test), then and only then check its box in `/requirements` with a one-line evidence note (e.g., `✔ verified: /give renders 3 balances from seed member Danielle`). RLS items require the negative test to pass. Never check a box for code that merely exists but wasn't executed.
7. **RE-REPORT** — Update `GAP-REPORT.md` with the run's results: items closed, items opened, regressions found, % complete per surface, and the recommended focus for the next run.
8. **COMMIT** — Conventional commits, one logical change per commit. Final commit of the run updates GAP-REPORT.md and requirements checkboxes.

## Hard Rules

- **Mock data always**: the app must never look empty. Maintain the seed per `requirements/09-SEED-DATA.md` — 1 nonprofit org + 2 centers, 500 members with 12 months of realistic history, Danielle #039521464 as the flagship demo member, donations, posts, courses, sessions. If a new feature has no seed data, seeding it is part of the feature.
- **Every surface, every run**: the gap report always covers all surfaces (website, member app, mentor app, dashboard, public giving pages, system settings, APIs/cron) even if you only worked on one.
- **Definition of done per item** = implemented + seeded + states handled + mobile verified (if app/web) + RLS negative-tested (if data) + box checked with evidence.
- **Never delete requirements items.** If a requirement seems wrong or conflicts with `/docs`, keep it, flag it in the gap report's DECISIONS-NEEDED section, and continue with other work.
- **Stop conditions**: a run may end when its planned batch is verified and reports are updated. THE PROJECT is done when GAP-REPORT.md shows 100% on every surface and a full clean verification pass (all P0/P1 spot checks) has been run end to end.
- Do not ask the human questions mid-run. Batch questions into DECISIONS-NEEDED in the gap report and keep building elsewhere.

## Priority Ladder (when choosing what to build)

P0: app boots, auth, migrations, RLS, Stripe webhook integrity, crisis-alert path
P1: core member/mentor/dashboard flows and the public QR giving loop
P2: gamification engine, feed moderation pipeline, LMS player, reports
P3: website marketing pages, celebrations/polish, exports, settings depth
P4: PWA install polish, offline journal, print templates, animations
