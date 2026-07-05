# 03 — Mentor App (430px shell, 4 tabs)

Spec: handoff README §Surface C2 + `docs/06-MODULE-MENTORSHIP.md`.
Audit 2026-07-05: SSR grep of `/mentor-app` + API calls with marcus cookie jar.

## Shell + roster

- [x] Same 430px shell, 4-tab bar (Mentees ◎ · Chat ✉ · Community ⌂ · Me ◯) ✔ verified: /mentor-app 200, SSR shows shell + tabs
- [x] Roster header "Good morning, Marcus · 3 mentees · Laveen Center" ✔ verified: SSR
- [x] Amber nudge banner "Tyrell hasn't checked in for 6 days…" → opens the Tyrell thread ✔ verified: SSR banner present; openTyrell wires to real thread when signed in (code-read)
- [x] Mentee cards with health chips: Danielle (gold streak, Course 45%, Mood 4/5 green), Tyrell (amber border, streak paused, Mood 2/5 · Mon), Andre (NEW, Day 1) ✔ verified: SSR renders all three cards
- [ ] Roster driven by real mentee data (cards are hardcoded JSX; /api/admin/members has real streaks/points but the roster doesn't fetch it; no mentorships model)
- [ ] All mentee cards open a detail view (only Danielle opens detail; Tyrell opens thread; Andre card is inert)
- [ ] Health chips computed from real signals (course %, last mood, last active — no data source)
- [ ] Mentor inactivity nudge from real "no contact in 14d" rule (banner is hardcoded)

## Mentee detail (client view)

- [ ] Journey snapshot (course %, streak, mood trend, goal bar) from real data — hardcoded 45%/12d/4-5
- [ ] RECENT activity feed real; journal rows show privacy note ONLY, never content (privacy note implemented, list hardcoded)
- [ ] SESSIONS summary from persisted session logs (local state only)
- [ ] "I'm concerned about Danielle" quiet gray link triggers a real escalation to staff (currently a `<span>` with no onClick; docs/06 requires staff alert ≤1 min)

## Session log sheet (client view)

- [ ] Bottom sheet: drag handle, scrim-tap cancel, mode pills In person/Phone/Video, duration 15/30/45/1hr+ — implemented client-side; not executed in browser
- [ ] Optional staff-visible note is editable (currently a static styled div with hardcoded text)
- [ ] "Save session · +15 points" persists a mentorship_session and awards +15 points to the mentee (save only flips local state; no API, no points)
- [ ] Sessions card + dashboard reflect the logged session (local echo only)

## Cheer + check-in

- [x] Send-a-cheer delivers a kind=cheer message into the mentee's thread ✔ verified: POST /api/threads/{id}/messages {kind:"cheer"} → 200 stored; app wiring code-read (fires when signed in + thread found)
- [ ] Cheer confirmation banner never lies: signed-out / no-thread still shows "Cheer sent" without sending (should gate on success)
- [ ] Cheer renders as gold card on the member side — code-read only
- [x] Check-in request: mentor thread view exposes "Request a check-in" that posts into the thread ✔ verified: POST text message as marcus → 200; ChatThread showCheckInRequest wiring code-read
- [ ] Mood check-in card in the REAL thread flow (1–5 circles exist only in the static demo thread; demo composer is fake)
- [ ] Two consecutive mood-1 check-ins flag staff visibility (docs/06) — not built

## Chat + Community + Me

- [x] Real thread list for signed-in mentor: GET /api/threads with other-participant identity + last message ✔ verified: marcus sees 2 threads [Danielle, Tyrell]
- [x] Real thread view uses shared ChatThread (polling, optimistic send) ✔ verified: messages GET/POST + ?after polling live
- [x] Thread privacy: non-participants get 404 ✔ verified: third member's cookie → 404 on marcus/danielle thread
- [ ] Community tab renders the live shared feed — client-tab, code-read only (CommunityFeed API verified elsewhere)
- [ ] Me tab exists (tab is dead: onClick undefined, never active)
- [ ] Signed-out demo → /login CTA banner visible — code-read only
- [ ] Mentor capacity (default 3) / match workflow / training gate (docs/06) — no mentorship data model
- [ ] Mentor sees ONLY their own mentees (needs mentorships + RLS negative test; today roster is hardcoded and admin API is open)
