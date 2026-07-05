# My Struggle Platform — Build Spec Package

**End the Struggle, Build the Future Together.** This folder is the complete, Claude Code–ready specification for the My Struggle recovery and reintegration platform: QR giving, community feed, mentorship, LMS with gamification, and the center dashboard — one multi-tenant product.

## How to Use This Package

1. Create the repo (GitHub: AI-Management-Partners), copy this entire folder to the repo root.
2. Do the 30-minute pre-flight in `docs/09-BUILD-PLAN.md` (Supabase, Stripe test, Vercel, `.env.local`).
3. Open Claude Code in the repo and paste the **Phase 1** prompt from `docs/09-BUILD-PLAN.md`. Run phases in order — each reads its spec docs itself.
4. Review `DECISIONS.md` after every phase before starting the next.

## File Map

| File | What it is |
|---|---|
| `CLAUDE.md` | Master rules Claude Code reads every session — stack, layout, security rules, definition of done |
| `docs/00-VISION.md` | Mission, product thesis, the loop that makes this platform unprecedented, scope fence |
| `docs/01-BRAND.md` | Modern-blue design system extracted from my-struggle.dudasites.com — tokens, voice, layout language |
| `docs/02-ARCHITECTURE.md` | Stack, route groups, tenancy, roles, security model, realtime, AI touchpoints |
| `docs/03-DATA-MODEL.md` | Full schema — the source of truth |
| `docs/04-MODULE-QR-GIVING.md` | Scan → give → ledger → impact loop, Stripe implementation, guardrails |
| `docs/05-MODULE-SOCIAL.md` | Recovery-safe Facebook-style feed with the moderation pipeline |
| `docs/06-MODULE-MENTORSHIP.md` | Mentor lifecycle, matching, messaging, session accountability |
| `docs/07-MODULE-LMS-GAMIFICATION.md` | Course engine (ISE-ready), points, badges, streaks — recovery-aware gamification |
| `docs/08-MODULE-CENTER-DASHBOARD.md` | Metrics, participant management, post-discharge tracking, grant-winning reports |
| `docs/09-BUILD-PLAN.md` | Six phases with copy-paste autonomous Claude Code prompts |
| `docs/10-COMPLIANCE.md` | Privacy, donation-model legality (incl. the 50/50 cash split questions), safeguarding — plus the counsel checklist |
| `docs/11-ECOSYSTEM.md` | The Store, My Safety, outreach centers, the for-profit partnership (The Notch, Guardians of Grace), REPrieve.ai lineage |
| `docs/intake/` | Source pitch decks (My Struggle, REPrieve.ai overview + marketing plan) — reconciled into these specs |

## What Still Needs Brian

- The counsel/CPA checklist in `docs/10-COMPLIANCE.md` §5 — the 50/50 split deductibility and Part 2 questions especially
- Position of Neutrality content coordination for the ISE courses
- Real participant stories/photos with signed consent for launch content
