# 01 — Marketing Website (Home, About, Donate, Become a Mentor)

Spec: `project/design_handoff_my_struggle/README.md` §Surface A + `docs/12-DESIGN-GUIDE.md`.
Audit 2026-07-05: curl + SSR grep of `/`, `/about`, `/donate`, `/mentor` (all 200).

## Nav + mega-menu (all pages)

- [x] Sticky white nav: wordmark, About us · Programs ▾ · Donate today · Become a Mentor, Sign in, Donate ❤ pill, 3px gradient hairline ✔ verified: SSR of / contains all links + hairline div
- [x] Programs mega-menu: 740px panel, featured PON photo card, 3 program items, FOR CENTERS strip → /dashboard, /member-app, /mentor-app ✔ verified: SSR contains "FOR CENTERS" + all three app links (CSS hover panel)
- [x] Mega-menu survives the 22px hover bridge (pt-[22px] wrapper) ✔ verified: SSR markup uses group-hover + pt-[22px] bridge
- [ ] "Donate today" nav gets its own mega-menu (guide requirement; known TODO — not built)
- [x] Mobile hamburger → full-screen navy drawer: Programs accordion, FOR CENTERS links, Sign in, Donate CTA ✔ verified: SSR contains "Open menu" trigger + drawer markup (client toggle not browser-tested)

## Home

- [x] Hero: real center photo bg (center-exterior.png), navy gradient overlay, blue-tinted ghost wordmark, "2026 MISSION" eyebrow, H1 with script "Future", dual CTAs ✔ verified: SSR contains center-exterior.png, filter, "2026 MISSION"
- [x] Mission two-col "what is *My* Struggle" with 4 paragraphs ✔ verified: SSR "what is" + script span
- [x] Danielle spotlight card: MEMBER STORY eyebrow, name + Member #039521464 chip, GED/job/housing story, $175/wk bar at $105/60%, Donate-to-her-journey CTA → /give ✔ verified: SSR "039521464", "$105 raised", "Donate to Danielle"
- [x] 01/02/03 give cards (items / time / funds, "$25 provides a week…", 96px ghost numerals) ✔ verified: SSR "Three ways to give"
- [x] EST. 2021 navy manifesto band with ghost type + Brian Reinhart quote ✔ verified: SSR "EST. 2021 · LAVEEN" + "BRIAN REINHART"
- [x] Position of Neutrality section: Joe McDonald, 8-course ISE copy, YouTube embed ws7TGP2QtSE, positionofneutrality.org link ✔ verified: SSR contains embed id + link
- [x] Stat row 15,000+ / 6,000+ / 200+ / 90% (success green) ✔ verified: SSR contains all four
- [x] Social wall: 4 platform cards (IG/FB/TT/YT, chip avatar, media placeholder, caption) + 5 follow pills ✔ verified: SSR "Social wall", "@themystruggle" ×4 cards
- [ ] Follow pills + footer social circles link to real profiles (currently non-link `<span>`s)
- [x] FAQ: 4 native `<details>` accordions, 50/50 answer first and open by default, +/− indicator ✔ verified: SSR contains `details open` on first item + "Where does my donation actually go"
- [x] Full navy footer: wordmark/tagline/social, Explore, Contact (6614 W Harwell Rd · 602-402-7197 · info@themystruggles.com), newsletter block, © bar ✔ verified: SSR contains address + "Email address" pill

## About

- [x] Hero "Turning Struggles Into *Strengths*, Together" ✔ verified: SSR "Strengths"
- [x] Our Journey ("You wouldn't go to a car mechanic for chest pains.") ✔ verified: SSR
- [x] True Impact stat row ✔ verified: SSR stats block
- [x] Cost of Inaction: legend + conic-gradient donut, white center "$10T projected cost by 2030" ✔ verified: SSR "conic-gradient" + "$10T"
- [x] Navy pull-quote band "How can I help you? …" ✔ verified: SSR
- [x] Stories of Transformation 3-card grid (Danielle card → /give) ✔ verified: SSR "Stories of transformation"
- [x] Sky-tint contact band with address/phone/email ✔ verified: SSR "6614 W Harwell"

## Donate Today

- [x] Hero "Every Contribution *Counts*" ✔ verified: SSR
- [x] 500,000 stat split section ✔ verified: SSR "500,000"
- [x] 4 ways to help cards (one-time / monthly / sponsor a QR code / apartment complexes fund, diamond markers) ✔ verified: SSR
- [x] 12-item "what donations cover" grid with diamond bullets (halfway house … education) ✔ verified: SSR "Halfway house placement" + grid
- [x] Tier cards $25 Basic / $39 Advanced / $59 Elite ("Best choice" indigo chip, blue top border, filled CTA) / $200 Pro ✔ verified: SSR "$59", "Best choice", "$200"
- [ ] Tier CTAs wired to the site's four live Stripe subscription URLs + donate.stripe.com link (CTAs are non-link `<span>`s; grep "stripe.com" in SSR = 0 matches)
- [x] Navy Danielle direct-support band with member # chip + /give links ✔ verified: SSR "039521464"
- [x] Amazon Associates card (amzn.to/4gQuaR8) + Ashley J. testimonial ✔ verified: SSR both present

## Become a Mentor

- [x] Hero "Your struggle is someone's *map*" over real mentor-hero.png with navy overlay ✔ verified: SSR contains mentor-hero.png + headline
- [x] Why-mentor trio (01 lived experience / 02 one member one journey / 03 trained & supported) ✔ verified: SSR "Lived experience is expertise"
- [x] Application form renders: name/phone/email, 5 lived-experience multi-select chips, availability pills (Weekly / Every other week / Flexible), optional story, submit + training-expectations list beside ✔ verified: SSR contains all fields + "Apply to mentor"
- [ ] Form submit → success state persists nothing: no validation, no API, application never reaches a dashboard queue (docs/06 requires mentor-application queue)
- [ ] Mentor form input validation (required name/phone/email) — inputs are uncontrolled, submit always succeeds

## Responsive + open items

- [x] Mobile-first markup on all 4 pages: clamp() headlines, `py-16 lg:py-*` rhythm, grid collapse, drawer below lg ✔ verified: SSR responsive classes present on all pages
- [ ] Visual pass at 390px (no horizontal scroll, ≥44px touch targets) — needs browser verification
- [ ] Replace striped photo placeholders with real photography (Danielle portrait, About/Donate heroes, social wall, story cards) — only hero.png / mentor-hero.png / center-exterior.png are real
- [ ] Newsletter signup functional (footer "Email address" is a styled div, Join is a non-button span — captures nothing)
- [ ] Privacy / Terms pages exist (footer shows plain text, no links)
- [ ] Confirm drafted copy verbatim against the live site (mission paragraphs, Reinhart quote, FAQ, tier descriptions — handoff TODO 5)
- [ ] Remove/gate the PrototypeMap dev overlay before production
