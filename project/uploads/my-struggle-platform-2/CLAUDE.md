# CLAUDE.md — My Struggle Platform

## What This Project Is

The My Struggle Platform is a recovery and reintegration ecosystem built for the nonprofit **My Struggle** (themystruggle.com, EST. 2021, Laveen AZ, co-founded by Brian Reinhart and Wayne Giles). It helps people experiencing homelessness, addiction recovery, and reentry from incarceration rebuild their lives through:

1. **QR Code Giving** — donors scan a participant's QR code and give directly toward that person's needs and goals (nonprofit-managed restricted funds)
2. **Community Feed** — a Facebook-style social space where mentees and mentors share milestones, success stories, and encouragement
3. **Mentorship** — matching, messaging, and session tracking between mentors with lived experience and mentees
4. **LMS + Gamification** — centers and My Struggle assign course content (e.g., the Position of Neutrality Interactive Step Experience, 8-course 12-step journey); participants earn points, badges, and streaks
5. **Center Dashboard** — recovery centers and partner orgs see engagement metrics, track participant outcomes, assign content, and stay connected with participants in and out of their facility

## Surfaces

- **Participant mobile app** (PWA, mobile-first): feed, my journey, QR profile, courses, mentor chat
- **Mentor mobile app** (same PWA, mentor role): mentee roster, feed, messaging, session logging
- **Center dashboard** (desktop web): metrics, participant management, content assignment, alerts
- **Public donor pages** (no auth): QR landing page per participant, org donation pages

## Stack (pinned — do not substitute)

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS, deployed on Vercel
- **Backend/data**: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- **Payments**: Stripe (Checkout + webhooks; Connect NOT used in v1 — all funds land in the nonprofit's Stripe account with participant earmarks)
- **PWA**: next-pwa, installable, offline-tolerant shell
- **Email**: Resend
- **AI layer**: Claude API (`claude-sonnet-4-6` default; `claude-fable-5` only for the content-moderation escalation reviewer and outcome-narrative generation)

## Repository Layout

```
/app                  Next.js App Router
  /(participant)      mobile-first participant + mentor routes
  /(dashboard)        center dashboard routes
  /(public)           QR landing pages, donate, marketing
  /api                route handlers (Stripe webhooks, cron)
/components
/lib                  supabase clients, stripe, utils
/supabase
  /migrations         SQL migrations (never edit applied migrations)
  /functions          edge functions
/docs                 THE SPEC — read the relevant doc before building any module
```

## Rules for Every Session

1. **Read the spec first.** Before touching a module, read its doc in `/docs`. The data model in `docs/03-DATA-MODEL.md` is the source of truth for schema.
2. **RLS everywhere.** Every table gets Row Level Security. Participants see their own data; mentors see assigned mentees; center staff see only their org's participants (scoped by `org_id`). Public QR pages read through a security-definer view exposing only approved public fields.
3. **Privacy is a product feature, not a checkbox.** Participants are a vulnerable population. Never expose last names, diagnoses, program enrollment, or location on any public surface. Public QR pages show: chosen display name, participant number, approved photo (opt-in), approved story text, goal progress. Nothing else. See `docs/10-COMPLIANCE.md`.
4. **Money paths are sacred.** All donation writes happen in Stripe webhook handlers with idempotency keys. Never mark a donation received from client-side code. Ledger entries are append-only.
5. **Migrations are append-only.** New migration file per change, named `NNNN_description.sql`.
6. **Mobile-first for participant/mentor surfaces** (design at 390px), desktop-first for the dashboard (design at 1440px).
7. **Brand**: modern blue and clean — see `docs/01-BRAND.md` for tokens.
8. **Log judgment calls** in `DECISIONS.md` at repo root. Never silently deviate from spec.
9. **Do NOT**: create new Supabase projects, use SQLite, add an ORM (use supabase-js + typed queries), introduce Redux (use React state + Supabase Realtime), or build native apps (PWA only in v1).

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## Definition of Done (any feature)

- Types generated from Supabase schema (`supabase gen types`)
- RLS policies written AND tested with at least one negative test
- Mobile viewport verified for participant/mentor surfaces
- Empty states, loading states, and error states implemented
- No PII leaks on public routes (grep the rendered payloads)
