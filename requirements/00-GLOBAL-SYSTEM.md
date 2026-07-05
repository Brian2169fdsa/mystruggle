# 00 — GLOBAL & SYSTEM REQUIREMENTS

## Foundation
- [ ] Next.js 15 App Router + TS + Tailwind scaffolded; brand tokens from docs/01 in tailwind config
- [ ] Supabase connected; typed client (`supabase gen types` in CI script)
- [ ] Route groups: (public) / (participant) / (dashboard) with role middleware redirects
- [ ] PWA: manifest, icons from wordmark, install prompt, offline shell for app routes
- [ ] Montserrat + script accent font loaded (display swap); type scale per design guide
- [ ] Global components: Button (primary/secondary/destructive, sm/md/lg), Card, Chip, ProgressRing, ProgressBar, StatNumber, EmptyState, Toast, Modal/Sheet, Avatar (consent-aware), Confetti overlay
- [ ] Error boundary + 404 + 500 pages in brand style
- [ ] Vercel deploy green; preview deploys per PR

## Auth & Identity
- [ ] Email magic-link + password auth; onboarding writes profile + membership
- [ ] Role switcher for dual-role users (mentor + staff)
- [ ] Session persistence on PWA; sign-out everywhere
- [ ] Age gate 18+ at member enrollment
- [ ] Consent capture UI: public profile / photo / story, timestamped, revocable from Me tab and dashboard

## Security (every item requires a passing negative test)
- [ ] RLS enabled on 100% of tables (automated check script counts tables vs policies)
- [ ] Cross-org isolation: Center A staff sees zero Center B rows (roster, feed, giving, reports)
- [ ] Mentor sees only assigned mentees
- [ ] anon role cannot select from participants, donations, ledger_entries, messages, lesson_progress
- [ ] Journal entries invisible to other members and non-assigned staff
- [ ] Service-role key server-only (grep client bundles in CI)
- [ ] Stripe webhook signature verification + idempotency on stripe_event_id
- [ ] Audit log rows written for: consent changes, redemptions, role grants, moderation actions, stage changes

## System Settings (dashboard → Settings)
- [ ] Org profile: name, logo, city, contacts
- [ ] Roles & members management: invite staff, grant/revoke roles (audit-logged)
- [ ] Giving settings: split ratio (default 50/50, ms_admin), daily cash cap, goal target cap
- [ ] Feed settings: org announcement pinning, moderation strictness toggle
- [ ] Notification settings per user: email digests on/off, alert channels
- [ ] ms_admin platform settings: course sharing approvals, global split default, org onboarding
- [ ] Member data rights: export my data (JSON), delete account (soft, ledger retained)

## Jobs & Integrations
- [ ] Vercel cron: nightly streaks + risk flags + MV refresh; weekly digests
- [ ] Resend wired: receipts, alerts, digests (all templates in brand style)
- [ ] Anthropic API wired for The Guide + moderation reviewer + narrative reports
- [ ] Crisis alert path: flagged content → org staff email < 60s (test harness proves it)
