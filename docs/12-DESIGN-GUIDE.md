# My Struggle — Design Guide
### For Claude Design · Website (themystruggle.com rebuild) + Platform Dashboard

---

## 1. Brand Essence

**Who**: My Struggle — nonprofit (EST. 2021, Laveen AZ, co-founded by Brian Reinhart and Wayne Giles) empowering people to overcome homelessness, addiction, and incarceration through peer mentorship, outreach centers, QR Code Giving, and transitional housing.

**Tagline**: "End the Struggle, Build the Future Together"

**Feel in three words**: Modern. Blue. Clean. Warm humanity on generous white space — hopeful, dignified, never clinical, never pitying. The emotional register is "How can I help you?" — compassion replacing contempt.

**The wordmark** is the design system's soul: a handwritten script "*My*" flowing into a clean geometric sans "Struggle," in slate indigo. The script/sans pairing IS the brand — personal struggle meets structured support. Use the existing logo files; never redraw.

---

## 2. Color System

| Token | Hex | Use |
|---|---|---|
| `indigo-brand` | `#4E5B9B` | The wordmark slate-indigo. Logo, script accent words, eyebrow labels, footer headings |
| `blue-primary` | `#2E7CD6` | Primary actions, links, active states — the bright modern blue from all brand decks |
| `navy-deep` | `#0B2545` | Dark hero overlays, dashboard sidebar, footer background |
| `sky-tint` | `#EAF2FC` | Section background alternation, card hover, selected states |
| `canvas` | `#F7FAFE` | Page background |
| `white` | `#FFFFFF` | Cards, nav |
| `ink-900` | `#111827` | Headlines, body on light |
| `ink-600` | `#4B5563` | Secondary text |
| `success` | `#12B76A` | Impact stats, progress, milestones |
| `gold-badge` | `#EAB308` | Gamification/badges ONLY (platform) — never a web accent color |
| `heart-red` | `#E5484D` | The ❤️ donate accent, used microscopically (icon-scale only) |

Rule: the site is 90% white/canvas, 8% blue family, 2% everything else. If a section feels colorful, it's wrong.

**Header accent line**: a 3px gradient bar under the sticky nav, `indigo-brand → blue-primary` left-to-right. (Structural echo of the reference site's multicolor hairline — ours is monochrome-blue, instantly different.)

## 3. Typography

| Role | Font | Spec |
|---|---|---|
| Display / H1–H2 | **Montserrat** 800 | Tight tracking (-0.02em), sentence case, 56–72px desktop / 34–40px mobile |
| Script accent | **Mistrully** (brand wordmark script; fallback: Allura) | ONE word or short phrase per headline, in `indigo-brand` |
| H3–H5, UI | Montserrat 600–700 | |
| Body | Montserrat 400/500 | 17px/1.7 site, 15px dashboard |
| Eyebrow labels | Montserrat 700, 13px, caps, letter-spacing 0.12em, `blue-primary` | |
| Numbers/KPIs | Montserrat 800, tabular-nums, `blue-primary` | |

**The signature headline move** (this replaces the reference site's serif-italic-gold device and is our #1 differentiator): bold sans headline with ONE script word in indigo, mirroring the wordmark itself.
- "what is *My* Struggle" (script "My")
- "Turning Struggles Into *Strengths*, Together"
- "Bring someone *home*."
- "Every Contribution *Counts*"

Never italicize serif words. Never use gold in headlines. The script accent word is always in `indigo-brand`.

## 4. Layout & Component Language

**Grid**: 1200px max-width content, 12-col, 80–120px vertical section rhythm. Sections alternate `white` / `canvas` / occasional `navy-deep` full-bleed moment.

**Nav (site)**: white sticky header, wordmark left, center links (About us · Programs · Donate today · Become a Mentor · Blog), right: Sign in + solid blue pill "Donate ❤️". Below: the 3px blue gradient hairline. **Mega-menu dropdowns** on Programs and Donate: 2-col panel — left a featured photo card with an italic caption, right 3 stacked items each with a small square thumbnail + bold title + one-line gray description. (Structure borrowed from the reference, restyled: white panel, `rounded-2xl`, blue hover states, blue gradient top border.)

**Hero (home)**: full-bleed photo of genuine human connection, `navy-deep` 55% gradient overlay from left. Left-aligned stack: eyebrow ("2026 MISSION"), display headline with script accent ("End the Struggle, Build the *Future* Together"), 2-line subhead, dual CTA. Height ~86vh. Wordmark watermark ghosted at 8% opacity top-right (echoes the current site's overlay logo, refined).

**Buttons**: primary = `blue-primary` solid, white text, `rounded-full`, 52px, subtle shadow, hover darkens 8%; secondary = 1.5px `blue-primary` outline pill, transparent, hover fills `sky-tint`. Donate buttons carry the small ❤️. (Reference uses blue-solid + gold-outline; ours is blue-solid + blue-outline — same rhythm, different color story.)

**Cards**: white, `rounded-2xl`, `shadow-sm`, 32px padding, hover lift + `sky-tint` wash. Numbered offering cards (01/02/03 donate items/time/funds) show the number in giant 96px Montserrat 800 at 10% indigo opacity behind the title.

**Stat blocks**: big blue tabular numbers + gray caption, in a 4-up row on `canvas`: 15,000+ mentored · 6,000+ generational change · 200+ reintegrated · 90% success rate.

**Story spotlight (Danielle pattern)**: horizontal card — left photo with `rounded-2xl`, right: eyebrow "MEMBER STORY", name + member # chip, story, progress bar toward goal ("$175/week hallway house"), blue Donate-to-her-journey CTA. This card is the visual bridge to the platform's QR giving pages — same DNA.

**Pricing/tier cards** (monthly $25 Basic / $39 Advanced / $59 Elite / $200 Pro): 4-up white cards, `blue-primary` top border on hover, "Best choice" chip in `indigo-brand` on Elite, existing Stripe links preserved.

**Imagery**: real human warmth — mentor conversations, reunions, community centers, warm daylight. Overlays always navy, never black. No despair photography, no stock-corporate. Divider accent: the existing thin-lines SVG pattern, tinted indigo at 20%.

**Footer**: `navy-deep`, white wordmark, 4-col (nav / practical / contact / newsletter), social row (FB, IG, TikTok, YouTube, LinkedIn), address 6614 W Harwell Rd Laveen AZ 85339 · 602-402-7197 · info@themystruggles.com.

## 5. Differentiation Contract (vs the Sanctuary CI reference)

Same skeleton, unmistakably different skin — a client comparing the two should feel "same league, different team":

| Element | Sanctuary CI (reference) | My Struggle (this guide) |
|---|---|---|
| Display face | Serif (editorial) | Montserrat 800 (geometric sans) |
| Headline accent | Italic serif word in **gold** | Script brand word in **indigo** |
| Accent color | Gold/amber | Indigo + bright blue only |
| Header hairline | Multicolor | Monochrome blue gradient |
| Buttons | Blue solid + gold outline | Blue solid + blue outline, fully rounded, ❤️ on donate |
| Corners | Mixed | Consistently `rounded-2xl` |
| Hero overlay | Warm dark | Cool navy |
| Personality carrier | Serif elegance | The script "My" wordmark energy |

## 6. Site Map & Content Inventory (real copy pulled from my-struggle.dudasites.com — use verbatim as the content base, tightened where noted)

**Home**: Hero (tagline + 2026 Mission + donate CTA) → "what is *My* Struggle" 4-paragraph mission (verbatim from site) → Danielle story spotlight (#039521464, GED, first job, transitional home, $175/wk goal) → 01/02/03 give cards (items / time / funds — "$25 provides a week of essential services") → EST. 2021 lived-experience manifesto + Brian Reinhart quote → Position of Neutrality program section (YouTube embed ws7TGP2QtSE, Joe McDonald founder story, ISE 8-course description, link to positionofneutrality.org) → social wall → FAQ (4 items from site) → newsletter + footer.

**About**: "Turning Struggles Into *Strengths*, Together" hero → Our Journey ("you wouldn't go to a car mechanic for chest pains" — keep, it's great) → True Impact stat row → The Cost of Inaction ($10T by 2030, healthcare 40% / incarceration 30% / lost productivity 20% / other 10% — rebuild the pie as a clean blue donut, not the current image) → pull-quote band on navy → Stories of Transformation (placeholder grid) → contact.

**Donate Today**: "Every Contribution *Counts*" hero → Why Your Donation Matters (500,000 nightly homelessness stat) → 4 ways to help (one-time / monthly / sponsor a QR code / apartment complexes fund) → what donations cover (12 items: halfway house, job training, childcare, food in treatment, emergency medical, legal, transportation, treatment/insurance, mental health, clothing, reentry programs, education — render as a 3-col icon grid, not the current wall of headers) → monthly tiers with existing Stripe links → Danielle direct-support card → Amazon Associates section (amzn.to/4gQuaR8) → testimonial (Ashley J) → contact.

**Become a Mentor**: hero + application form (name, contact, lived-experience areas, availability) + "why mentor" trio + mentor training expectations.

**Platform pages to design in the same system**: `/p/[qr_slug]` public giving page (member card + 50/50 "Where your gift goes" split explainer + progress bars + donate) and the dashboard.

## 7. Dashboard Design Language (platform)

`navy-deep` left sidebar (wordmark in white, icon+label nav, active item = `blue-primary` left bar + `sky-tint` text), `canvas` content area, white `rounded-2xl` cards. Top row: program KPI cards (PON · VOC · IOP · NAV) — the REPrieve pattern: small program chip top-left, giant blue tabular number, gray caption, date-range edit link. Charts: blues only, success-green for positive outcome lines, goal lines at published case-study benchmarks (65/65/80). Tables: 15px Montserrat, `sky-tint` row hover, chips for journey stages. Participant/mentor PWA carries the identical tokens with bottom-tab navigation and celebratory confetti moments in blue + gold-badge.

## 8. Voice Rules for All UI Copy

Person-first, always: "member," "mentor," "journey" — never "client," "case," "the homeless." Celebrate loudly, ask plainly with concrete impact ("$175 a week could change everything"). Every string passes the test: would it sound right coming from someone saying *"How can I help you? Let's talk — tell me about you."*

## 9. Assets

- Wordmark (white/overlay): `https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png`
- Wordmark (indigo/header): `https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png`
- Divider lines SVG: `https://irp.cdn-website.com/md/dmtmpl/b5b615d8-1a71-4977-9c9d-4b59df0a4e7a/dms3rep/multi/divider-pattern-lines.svg`
- PON video: `youtube.com/embed/ws7TGP2QtSE` · Stripe links: preserve the four live subscription URLs + donate.stripe.com link from the current site
