# Handoff: My Struggle — Website + Platform (QR Giving, Member App, Mentor App, Center Dashboard)

## Overview
Complete design package for **My Struggle**, a 501(c)(3) nonprofit (EST. 2021, Laveen AZ) helping people overcome homelessness, addiction, and incarceration through peer mentorship, outreach centers, QR Code Giving, and learning programs.

The package covers **four surfaces sharing one design system**:

- **A. Marketing website** — Home, About, Donate Today, Become a Mentor
- **B. Public QR Giving page** — `give.my-struggle.org/p/[qr_slug]` (mobile-first donor page)
- **C. Member & Mentor mobile apps** — PWA, bottom-tab shell
- **D. Center dashboard** — staff desktop app (navy sidebar)

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior. They are **not production code to copy directly**. Your task is to **recreate these designs in the target codebase's environment** (the platform docs suggest React/Next.js + Supabase; use whatever the repo has established) using its patterns and libraries. If no environment exists yet, a sensible default is Next.js + Tailwind + shadcn/ui with the tokens below mapped into the Tailwind theme.

`MY-STRUGGLE-DESIGN-GUIDE.md` (included) is the **binding source of truth** for brand rules. Where this README and the guide conflict, the guide wins.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, copy, and interactions are final intent — recreate pixel-perfectly. Two exceptions:
1. **Photography** — diagonal-striped placeholder blocks with monospace captions (e.g. "photo: Danielle, warm daylight portrait") mark where real photos go. Two real photos are included (`hero.png`, `mentor-hero.png`).
2. **Icons** — tab bars, dashboard sidebar, and small markers use unicode glyph placeholders (⌂ ▦ ♥ ✉ ◯ ◎ ⚑ ◧, ◆ diamonds). Replace with a proper icon set (Lucide recommended), keeping the same sizes/colors.

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| `indigo-brand` | `#4E5B9B` | Wordmark, script accent words, eyebrow-alt, "Best choice" chip, Store-Credits side of the 50/50 split |
| `blue-primary` | `#2E7CD6` | Primary buttons, links, active states, KPI numbers |
| `blue-hover` | `#2668B8` | Primary button hover (blue-primary darkened ~8%) |
| `navy-deep` | `#0B2545` | Hero overlays, dashboard sidebar, footer, dark cards |
| `sky-tint` | `#EAF2FC` | Section alternation, chip bg, selected states, ring tracks, row hover |
| `canvas` | `#F7FAFE` | Page background |
| `white` | `#FFFFFF` | Cards, nav |
| `ink-900` | `#111827` | Headlines, primary text |
| `ink-600` | `#4B5563` | Secondary text |
| `ink-400` | `#9CA3AF` | Tertiary/disabled text |
| `success` | `#12B76A` | Progress, milestones, positive stats, reentry savings |
| `gold-badge` | `#EAB308` | **App-only**: badges, streaks, milestone posts, cheers. Text-on-light pairing: `#A16207` on `#FEF6DC`, border `#F5E6B3`. **Never on the website.** |
| `heart-red` | `#E5484D` | ❤ donate icon (icon-scale only), heart reactions, crisis chips. Tint bg `#FDF0F0` |
| Amber-attention | `#A16207` on `#FFF9EC` | "watch"/nudge states (never red on a person) |
| Blue chart ramp | `#2E7CD6` `#4E7BC4` `#4E5B9B` `#8FBCF0` `#C7DBF4` | Charts are blues-only + success-green goal lines |

Rule: the site is 90% white/canvas, 8% blue family, 2% everything else.

### Typography
Font: **Montserrat** (Google Fonts, weights 400/500/600/700/800). Script accent: **Allura** (stand-in for the brand's Mistrully; one word per headline, always `indigo-brand`, size ≈1.24× the headline size, weight 400).

| Role | Spec |
|---|---|
| Display H1 | Montserrat 800, 56–68px desktop / 34–40px mobile, line-height 1.06–1.12, letter-spacing −0.02em, sentence case |
| H2 | 800, 44–48px, −0.02em |
| Card title | 700, 19–22px |
| Body | 400, 17px/1.7 site · 15px dashboard · 14–15px app |
| Eyebrow | 700, 13px (12px mobile), caps, letter-spacing 0.12em, `blue-primary` |
| KPI numbers | 800, tabular-nums, `blue-primary` (52–56px dashboard/stats, 34px app balances) |
| Chips | 700–800, 10–12px |

**Signature headline device:** bold sans headline + ONE Allura script word in indigo. Used: "…Build the *Future* Together", "what is *My* Struggle", "…way *home*", "Turning Struggles Into *Strengths*…", "…costs America *trillions*", "Every Contribution *Counts*", "…someone's *map*", "Questions, *answered*". Never serif italics, never gold headlines.

### Shape, spacing, elevation
- Cards: white, radius **16px** (`rounded-2xl`), padding 32px (desktop) / 20–24px (app), shadow `0 1px 3px rgba(11,37,69,.06)`; hover = sky-tint wash and/or `0 8px 24px rgba(11,37,69,.12)`
- Buttons: fully rounded pills. Primary: blue-primary bg, white text, height 52px (46px nav, 56–60px key CTAs), padding 0 32px, Montserrat 700 16px, shadow `0 6px 16px rgba(46,124,214,.28)`, hover `#2668B8`. Secondary: 1.5px blue-primary outline, transparent, hover sky-tint fill. Donate buttons carry a small ❤ (white on blue).
- Header hairline: **3px** `linear-gradient(90deg,#4E5B9B,#2E7CD6)` under the sticky nav — repeated in the app header and progress bars.
- Chips: pill, height 26–30px, e.g. member # chip = sky-tint bg + blue text.
- Progress bars: 10–12px tall, sky-tint track, `linear-gradient(90deg,#4E5B9B,#2E7CD6)` fill; success-green for savings.
- Progress rings: CSS `conic-gradient(color 0 N%, #EAF2FC N% 100%)` with white inner circle.
- Section rhythm: 1200px max content width, 100–110px vertical padding, alternating white / canvas / occasional navy full-bleed.
- Numbered 01/02/03 cards: 96px Montserrat 800 numeral at `rgba(78,91,155,.1)` behind the title.
- Photo placeholders: `repeating-linear-gradient(45deg,#EAF2FC 0 12px,#DFEAF9 12px 24px)` + monospace caption chip.
- Touch targets ≥44px on all mobile UI. WCAG AA contrast throughout.

### Voice
Person-first: "member", "mentor", "journey" — never "client/case/the homeless". Warm, dignified, hopeful. Register test: *"How can I help you? Let's talk — tell me about you."*

## Screens / Views

### Surface A — Website (all pages share nav + footer)
**Nav (sticky):** white, 76px, 1200px container. Wordmark left (indigo header logo, height 44px). Center links: About us · Programs ▾ · Donate today · Become a Mentor. Right: "Sign in" (blue text) + Donate ❤ pill (46px). 3px gradient hairline below.
**Programs mega-menu (hover):** 740px white panel, radius 16, shadow `0 18px 50px rgba(11,37,69,.25)`, 3px gradient top border. Left: 280px featured photo card, navy bottom gradient, title + italic caption. Right: 3 stacked items (52px square thumb + bold title + one-line gray desc, sky-tint hover). Bottom strip (canvas bg): "FOR CENTERS" eyebrow + links to Center dashboard / Member app / Mentor app. *(The guide calls for a matching dropdown on "Donate today" — not yet built.)*
**Footer (Home):** navy-deep; 4 columns (wordmark+tagline+social circles / Explore links / Contact: 6614 W Harwell Rd Laveen AZ 85339 · 602-402-7197 · info@themystruggles.com / newsletter email pill + Join). Bottom bar: © + Privacy · Terms · 501(c)(3). Interior pages use an abbreviated navy bar; implement the full footer on all pages.

**Home** (`Home.dc.html`): Hero 86vh — `hero.png` (center-building photo) with navy gradient overlay `linear-gradient(90deg, rgba(11,37,69,.92), rgba(11,37,69,.58) 48%, rgba(11,37,69,.12))`; top-right wordmark tinted blue via CSS filter + soft blue drop-shadow glow; eyebrow "2026 MISSION"; H1 with script "Future"; dual CTA. → Mission two-col ("what is *My* Struggle", 4 paragraphs). → Danielle story spotlight card (photo left; "MEMBER STORY" eyebrow; name + `Member #039521464` chip; story: GED, first job, transitional housing; progress bar "Hallway house · $175/week" at $105/60%; Donate-to-her-journey CTA → giving page). → 01/02/03 give cards (items / time / funds — "$25 provides a week of essential services"). → EST. 2021 navy manifesto band (ghost "EST. 2021" at 4% white; Brian Reinhart quote). → Position of Neutrality (Joe McDonald, 8-course ISE; YouTube embed `ws7TGP2QtSE`; link positionofneutrality.org). → Stat row: 15,000+ mentored · 6,000+ generational change · 200+ reintegrated · 90% success (green). → Social wall: 4 feed cards (IG/FB/TT/YT — platform chip avatar, square media placeholder, caption, @themystruggle) + 5 follow pills. → FAQ: 4 `<details>` accordions (50/50 answer first, open by default; +/− indicator). → Newsletter in footer.

**About** (`About.dc.html`): hero "Turning Struggles Into *Strengths*, Together" → Our Journey ("You wouldn't go to a car mechanic for chest pains.") → True Impact stat row → Cost of Inaction: text + legend left, **donut** right (400px, `conic-gradient(#2E7CD6 0 40%, #4E5B9B 40% 70%, #8FBCF0 70% 90%, #C7DBF4 90% 100%)`, 256px white center with "$10T / projected cost by 2030") → navy pull-quote band ("How can I help you?…") → Stories of Transformation 3-card grid → sky-tint contact band.

**Donate Today** (`Donate.dc.html`): hero "Every Contribution *Counts*" → 500,000 stat split → 4 ways to help cards (one-time / monthly / sponsor a QR code / apartment complexes fund; diamond markers) → 12-item "what donations cover" grid (3-col, canvas rows, diamond bullets): halfway house, job training, childcare, food in treatment, emergency medical, legal, transportation, treatment & insurance, mental health, clothing, reentry programs, education → tier cards $25 Basic / $39 Advanced / $59 **Elite** ("Best choice" indigo chip, blue top border, filled CTA) / $200 Pro — hook up existing Stripe subscription links → navy Danielle direct-support band → Amazon Associates card (amzn.to/4gQuaR8) + Ashley J. testimonial.

**Become a Mentor** (`Mentor.dc.html`): hero "Your struggle is someone's *map*" over `mentor-hero.png` (same overlay treatment) → why-mentor trio (01 lived experience / 02 one member one journey / 03 trained & supported) → application form card: name, phone, email; lived-experience multi-select chips (Addiction & recovery, Homelessness, Incarceration & reentry, Employment, Housing); availability radio pills (Weekly / Every other week / Flexible); optional story textarea; submit → success state ("Thank you — we'll call you.", coordinator calls within a week). Training-expectations list beside the form.

### Surface B — Public QR Giving page (`Give.dc.html`)
Mobile-first, max-width 430 centered. Minimal header (wordmark + hairline). Avatar 104px circle → name + member # chip → consented story quote → green "Story shared with Danielle's consent · approved by My Struggle" line.
**50/50 split explainer (the trust-builder — must be prominent):** card with navy header ("WHERE YOUR GIFT GOES" / "Every dollar splits *two ways*"), a 14px bar split 50% blue / 50% indigo, two columns ("50% Cash — redeemed in person at outreach centers with her member ID card" / "50% Store Credits — spent on essentials at The Store"), sky-tint footnote "Danielle can save either balance for her reentry into society."
Goals: two progress cards ($105/$175 weekly gradient bar; $240 reentry savings green). Amount picker: $10/$25/$50/Custom (56px cells, selected = 2px blue border + sky-tint; Custom opens numeric input). "Make it weekly" toggle (on by default; hint copy reflects amount). Dominant 60px Donate pill, label reactive: "Give $25 weekly ❤". Trust line: Stripe · email receipt · follow-the-journey opt-in. Donate → thank-you state (green check, split recap, follow CTA). Navy footer bar.

### Surface C — Member app (`MemberApp.dc.html`)
Shell: 430 max width, header + 3px hairline, content, sticky 5-tab bar (Home ⌂ · Learn ▦ · Give ♥ · Chat ✉ · Me ◯; active blue 700, inactive `#9CA3AF`).
- **Home**: "Welcome home, Danielle" + gold streak chip "◆ 12-day streak". Dual rings card — **My Tracker** (blue, % = completed tasks incl. lesson) and **My Center** (indigo 45%) — above a one-tap task checklist (52px rows, 26px checkboxes; done = green + strikethrough). Community feed below: milestone post (gold border/chip, Marcus one-year-sober) + regular post; heart reaction toggles (outline → red fill, count +1).
- **Learn**: "MY COURSES" ring cards with program chips — ISE Course 3 (PON, 45%, "Due Sunday") → opens lesson; Forklift Cert (VOC 20%); Documents & ID Recovery (NAV, complete green). "VIDEO LIBRARY" filter chips All/New Freedom/Motivational/Steps (functional) + 2-col video cards with duration badges.
- **Lesson player**: navy header (back, "Lesson 2 of 6"), 220px video area w/ progress bar, title, **JOURNAL · PRIVATE** card (prompt, draft, "✓ Draft saved", offline-sync note), quiz card (selectable options), "Complete lesson · +10 points" → **celebration overlay**: navy scrim, ~10 blue+gold confetti pieces, gold badge circle, "+10 points · streak kept", "Share your win? ✓ Post / ✗ Keep private", "Nothing posts without you. You have 5 minutes to decide." Post → feed; either dismisses. Completing updates course to 60%, tracker ring, +10 pts, unlocks Course Champ badge on Me.
- **Give**: navy QR card (QR + `/p/danielle` + Share/Print), balance cards Cash **$64** (blue) / Store Credits **$58** (indigo) / Reentry Savings **$240** (green, "LOCKED FOR MY FUTURE" chip, "Save more" outline), recent activity list (gift +$25 split, redemption −$20, ◆ moved $40 to savings).
- **Chat**: pinned mentor thread card (Marcus, online dot, unread badge) → divider → **The Guide** (avatar = script "M" on indigo→blue gradient tile, radius 12): intro bubble + 3 quick chips ("I'm looking for a halfway house" / "I need my driver's license back" / "Help me find a job"). Chip → user bubble + tailored answer + "Yes, add it to my tracker" (adds task to Home, shows green confirmation) / "Not now".
- **Me**: navy profile header (avatar, member # chip, gold "◆ SILVER · 640 pts" chip, gold progress to Gold-at-1,000), badge grid (earned = gold circle + `#F5E6B3` border; locked = gray ◇ at 45% opacity), journey timeline (Outreach ✓ → Stabilization ✓ → In Program ✓ → **Transitional — you are here** (blue, halo) → Independent (gray)).
- **States** (designed in the canvas file, turn 3h): Home loading = skeleton blocks, no spinners; Home empty = 0% ring, "Your journey starts today", "Say hi to Sarah" CTA, gentle community note; Learn error = offline, "your journal drafts are safe on this phone", Try again.

### Surface C2 — Mentor app (`MentorApp.dc.html`)
Same shell, 4 tabs (Mentees ◎ · Chat ✉ · Community ⌂ · Me ◯).
- **Roster**: amber nudge banner ("Tyrell hasn't checked in for 6 days…" → thread). Mentee cards with health chips: Danielle (gold streak, Course 45%, green Mood 4/5), Tyrell (amber border, streak paused, Mood 2/5 · Mon), Andre (NEW, Day 1). Card → detail.
- **Mentee detail**: back header; journey snapshot (45% / 12d / 4-5 mood + goal bar); actions "Log a session" (blue) + "◆ Send a cheer" (gold outline; confirmation banner); RECENT activity (journal shows *privacy note* only — content never visible); SESSIONS summary card; **"I'm concerned about Danielle"** as a quiet gray underlined text link at the bottom (deliberately undramatic).
- **Session log**: bottom sheet (radius 24 top, drag handle, scrim tap = cancel): mode pills In person/Phone/Video, duration 15/30/45/1hr+, optional staff-visible note, "Save session · +15 points for Danielle" → saved banner + sessions card updates.
- **Thread**: Tyrell chat + **mood check-in card**: five 44px numbered circles (1 rough … 5 great, tap-select), "Shared with Marcus and the care team only."

### Surface D — Center dashboard (`Dashboard.dc.html`)
Shell: 240px navy-deep sidebar (white wordmark; items 12/24 padding; active = 3px blue left bar + `rgba(46,124,214,.14)` bg + sky-tint text; moderation pending-count badge; staff identity bottom). Canvas content area, 30/36 padding.
- **Overview**: title + "Jan 1 – Jul 4 · Edit" range pill. Row 1: PON **128** / VOC **64** / IOP **43** / NAV **87** (program chip, 52px blue tabular number, "active enrollments"). Row 2: engagement 71% vs 65% goal (green), cash redeemed $1,240, reentry savings $18,400 (green), avg streak 8.5d. Engagement trend: 12 bars (ramp = below-goal pale → above-goal blue) + dashed green 65% goal line + legend. Journey funnel: Outreach 124 → Stabilization 96 → In Program 71 → Transitional 38 → Independent 22 (green). Needs-attention queue (amber/red dots; rows link to Participants/Moderation). Milestones list (gold ◆ / green ✓ / blue ♥).
- **Participants**: search, stage/program filters, functional "Needs attention only" toggle; table (grid `2.2fr 1.3fr 1fr 1fr 1fr 1.1fr .8fr`): member (avatar, name, #), stage chip, program, streak (gold ◆Nd), course %, last active (green today / amber 6 days), risk chip ("watch" amber, "follow up" red-tint — never on the member's name). Row hover sky-tint; Danielle → detail.
- **Participant detail**: breadcrumb; header card (avatar, chips, mentor/program meta, "Print ID card", "Record redemption" → Giving desk); tabs (Journey active; Courses/Mentorship/Balances/Consent designed as stubs); journey timeline; balances card (cash/credits/reentry + "$100 daily cap · $20 redeemed today"); **consent panel** with working toggles (public giving page, photo on page, milestone updates; story-approved date). Toggling page off shows: "Public page is OFF — …/p/danielle now shows the generic org-giving state."
- **Giving desk**: 3-step redemption — 1 Scan card ✓ (verified banner: photo-match note + $64 available) → 2 Amount ($20 default, quick $10/$40/All-$64; cap note "$80 remaining") → 3 staff PIN (4 boxes) → green confirm → success ("dual record — card scan + staff PIN", app balance now $44; balance and redeemed-today update on the detail page). Right rail: split utilization stacked bar (44% cash $9,180 / 38% credits $7,940 / 18% saved $3,760) + QR funnel (1,204 scans → 312 gifts 26% → 84 weekly recurring).
- **Moderation**: pending count in title + sidebar badge (live). **Crisis card pinned** (red border/chip "CRISIS — HELD", post text, red AI REVIEW panel: held from feed, resources shown, "do not resolve without human contact"; actions: open member / assign). Post cards: author, quoted text, AI REVIEW recommendation panel (blue = approve, amber = flag w/ rationale), actions ✓ Approve (green) / ⚑ Flag · request edit (amber) / Remove — resolving replaces buttons with a verdict chip and decrements the count; removed cards dim to 50%.
- **Reports**: "2026 cohorts ▾" + "Export CSV / PDF" pills; retention table per program × 3/6/12-month vs benchmarks **65/65/80** (above = green with ▲ delta, below = red with ▼, 12-mo blue); summary cards (96 stage advances ▲18%, 22 reached Independent, $41,200 reentry savings released).
- Tablet 768 layout + loading/empty/error states are designed in the canvas file (turns 5g/5h): icon-rail sidebar at 64px, 2×2 KPI grid; skeletons / "Your center is brand new" / reassuring error.

## Interactions & Behavior (summary)
- Buttons: hover darken 8% (`#2668B8`); cards: sky-tint wash or elevated shadow; nav links: blue on hover; toggles animate 0.2s.
- Selected state everywhere = 2px blue border + sky-tint bg + blue 700–800 text.
- Mega-menu opens on hover of "Programs" (CSS); keep open across the 22px hover bridge.
- FAQ = native details/summary with +/− swap.
- Full flow map: Home → Give page → donate → thank-you; Learn → lesson → complete → celebration → Post→feed; Guide chip → answer → add task → Home tracker; roster → detail → log sheet → saved; dashboard nav switching, roster→detail, consent toggles, redemption 3-step, moderation resolution.
- Never use red on a person (amber "watch"); crisis red only in moderation; gold = celebration only, app only.
- Milestone/system posts require the member's 5-minute "Share your win?" grace choice; journals are private to the member + assigned staff; public pages never show last name, center, health info, or journey stage; cash redemptions require card-present scan + staff PIN dual record; daily cash cap $100.

## State Management (per prototype)
- **Give page**: `amount (10|25|50|custom)`, `customValue`, `weekly:boolean` (default true), `gave:boolean`.
- **Member app**: `tab`, `lessonOpen`, `celebrating`, `lessonDone` (drives course %, points 640→650, Course Champ badge), `tasks[{label,done}]` (drives My Tracker %), `heart1/2`, `vidCat`, `guideState (idle|asked|added)`, `askedLabel`.
- **Mentor app**: `view (roster|detail|thread)`, `logOpen`, `mode`, `duration`, `sessionSaved`, `cheerSent`, `mood (1–5|null)`.
- **Dashboard**: `section`, `riskOnly`, `givingStep (amount|pin|done)`, `redeemAmount`, `pagePublic`, `photoPublic`, `modStatus{post: pending|approved|flagged|removed}`.
- Real data model, ledger semantics, moderation pipeline, and gamification rules live in the included `platform-docs/` folder — see especially 04 (QR giving/ledger), 05 (social/moderation), 07 (LMS/gamification), 08 (dashboard), 03 (data model).

## Assets
- `hero.png` — center exterior photo (Home hero background; user-supplied).
- `mentor-hero.png` — mentor conversation photo (Become a Mentor hero; user-supplied).
- Wordmark white/overlay: `https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png`
- Wordmark indigo/header: `https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png`
- Divider lines SVG: `https://irp.cdn-website.com/md/dmtmpl/b5b615d8-1a71-4977-9c9d-4b59df0a4e7a/dms3rep/multi/divider-pattern-lines.svg` (tint indigo 20%)
- Home-hero ghost wordmark blue tint: `filter: brightness(0) saturate(100%) invert(45%) sepia(82%) saturate(1200%) hue-rotate(192deg) brightness(1.08) drop-shadow(0 4px 22px rgba(46,124,214,.55))`
- PON video: `youtube.com/embed/ws7TGP2QtSE` · Preserve the site's four live Stripe subscription URLs + donate.stripe.com link.
- Fonts: Google Fonts — Montserrat 400–800, Allura 400.
- QR codes: placeholder pattern in mocks; generate real per-member codes resolving to `give.my-struggle.org/p/[qr_slug]`.

## Known gaps / TODO for implementation
1. "Donate today" nav needs its own mega-menu (same panel pattern).
2. Mobile nav drawer designed (canvas turn 1e) but not wired in the prototype; site pages need responsive breakpoints (mobile layouts are designed at 390px in the canvas file).
3. Replace striped photo placeholders (each carries a monospace art-direction caption: warm daylight, navy overlays, never despair imagery).
4. Replace glyph icons with a real icon set.
5. Mission paragraphs, Brian Reinhart quote, FAQ answers, tier descriptions are drafted copy — confirm verbatim text against the live site.
6. Mentor form inputs are uncontrolled; add validation + submission.

## Files
| File | What it is |
|---|---|
| `MY-STRUGGLE-DESIGN-GUIDE.md` | **Binding design guide** — colors, type, components, differentiation contract, voice |
| `platform-docs/` | Product/module specs: vision, brand, architecture, data model, QR giving, social, mentorship, LMS/gamification, dashboard, build plan, compliance, ecosystem |
| `prototype/Home.dc.html` | Website Home (nav + mega-menu, hero, mission, Danielle spotlight, 01/02/03, manifesto, PON, stats, social wall, FAQ, footer) |
| `prototype/About.dc.html` | About (journey, impact, donut, pull-quote, stories, contact) |
| `prototype/Donate.dc.html` | Donate Today (4 ways, 12-item grid, tiers, Danielle band, Amazon, testimonial) |
| `prototype/Mentor.dc.html` | Become a Mentor (trio, interactive application form) |
| `prototype/Give.dc.html` | Public QR giving page `/p/danielle` (50/50 split explainer, amount picker, donate flow) |
| `prototype/MemberApp.dc.html` | Member app (all 5 tabs, lesson player, celebration, The Guide) |
| `prototype/MentorApp.dc.html` | Mentor app (roster, detail, session sheet, mood thread) |
| `prototype/Dashboard.dc.html` | Center dashboard (overview, roster, participant detail + consent, giving desk, moderation, reports) |
| `prototype/hero.png`, `prototype/mentor-hero.png` | Real photography |
| `My Struggle — Surface A.dc.html` | Full design-system canvas: foundation spec, every screen at 1440/768/390 incl. mega-menu state, nav drawer, empty/loading/error states, tablet dashboard |

Note on the `.dc.html` files: each contains the design markup (inline-styled HTML inside `<x-dc>`) and, where interactive, a small `Component` class with a `renderVals()` state map — read them as the pixel + behavior spec. `{{ name }}` holes bind to that state map; `sc-if`/`sc-for` are conditionals/loops. They reference a local `support.js` runtime that is intentionally **not** part of what you ship.
