# 02 — MEMBER APP REQUIREMENTS (PWA, 390px design width, bottom tabs: Home · Learn · Give · Chat · Me)

## Shell
- [ ] Bottom tab bar, 44px+ targets, active state in blue; safe-area insets
- [ ] "Welcome home, [name]" header pattern with streak flame + points chip
- [ ] Pull-to-refresh on Home and Learn; skeleton loaders everywhere; every screen has empty + error states

## Home
- [ ] My Tracker ring (self + care-team journey tasks) with count (e.g., 9 of 10)
- [ ] My Center ring (program tasks) with count
- [ ] Task list: one-tap check-off with satisfying micro-animation; add-task sheet (title, due date)
- [ ] Today's plan section (due tasks + assigned lessons)
- [ ] Community feed below: post cards (author, time, body, media, heart count, comments)
- [ ] Composer: text + photo, audience selector (community/org/mentors-only), posts enter moderation as pending with "under review" state for media
- [ ] Milestone/system posts styled with celebration treatment; sobriety-anniversary posts get gold-accent respectful styling
- [ ] Heart reaction (optimistic), one-level threaded comments, report + block actions on every post
- [ ] "New posts ↑" realtime pill (no jarring reflow)
- [ ] 5-minute grace toast on auto-generated win posts: "Share your win? ✓ Post / ✗ Keep private"

## Learn
- [ ] Assigned courses list sorted by due date; course cards: cover, program chip (PON/VOC/IOP/NAV), ring progress, locked/unlocked state
- [ ] Lesson player (full-screen): video block, rich text, journal block (autosaves offline via IndexedDB, syncs on reconnect), quiz block with pass %, discussion block linking to feed thread
- [ ] Sequence lock: next lesson gated until completion rules met
- [ ] Course completion celebration (confetti, points, badge if earned)
- [ ] Video library: category chips (published case-study · Motivational · Steps), watch view, counts toward streak

## Give
- [ ] My QR code card (shareable image + link); printable card request
- [ ] Three balances as big friendly numbers: Cash · Store Credits · Reentry Savings
- [ ] "Save for my future" transfer flow (amount → confirm → locked bucket)
- [ ] Activity list: donations in (donor first name or "Someone"), redemptions, transfers
- [ ] Goal list with progress; request-new-goal form → staff approval state
- [ ] Thank-you note prompt when supporter count grows (staff-approved before send)

## Chat
- [ ] Mentor thread: realtime messages, read receipts, mood check-in prompt (1–5 emoji)
- [ ] The Guide: chat UI with quick-start chips ("halfway house" / "driver's license" / "find a job"), answers from resource base, can create a journey task with confirmation chip, staff-visible transcripts
- [ ] Guide safety: crisis language → resource message + staff alert; never gives clinical/legal counseling (test prompts verify)
- [ ] No DM capability outside mentorship thread anywhere in UI

## Me
- [ ] Profile: display name, avatar (consent toggle), bio
- [ ] Badges grid (earned bright, unearned ghosted) with earn-criteria sheets
- [ ] Level + points history; streak stats (current/best) + freeze token indicator
- [ ] Journey timeline: stage changes, milestones, courses completed
- [ ] Consent panel (public profile/photo/story toggles) + data export + notification prefs
