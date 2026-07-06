# My Struggle Platform

Nonprofit platform (EST. 2021, Laveen AZ): peer mentorship, outreach centers,
QR Code Giving, learning programs. One brand across four surfaces: marketing
website, member app, mentor app, center dashboard, plus public giving pages.

## Autonomous operation

`AUTOPILOT.md` governs every session — read it first, follow the loop.
- `/docs` — design + architecture truth (from the design handoff)
- `/requirements` — acceptance checklists; completion truth
- `GAP-REPORT.md` — single source of truth for status, rewritten every run
- `DECISIONS.md` — judgment-call log

## Stack

Next.js 15 (App Router) + React 19 + Tailwind v4 + TypeScript. `lucide-react`
icons, `qrcode` for QR SVGs. No database yet: `app/lib/store.ts` is an
in-memory store with JSON file persistence (`.data/db.json` locally, `/tmp` on
Vercel — resets per cold start). Target architecture per `docs/02-ARCHITECTURE.md`
is Supabase + Stripe; the store is the swap-out seam (route handlers under
`app/api/` are the stable contract).

## Commands

- `npm run dev` — dev server on :3000 (often already running; check first:
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`)
- `npm run build` — production build; must pass before pushing
- `npx tsc --noEmit` — typecheck (run from repo root)

## Layout

- `app/page.tsx`, `app/{about,donate,mentor}/` — marketing site (Nav/Footer in
  `app/components/`)
- `app/give/` (redirects) → `app/p/[slug]/` — public QR giving pages
- `app/{signup,login,account}/` — auth UI
- `app/member-app/`, `app/mentor-app/` — 430px phone-shell apps
- `app/dashboard/` — center dashboard (navy sidebar)
- `app/api/` — route handlers; `app/lib/` — types, store, auth
- `app/components/feed/CommunityFeed.tsx`, `app/components/chat/ChatThread.tsx`
  — shared social/chat components

## Conventions

- Design tokens live in `app/globals.css` `@theme` (indigo `#4E5B9B`, blue
  `#2E7CD6`, navy `#0B2545`, sky-tint, canvas, ink scale, success, gold
  app-only, heart-red, amber). Site is 90% white/canvas, 8% blue, 2% rest.
- Montserrat everywhere; ONE Allura script accent word per headline via
  `.script`. Never serif italics; never gold on the website (gold = app
  gamification only). Amber for concern, never red on a person.
- Cards rounded-2xl, pill buttons ≥44px touch targets, 3px `.hairline`
  gradient under headers, mobile-first responsive (`py-16 lg:py-[110px]`
  pattern).
- Voice: "member / mentor / journey", never "client / case". Warm, dignified.
- Demo logins (password `mystruggle`): danielle@themystruggles.com (member),
  marcus@themystruggles.com (mentor).
- Session auth: HMAC cookie (`app/lib/auth.ts`); staff/mentor/employer APIs
  are role-gated via getRoleUser (verified by audit). Remaining auth gaps:
  demo PIN/secret constants (redeem desk) and the Supabase Auth cutover.

## Git

Work on `main`, push after each verified green batch (`npx tsc --noEmit` +
route sweep + `npm run build` for risky changes). The user's GitHub uploads
land on `main` — always `git pull --rebase origin main` before pushing.
