# 02 — Member App (430px shell, 5 tabs)

Spec: handoff README §Surface C + `docs/07-MODULE-LMS-GAMIFICATION.md`, `docs/05-MODULE-SOCIAL.md`.
Audit 2026-07-05: SSR grep of `/member-app` + API calls with danielle cookie jar. Items marked "client-tab" render only after a tap and could not be executed without a browser — left unchecked even where code exists.

## Shell + session

- [x] 430px phone shell: header + 3px hairline + sticky 5-tab bar (Home ⌂ · Learn ▦ · Give ♥ · Chat ✉ · Me ◯), active blue / inactive gray, Lucide icons ✔ verified: /member-app 200, SSR shows shell + tab bar
- [x] Session-aware: fetches /api/auth/me; signed-in members see their own data, signed-out visitors get a styled demo (Danielle) with Sign-in CTAs, never a crash ✔ verified: /api/auth/me returns user with balances/streak/points; SSR renders demo state
- [ ] Signed-in header shows the member's real center + real date (currently hardcoded "Friday, July 4 · Laveen Center")

## Home

- [x] "Welcome home, {name}" greeting + streak chip (gold "◆ N-day streak", or "Start your streak today" at 0) ✔ verified: SSR "Welcome home" + "day streak"; /api/auth/me streak=12
- [x] My Tracker ring = completed tasks (+ lesson) as conic-gradient % ✔ verified: SSR "My Tracker" ring markup
- [ ] My Center ring driven by real center/program data (hardcoded 45%)
- [ ] One-tap task checklist persists (tasks are local useState — reset on reload; no journey_tasks model/API)
- [ ] Streak actually increments from qualifying daily activity (display-only; no streak engine, no nightly recalc, no freeze token)
- [x] Community feed on Home via shared CommunityFeed: approved posts newest-first ✔ verified: GET /api/posts → 50 approved posts, newest-first true
- [x] Heart reaction toggles + count via API ✔ verified: POST /api/posts/{id}/react → {hearts:1,hearted:true} then {hearts:0}
- [x] Comments post + render with author chip ✔ verified: POST /api/posts/{id}/comments → comment persisted
- [x] Signed-in composer creates posts (regular/milestone/win kinds) ✔ verified: POST /api/posts kind=win → post in feed
- [ ] Milestone posts styled gold (border/chip) in the running feed — code-read only; needs browser check
- [ ] Feed audience selector (community / org / mentors_only per docs/05) — not built
- [ ] "New posts ↑" pill on realtime arrival (currently 10s polling with silent re-render)

## Learn (client-tab)

- [ ] MY COURSES ring cards: ISE Course 3 (PON 45%, "Due Sunday"), Forklift Cert (VOC 20%), Documents & ID Recovery (NAV complete) — renders from hardcoded consts; no course/enrollment data model or API
- [ ] Video library: category filter chips (All/published case-study/Motivational/Steps) + 2-col video cards with duration badges — hardcoded, filters are client-only
- [ ] Real course backend: Course→Module→Lesson content model, sequence locking, program categories powering dashboard KPIs (docs/07) — not built
- [ ] Videos actually playable + watching counts toward streak — placeholder tiles only

## Lesson player + celebration (client-tab)

- [ ] Lesson player opens from ISE course card: navy header "Lesson 2 of 6", video area, journal card, quiz card — implemented client-side, hardcoded content
- [ ] JOURNAL · PRIVATE: draft actually saved (UI says "✓ Draft saved" but textarea persists nowhere — no localStorage/IndexedDB/API)
- [ ] Quiz graded (selection is stored but never validated; completion allowed with no answer)
- [ ] "Complete lesson · +10 points" writes points/streak/course % to the store (client-only: 640→650 and 45→60% are local state, lost on reload; no points_events)
- [ ] Celebration overlay: navy scrim, confetti, gold badge, "+10 points · streak kept", "Share your win? Post / Keep private", "5 minutes to decide" copy — implemented client-side; not executed
- [x] "Post" after celebration publishes a real feed post ✔ verified: shareWin() → POST /api/posts (endpoint verified live; wiring code-read)
- [ ] 5-minute grace is a real timer with auto-dismiss + auditable choice (copy only today)
- [ ] Completing lesson unlocks Course Champ badge persistently (local state only)

## Give

- [x] Signed-in: real QR card (img /api/qr/{slug}), /p/{slug} link, live balances Cash/Store Credits/Reentry Savings from session ✔ verified: /api/qr/danielle → SVG 200; /api/auth/me balances {cash:64,credits:58,savings:240}
- [x] "Ask for support" form creates a request that appears on the public page ✔ verified: POST /api/requests {label,weeklyTarget} → active request; GET /api/members/{slug} lists it
- [x] Requests list shows progress bars + ✓ Funded chip from live data ✔ verified: donation → raised/status change reflected in /api/auth/me requests
- [x] Give tab has loading skeleton + signed-out demo state ✔ verified: code + SSR skeleton markup
- [ ] Share / Print card buttons functional (no-op stubs)
- [ ] "Save more" → move balance into locked reentry savings (no ledger/transfer API; docs/04 reserve_reentry)
- [ ] Recent activity list from real ledger entries (signed-out demo list is hardcoded; signed-in shows none)
- [ ] Balances backed by append-only ledger_entries instead of mutable numbers (docs/04)

## Chat

- [x] Mentor thread: member auto-gets thread with their mentor; list shows avatar, preview, time ✔ verified: GET /api/threads as danielle → [Marcus/mentor]; new signup also auto-threads to a mentor
- [x] Real messaging with 4s polling (?after=ts) ✔ verified: POST text 200; GET ?after returns only new messages
- [x] Mood check-in 1–5 posts kind=mood, "shared with mentor + care team only" ✔ verified: POST {kind:"mood",mood:4} → stored
- [ ] The Guide: intro + 3 quick chips → tailored answer → "Yes, add it to my tracker" adds Home task — canned client-side script; task not persisted; bottom "Message The Guide…" composer is a fake bar
- [ ] Cheer messages render as gold cards in member thread — code-read only; POST kind=cheer verified at API level
- [ ] Unread badges real (demo "1" is hardcoded)

## Me (client-tab)

- [ ] Navy profile header: avatar, member # chip, level/points chip with progress-to-next-level bar — renders from session data per code read; not executed
- [ ] Badge grid from real earned badges (First Week/GED/30-Day hardcoded gold; only Course Champ reacts, locally)
- [ ] Journey timeline from real journey_stage (5 hardcoded steps, "Transitional — you are here")
- [x] My story + support requests + QR share card from session data ✔ verified: /api/auth/me returns story + requests; /api/qr/{slug} serves SVG
- [ ] Levels computed from points thresholds Bronze 0 / Silver 250 / Gold 1000 / Platinum 2500 (docs/07) — level is a stored string, no engine

## States

- [x] Feed loading skeletons / empty ("It's quiet in here") / error states exist ✔ verified: code + SSR skeleton markup
- [ ] Home loading = skeleton blocks; Home empty = 0% ring "Your journey starts today" + "Say hi" CTA (designed states not implemented)
- [ ] Learn offline error state ("your journal drafts are safe on this phone" + Try again) — not implemented
