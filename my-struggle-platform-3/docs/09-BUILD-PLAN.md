# 09 — Build Plan: Phases & Claude Code Session Prompts

Seven phases, each sized for 1–3 autonomous Claude Code sessions. Every session prompt below is copy-paste ready. Model strategy per ManageAI standard: Claude Code runs the builds; Fable 5 reserved for the moderation-reviewer and narrative-generation runtime calls, not the build itself.

**Before Phase 1** (Brian, ~30 min): create Supabase project, Stripe account (test mode), Vercel project, GitHub repo under AI-Management-Partners, drop keys in `.env.local`, commit this `/docs` folder + `CLAUDE.md` to the repo root.

---

## Phase 1 — Foundation (scaffold, auth, tenancy, brand)

```
You are an expert full-stack engineer working in an autonomous Claude Code session.

Context:
- Project: My Struggle Platform — read CLAUDE.md and docs/00 through 03 fully before writing code.
- Stack: Next.js 15 App Router + TypeScript + Tailwind + Supabase + Vercel. Fresh repo; .env.local is populated.

Task: Scaffold the app, implement the full identity/tenancy schema, auth, and role-routed shells for all three surfaces.

Build steps:
1. Init Next.js 15 + Tailwind with the ms brand tokens from docs/01-BRAND.md; install supabase-js, next-pwa.
2. Write migration 0001 implementing every table in the Identity & Tenancy section of docs/03-DATA-MODEL.md with RLS policies per docs/02.
3. Supabase Auth (email + magic link). Onboarding writes profiles + memberships.
4. Route groups per docs/02 with role middleware: participant/mentor → PWA shell with bottom tab bar (Home/Learn/Give/Chat/Me); center roles → dashboard shell with navy sidebar; public group with placeholder landing.
5. PWA manifest + install prompt, brand icons from the logo URL in docs/01.
6. Seed script: My Struggle org, one demo center, demo users for every role, participant Danielle #039521464.

Done when: all three shells render behind correct role routing on Vercel preview; RLS negative test (script in /tests) proves cross-org isolation; DECISIONS.md logs every judgment call.
Run autonomously; do not stop to ask questions.
```

## Phase 2 — QR Giving with the 50/50 Split (docs/04)

```
Read CLAUDE.md, docs/03 (QR Giving & Funds tables), docs/04, docs/10 §2, docs/11. Build the complete QR giving module: migration 0002 (goals, donations with split columns, ledger_entries with cash/credit/reentry buckets, stores, member_cards, qr_scans + public_participant_profiles security-definer view), public give pages at /p/[qr_slug] to brand spec WITH the prominent 50/50 "Where your gift goes" split explainer, Stripe Checkout (one-time + weekly recurring), idempotent webhook writing donation + both ledger legs in one transaction, member /give tab (QR code, balances for cash/credits/reentry savings, save-for-my-future transfer, printable card PDF edge function), dashboard giving pages (goal/story/photo approval with consent checklist, cash redemption desk with member ID card scan flow + daily cap, Store credit redemption recorder per store location, ID card batch printing, split analytics). Done when the full test-card loop runs scan → give → split ledger → balances → card-scan cash redemption, consent revocation flips the public page, and anon cannot read base tables. Run autonomously.
```

## Phase 3 — Community Feed (docs/05)

```
Read CLAUDE.md, docs/03 (Social Feed tables), docs/05. Build: migration 0003, composer + feed (audience selector, reverse-chron, pinned staff posts, heart reactions, one-level comments), Realtime new-post pill, moderation pipeline exactly as specified (edge first-pass → claude-sonnet-4-6 rubric review → staff queue; crisis-language path alerts org staff by email within 60s and holds the post, showing the author a resource message with 988), system-post generation hooks (stub events for now), report/block. Done when the moderation state machine passes the test matrix in docs/05 Done When. Run autonomously.
```

## Phase 4 — Mentorship (docs/06)

```
Read CLAUDE.md, docs/03 (Mentorship tables), docs/06. Build: migration 0004, public mentor application form → dashboard review queue → training gate → activation, staff match workbench with specialty/lived-experience overlap scoring, dual-accept flow, threads + Realtime messaging (mentorship threads only), mentor roster view with mentee health-at-a-glance, one-tap session logging, mood check-ins, concern escalation → staff email. Done when full lifecycle passes and mentor RLS negative test passes. Run autonomously.
```

## Phase 5 — LMS + Gamification (docs/07)

```
Read CLAUDE.md, docs/03 (LMS + Gamification tables incl. journey_tasks, videos), docs/07. Build: migration 0005, dashboard course builder (block editor per content jsonb spec, drag ordering, program category PON/VOC/IOP/NAV, self-paced vs group-facilitated delivery, preview-as-participant), assignment manager (org/stage/individual + due dates + notifications), participant Learn tab with full-screen lesson player (video, rich text, journal with IndexedDB offline autosave, quiz, discussion→feed-thread block) plus the categorized video library, PWA Home with My Tracker / My Center dual progress rings over journey_tasks with one-tap check-off, sequence locking, points/badges/streaks/levels engine with nightly cron, streak freeze token, celebration overlays, system feed posts with 5-minute opt-out grace. Seed the 8 ISE course shells tagged PON. NO public participant leaderboards. Done when docs/07 Done When passes including the airplane-mode journal test. Run autonomously.
```

## Phase 7 — The Guide (AI reentry navigator, docs/02 AI touchpoint 1)

```
Read CLAUDE.md, docs/02 (AI Touchpoints), docs/03 (journey_tasks), docs/10 §1 and §3. Build The Guide: a chat surface on the PWA (friendly, warm, brand voice — "no matter what you need I am here to help") backed by claude-sonnet-4-6 with a tightly scoped system prompt; RAG over a staff-maintained resources table in Supabase (migration 0007: resources with title, body, category e.g. housing/documents/employment/transport, org_id); tool use limited to create_journey_task and search_resources; hard rules in the system prompt: never give clinical, medical, legal, or crisis counseling — crisis language triggers the existing staff-alert path and shows the 988 resource message; conversation logs stored and visible to assigned staff; quick-start chips ("I'm looking for a halfway house", "I need my driver's license back", "Help me find a job"). Dashboard: resource library editor + Guide conversation review pane. Done when the Guide answers a housing question from seeded resources, creates a task that appears in My Tracker, and a crisis-language test message alerts staff within 60s without the Guide attempting counseling. Run autonomously.
```

## Phase 6 — Dashboard Analytics + Reports (docs/08)

```
Read CLAUDE.md, docs/03 (materialized views), docs/08. Build: migration 0006 (mv_org_engagement, mv_participant_health, mv_giving_summary, mv_outcomes + nightly refresh cron + risk_flag logic), Overview screen with KPI cards/trend/funnel/task queue, full Participants roster + detail with journey timeline and post-discharge visibility, completion heatmap, outcomes report with 3/6/12-month retention cohorts, branded PDF + CSV export, Claude narrative-summary button (claude-fable-5), audit logging on all financial/consent/role actions. Seed 500 demo participants with realistic 12-month histories so every chart has life. Done when Overview < 2s on seeded data and the cross-org RLS suite is green. Run autonomously.
```

---

## After Phase 7

Launch checklist: docs/10 §5 counsel items, Stripe live mode, custom domain (app.themystruggle.com), real ISE media upload, pilot center onboarding runbook, mentor cohort #1. Then v2 backlog: native apps, auto-matching, background-check API, housing module, employer partnerships, white-label for other nonprofits.
