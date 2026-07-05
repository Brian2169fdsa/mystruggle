# My Struggle design system

_Started 2026-07-05 00:32 UTC_

---

## User

# PROMPT FOR CLAUDE DESIGN — paste everything below the line, attach MY-STRUGGLE-DESIGN-GUIDE.md

---

You are the lead product designer for **My Struggle**, a nonprofit platform helping people overcome homelessness, addiction, and incarceration through peer mentorship, QR Code Giving, learning programs, and community. The attached **MY-STRUGGLE-DESIGN-GUIDE.md** is the binding design system — colors, typography, components, voice, content, and the differentiation contract in its §5 are non-negotiable. Read it fully before designing anything.

**Task**: Design the complete My Struggle experience across four surfaces, with mobile views for everything. This is one brand, one system: the website, the member app, the mentor app, and the center dashboard must feel like a single organization.

## Surface A — Marketing Website (design desktop 1440px AND mobile 390px for every page)
1. **Home** — hero ("End the Struggle, Build the *Future* Together", script accent word per guide §3), "what is *My* Struggle" mission, Danielle story spotlight with progress bar, 01/02/03 give cards, EST. 2021 manifesto, Position of Neutrality program section with video, impact stat row, FAQ, footer
2. **About** — "Turning Struggles Into *Strengths*, Together", Our Journey, True Impact stats, Cost of Inaction with a clean blue donut chart, navy pull-quote band
3. **Donate Today** — "Every Contribution *Counts*", 4 ways to help, 12-item icon grid of what donations cover, 4 monthly tier cards ($25/$39/$59/$200, "Best choice" on Elite), Danielle direct-support card
4. **Become a Mentor** — hero, application form, why-mentor trio
5. **Public QR Giving Page** (`/p/danielle`) — MOBILE-FIRST (donors scan on phones): member photo/avatar, display name + member #, approved story, the **50/50 "Where your gift goes" split explainer** (50% cash at centers / 50% Store credits — make this graphic beautiful and prominent, it's the trust-builder), goal progress bars, amount picker ($10/$25/$50/custom + weekly recurring toggle), single dominant Donate button
6. Mega-menu dropdown state on desktop nav (guide §4) + mobile nav drawer

## Surface B — Member Mobile App (390px, bottom tab bar: Home · Learn · Give · Chat · Me)
1. **Home** — warm "Welcome home, [name]" header, **My Tracker / My Center dual progress rings** over journey tasks with one-tap check-off, streak flame, community feed below (posts with heart reactions, milestone posts with celebration styling)
2. **Learn** — assigned courses with ring progress + program chips (PON/VOC/IOP/NAV), video library with category chips (New Freedom · Motivational · Steps), full-screen lesson player (video + journal prompt + quiz states)
3. **Give** — my QR code card, three balances as big friendly numbers (Cash · Store Credits · Reentry Savings), "Save for my future" action, recent activity
4. **Chat** — mentor message thread + **The Guide** AI assistant with quick-start chips ("I'm looking for a halfway house" / "I need my driver's license back" / "Help me find a job")
5. **Me** — profile, badges earned (gold-badge accents), level, journey timeline
6. **Celebration overlay** — course/badge completion moment, blue + gold confetti, "Share your win? ✓ Post / ✗ Keep private"

## Surface C — Mentor Mobile App (same shell, mentor role, 390px)
1. **Mentee roster** — cards with health-at-a-glance (streak, course %, last active, last mood check-in)
2. **Mentee detail** — journey snapshot, one-tap session logging sheet (mode/duration/note), "Send a badge cheer", discreet "I'm concerned" escalation button
3. **Thread view** with mood check-in prompt

## Surface D — Center Dashboard (desktop 1440px + one tablet 768px view of Overview)
1. **Overview** — navy sidebar per guide §7, top row of four program KPI cards (PON · VOC · IOP · NAV, giant blue tabular numbers, date-range edit), second KPI row, engagement trend with 65% goal line, journey-stage funnel, "Needs attention" queue, milestones ticker
2. **Participants roster** — filterable table with journey-stage chips and risk flags, plus participant detail page with journey timeline, courses, mentorship, balances, consent panel
3. **Giving desk** — cash redemption flow (member ID card scan → amount → confirm), split utilization analytics
4. **Moderation queue** — post cards with AI recommendation context, approve/flag/remove actions
5. **Reports** — outcomes view with 3/6/12-month retention cohorts and export

## Constraints
- Use the guide's exact tokens: indigo `#4E5B9B` script accents, blue `#2E7CD6` actions, navy `#0B2545`, Montserrat throughout, `rounded-2xl` cards, fully rounded pill buttons, 3px blue gradient header hairline
- Honor the differentiation contract (§5): NO serif headlines, NO gold accents on the website (gold is badges-only in the app), cool navy overlays
- Use the REAL content from guide §6 — Danielle #039521464, the actual stats, the actual tier prices. No lorem ipsum anywhere.
- Voice rules §8: "member/mentor/journey," never "client/case." Warm, dignified, hopeful.
- Design empty, loading, and error states for the app Home, Learn, and dashboard Overview
- Touch targets ≥44px on all mobile views; WCAG AA contrast on all text
- Photography direction: real human warmth, warm daylight, navy overlays — never despair imagery

## Build order & output
Start with the design system foundation (tokens, type scale, buttons, cards, nav), then Surface A pages 1 and 5, then Surface B, then C, then D. Deliver each surface as complete screens at the specified widths. After each surface, list any judgment calls you made that deviate from the guide so I can approve or correct before you continue. do not mention manage ai anywhere on the design

## Assistant

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_skill_prompt]_

_[tool: update_todos]_

Building the foundation + Home + QR giving page now.

_[tool: dc_write]_

_[tool: ready_for_verification]_

Foundation + first Surface A screens are up: **1a** design system foundation, **1b** Home desktop 1440, **1c** Programs mega-menu, **1d** Home mobile 390, **1e** nav drawer, **1f** the `/p/danielle` QR giving page with the 50/50 split explainer.

**Judgment calls to approve/correct:**
1. **Mission copy** — the verbatim 4-paragraph text from the live site wasn't in the attachments, so I wrote 4 paragraphs in brand voice. Paste the real copy if you want it verbatim.
2. **Brian Reinhart quote & FAQ answers** — drafted plausibly; flag if you have the real strings.
3. **Script font** — Mistrully isn't web-available, so Allura (the guide's stated fallback) renders all script accents.
4. **Photos** — striped placeholders with monospace direction notes; navy overlays are in place so the compositions read correctly.
5. **QR page** — added a second "Reentry savings" bar and used $105/$175 (60%) for the weekly goal; donate button reflects the selected $25 + weekly toggle state.
6. **PON video** — shown as a static player frame (thumbnail + play) rather than a live YouTube embed.

Say the word and I'll continue with About / Donate Today / Become a Mentor, then Surface B.

## User

Ok run that lets keep building

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Surface A is complete — turn 2 is now at the top: **2a/2b** About (with the clean blue donut for Cost of Inaction), **2c/2d** Donate Today (4 ways, 12-item grid, tier cards with Elite "Best choice", Danielle direct-support band, Amazon + Ashley J), **2e/2f** Become a Mentor (why-trio, application form, training expectations).

**Judgment calls:**
1. **Donut** — pure CSS conic-gradient in 4 blues, $10T center label; "Other" rendered in a pale blue to keep the 90/8/2 color rule.
2. **12-item grid** — used small indigo/blue diamond markers instead of illustrative icons (guide has no icon set; placeholders beat bad icons). Happy to swap in a real icon library if you have one.
3. **Interior footers abbreviated** — full 4-col footer from Home applies to all pages; kept the frames shorter.
4. **Tier descriptions & testimonial copy** drafted; swap in real strings if you have them.
5. **Danielle direct-support card** on Donate uses a navy full-bleed treatment to stand apart from the white tier cards.

Say go and I'll build Surface B — the member app (Home, Learn, Give, Chat, Me, celebration overlay + empty/loading/error states).

## User

go

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Surface B is up in turn 3: **3a** Home (dual rings, one-tap tasks, streak, feed with gold-accented milestone post), **3b** Learn (course rings + PON/VOC/IOP/NAV chips, video library), **3c** lesson player (video + private journal + quiz), **3d** Give (QR card, three balances, reentry savings), **3e** Chat (Marcus thread pinned + The Guide with the three quick-start chips), **3f** Me (gold badges, Silver level, journey timeline), **3g** celebration overlay with blue+gold confetti and the "✓ Post / ✗ Keep private" grace prompt, **3h** loading/empty/error states.

**Judgment calls:**
1. **Streak flame** — rendered as a gold ◆ chip, not a flame emoji/icon (no emoji per guide; gold is legal in-app for gamification).
2. **Tab icons** — minimal glyph placeholders (⌂ ▦ ♥ ✉ ◯); swap in a real icon set (e.g. Lucide) when you pick one.
3. **QR code** — pattern placeholder; production generates a real code per member.
4. **The Guide avatar** — the script "M" from the wordmark on an indigo→blue gradient tile, tying the AI to the brand.
5. **Level detail** from the platform docs: Silver at 640 pts with progress to Gold at 1,000; hearts are count-light per the social spec.

Ready for Surface C (mentor app) on your go.

## User

go

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Surface C is up in turn 4: **4a** roster with health-at-a-glance chips (streak / course % / last active / mood) and an amber nudge banner for Tyrell, **4b** Danielle detail with journey snapshot, Log a session + gold "Send a cheer" actions, and the discreet "I'm concerned" text link, **4c** one-tap session-log bottom sheet (mode / duration / note), **4d** thread with the 1–5 mood check-in card.

**Judgment calls:**
1. **Mentor tab bar** — same shell but role-adjusted: Mentees · Chat · Community · Me (mentors don't need Learn/Give tabs). Say the word to keep the identical 5 tabs instead.
2. **Risk signaling** — soft amber card borders + a nudge banner, never red flags on a person; "I'm concerned" is a quiet underlined text link, not a button, to avoid drama.
3. **Mood scale** — numbered 1–5 circles with word anchors instead of face emoji.
4. One emoji appears in Danielle's chat bubble as user-typed content — easy to remove if you want zero emoji anywhere.

Ready for Surface D (center dashboard) on your go.

## User

go

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

All four surfaces are done. Turn 5 has the dashboard: **5a** Overview (PON/VOC/IOP/NAV KPI cards, second KPI row, engagement trend with the dashed 65% goal line, journey-stage funnel, Needs attention, milestones), **5b** filterable roster with stage chips + risk flags, **5c** participant detail with journey timeline, balances, and the consent panel, **5d** Giving desk (3-step card-scan redemption with the $100/day cap + split-utilization and scan→gift funnel analytics), **5e** moderation queue with AI-review context (crisis post held at top), **5f** reports with 3/6/12-month retention vs the 65/65/80 benchmarks + export, **5g** tablet 768 Overview with an icon rail, **5h** loading/empty/error states.

**Judgment calls:**
1. **Risk language** — "watch" / "follow up" chips instead of "high risk"; crisis posts get red only in moderation, never on a member's roster row.
2. **Second KPI row** — chose engagement %, cash redeemed, reentry savings held, avg streak; swap if you track different top-line numbers.
3. **Retention numbers** are illustrative; green/red only relative to the 65/65/80 benchmarks.
4. **Tablet** collapses the sidebar to a 64px icon rail with the script-M mark.
5. Sidebar/tab icons remain glyph placeholders pending a real icon set.

Everything lives in one canvas — turns 1–5, newest at top. Natural next steps: real photography/icon set drop-in, an interactive prototype of any single flow (e.g. the QR giving page or the app Home), or PPTX/PDF export for stakeholders.

## User

lets start mocking these up lets start with the full website with everything on it including pages for the functions of the platform for the mobile enegagemetn and the centers being able to engage with people just everything you just mock up here then we will keep giongt

## Assistant

Now we shift from static frames to a clickable mockup: a `prototype/` folder with the full website (Home, About, Donate, Mentor, Danielle's giving page) all cross-linked, plus interactive Member app, Mentor app, and Center dashboard. Building page by page.

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: copy_files]_

_[tool: dc_html_str_replace]_

Now rewriting the interrupted Donate page in full:

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: snip]_

_[tool: copy_files]_

_[tool: copy_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: sleep]_

_[tool: copy_files]_

_[tool: run_script]_

_[tool: sleep]_

_[tool: copy_files]_

_[tool: image_metadata]_

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

Now the last piece — the interactive center dashboard:

_[tool: dc_write]_

_[tool: copy_files]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

The full clickable prototype is live in `prototype/` — you're on Home now. Navigate with the real nav links or the navy **PROTOTYPE** pill (bottom-right) on every page:

- **Site**: Home (your center photo as the hero with the navy overlay + blue-tinted glowing wordmark top-right), About, Donate, Become a Mentor (your coffee-conversation photo as its hero) — all cross-linked, working FAQ accordions, live YouTube embed for PON.
- **Giving** (`/p/danielle`): working amount picker, custom amount, weekly toggle, and a donate → thank-you flow.
- **Member app**: real tab bar (Home/Learn/Give/Chat/Me), tasks check off and move the My Tracker ring, hearts react, lesson player → completing it fires the blue+gold celebration with Post/Keep-private, The Guide answers the quick chips and can add a task to your tracker (check Home after).
- **Mentor app**: roster → Danielle detail → session-log bottom sheet (saves + updates the session card), send-a-cheer, Tyrell thread with tappable mood check-in.
- **Center dashboard**: sidebar switches all sections; roster row → Danielle detail with working consent toggles; Giving desk runs the full amount → PIN → confirmed redemption (and her cash balance updates); moderation approve/flag/remove actually resolves posts and the sidebar badge counts down.

Caveats: mentor form inputs accept typing but don't validate; remaining photo slots are still striped placeholders — send more images like the last two and I'll drop them in. What next — more real photos, mobile-drawer nav on the site pages, or deeper flows (e.g. lesson library, participant detail tabs)?

## User

Ok site it looking good now on the programs you should add subtags adding the mena menu and the subtabs are for the revote centers to see thier dashboards and also need to add the social media feeds

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now the social wall on Home, before the FAQ:

_[tool: dc_html_str_replace]_

Now the same mega-menu on the other three pages:

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Done — two additions across the site:

1. **Programs mega-menu** (hover it in the nav, on all four pages): featured Position of Neutrality photo card with italic caption on the left, three program items on the right (PON · Peer Mentorship · QR Code Giving), and a **FOR CENTERS** row at the bottom linking straight to the Center dashboard, Member app, and Mentor app — so center staff can reach their dashboards from the public site.
2. **Social wall** on Home (between the stats and FAQ): four feed cards — IG, FB, TikTok, YouTube — with @themystruggle handles, captions in brand voice, and follow buttons for all five platforms. Media areas are placeholders ready for real post screenshots.

Want the "Donate today" nav item to get its own mega-menu too (guide calls for one on both), or move on to more real photos / deeper flows?

## User

Ok what else do you have left to do

## Assistant

_[tool: snip]_

Here's where things stand.

**Done:**
- Design-system canvas (`My Struggle — Surface A.dc.html`): foundation + all four surfaces, mobile + desktop frames, states.
- Clickable prototype (`prototype/`): Home, About, Donate, Become a Mentor, `/p/danielle` giving page, Member app, Mentor app, Center dashboard — all interactive and cross-linked, with the Programs mega-menu (incl. FOR CENTERS links) and the social wall.

**Still open, in rough priority:**
1. **"Donate today" mega-menu** — the guide specifies dropdowns on both Programs *and* Donate; only Programs has one so far.
2. **Mobile nav drawer on the live site** — the hamburger on small screens is decorative; the drawer design exists in the canvas but isn't wired into the prototype.
3. **Real photography** — ~10 striped placeholders remain (Danielle portrait ×3, mission/About/Donate heroes, story grid, social wall posts). Send images like the last two and I'll drop them in.
4. **Real icon set** — tab bar, sidebar, and the 12-item donations grid use glyph placeholders; picking a set (e.g. Lucide) would tighten everything.
5. **Real copy passes** — mission 4-paragraphs, Brian's quote, FAQ answers, tier descriptions are my drafts pending your verbatim text; Stripe links are stubs.
6. **Depth if you want it** — participant detail tabs (Courses/Mentorship), Store credit redemption flow, ID-card print template, dashboard Courses builder; member app "Save for my future" transfer sheet.

Which do you want next?

## User

create a full package to send to Claude Codeevery element we have designed and createed

## Assistant

_[tool: read_skill_prompt]_

_[tool: write_file]_

_[tool: copy_files]_

Including the platform module specs so Claude Code has the data model and behavior context too:

_[tool: copy_files]_

_[tool: str_replace_edit]_

_[tool: present_fs_item_for_download]_

The handoff zip is ready above. It contains:

- **README.md** — self-sufficient implementation spec: full token tables, type scale, every screen documented (layout, colors, copy, states), all interaction flows, state maps per surface, assets, and a known-gaps list
- **prototype/** — all 8 interactive design files + both photos (runnable as-is for reference)
- **My Struggle — Surface A.dc.html** — the full design-system canvas (mobile/tablet frames, nav drawer, empty/loading/error states)
- **MY-STRUGGLE-DESIGN-GUIDE.md** — the binding brand guide
- **platform-docs/** — the 14 product/module specs (data model, QR giving ledger, moderation pipeline, gamification, compliance)

Point Claude Code at the folder and tell it to start from README.md. Want screenshots of each screen included in the package as well?

