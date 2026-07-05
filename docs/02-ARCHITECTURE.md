# 02 — Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 App Router + TypeScript + Tailwind | One codebase, three surfaces via route groups; Vercel deploy |
| Mobile | PWA (next-pwa), installable | v1 ships weeks faster than native; participants often use low-end Android |
| Data/Auth | Supabase (Postgres + Auth + Storage + Realtime) | RLS-based multi-tenancy, realtime feed/chat for free |
| Payments | Stripe Checkout + webhooks | Donations to the nonprofit's account with participant earmarks |
| Email | Resend | Receipts, digests, mentor notifications |
| AI | Claude API | Moderation escalation review, donor update drafting, outcome narratives |

## Route Groups (one Next.js app)

```
/(public)      →  /, /donate, /p/[qr_slug]        no auth, ISR, fast
/(participant) →  /home /learn /give /chat /me    auth: participant or mentor role, mobile-first
/(dashboard)   →  /org/[...]                       auth: center_staff/center_admin/ms_admin, desktop
/api           →  /api/stripe/webhook, /api/cron/* server only
```

Role-based middleware redirects: participants and mentors land in the PWA shell; staff land in the dashboard; a user with both roles gets a switcher.

## Tenancy & Roles

Multi-tenant by `org_id`. My Struggle itself is org 1 (type `nonprofit`); recovery centers are orgs (type `center`). Participants belong to one **primary org** but carry a **journey** that can span orgs (enrollments table), which is how post-discharge tracking works.

Roles (on `memberships`): `participant`, `mentor`, `center_staff`, `center_admin`, `ms_admin` (My Struggle superadmin). A mentor may be independent (org 1) or attached to a center.

## Security Model

- RLS on every table; policies keyed to `auth.uid()` → `memberships`.
- Public QR pages read from `public_participant_profiles` — a security-definer view returning ONLY: display_name, participant_number, avatar_url (if consented), public_story (approved), active public goals + funded amounts. RLS denies all direct table access to `anon`.
- Donation ledger writes: service-role only, from the Stripe webhook handler, idempotent on `stripe_event_id`.
- Storage buckets: `avatars` (public-read only for consented files via signed policy), `course-media` (authenticated), `feed-media` (authenticated, org-scoped).

## Realtime

Supabase Realtime channels: `feed:{org_id}` (new posts), `dm:{thread_id}` (mentor chat), `goal:{participant_id}` (live donation progress on QR page — nice-to-have, poll fallback).

## Background Jobs (Vercel cron)

- Nightly: streak calculation, at-risk engagement flags (no login 7/14 days), digest emails
- Weekly: center engagement report email, donor impact digest
- On-demand edge functions: QR slug generation, receipt PDF

## AI Touchpoints (deliberately narrow in v1)

1. **The Guide** (participant-facing, REPrieve lineage): a friendly in-app assistant on the PWA that helps members navigate their way back to society — "I'm looking for a halfway house," "I need my driver's license back," "Can you help me find a job?" It answers from a curated My Struggle resource base (RAG over staff-maintained resource docs in Supabase) + safe general guidance, creates `journey_tasks` on request ("Add 'gather documents for MVD' to my tracker"), and escalates anything clinical, crisis-related, or legal to staff — it is a navigator, never a counselor. Crisis language triggers the same staff-alert path as the feed. `claude-sonnet-4-6`, tightly scoped system prompt, conversation logs visible to assigned staff.
2. **Moderation escalation**: keyword/classifier first pass on feed posts + comments; ambiguous items go to Claude for review with a strict rubric; human queue for anything flagged (crisis language routes to staff alert immediately, never auto-handled).
3. **Donor updates**: draft a consented impact update from milestone data for staff to approve.
4. **Outcome narratives**: dashboard "story of this quarter" summaries for grant writing.
