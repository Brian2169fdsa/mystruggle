# 01 — WEBSITE REQUIREMENTS (every page: desktop 1440 AND mobile 390, real content from docs/12 §6)

## Shell
- [ ] Sticky white nav: wordmark, links (About us · Programs · Donate today · Become a Mentor · Blog), Sign in, Donate ❤️ pill; 3px blue gradient hairline
- [ ] Mega-menus on Programs + Donate (photo card left, 3 thumbnail items right)
- [ ] Mobile nav drawer with full link set + donate CTA
- [ ] Footer: navy, 4-col, socials, address/phone/email, newsletter signup (writes to Resend audience)

## Home
- [ ] Hero: photo + navy overlay, eyebrow "2026 MISSION", headline with script accent "Future", subhead, Donate + Become a Mentor CTAs
- [ ] "what is *My* Struggle" mission section (4 paragraphs, verbatim base)
- [ ] Danielle story spotlight card: photo, name + member # chip, story, $175/wk progress bar, donate CTA → links to /p/danielle
- [ ] 01/02/03 give cards (items/time/funds) with giant ghost numbers
- [ ] EST. 2021 manifesto band + Brian Reinhart quote
- [ ] Position of Neutrality section: YouTube embed ws7TGP2QtSE, founder story, ISE description, external link
- [ ] Impact stat row: 15,000+ · 6,000+ · 200+ · 90%
- [ ] FAQ accordion (4 items) · newsletter band
- [ ] Lighthouse: perf ≥ 85 mobile, a11y ≥ 95

## About
- [ ] Hero "Turning Struggles Into *Strengths*, Together"
- [ ] Our Journey section (mechanic/chest-pains copy)
- [ ] True Impact stat row (animated count-up on scroll)
- [ ] Cost of Inaction: $10T by 2030 + clean blue DONUT chart (40/30/20/10) — built as SVG, not an image
- [ ] Navy pull-quote band · Stories of Transformation grid (3 cards, seed content) · contact block

## Donate Today
- [ ] Hero "Every Contribution *Counts*" + 500,000 nightly stat
- [ ] 4 ways to help cards (one-time / monthly / sponsor a QR code / apartment complexes)
- [ ] 12-item icon grid of what donations cover
- [ ] 4 monthly tier cards ($25/$39/$59 Elite "Best choice"/$200) with live Stripe links
- [ ] Danielle direct-support card · Amazon Associates section · Ashley J testimonial

## Become a Mentor
- [ ] Hero + why-mentor trio (trust/hope/accountability)
- [ ] Application form: name, contact, lived-experience tags, specialties, availability → writes to mentor application queue, confirmation email
- [ ] Training expectations section

## Public QR Giving Page /p/[qr_slug] (mobile-first, ISR)
- [ ] Loads < 1.5s on 4G; no auth, no trackers
- [ ] Member header: photo or brand avatar (consent-aware), display name, member # chip
- [ ] Approved story block
- [ ] **50/50 "Where your gift goes" split explainer graphic** (cash at centers / Store credits / save-for-reentry note)
- [ ] Goals with progress bars; "Give where needed most" option
- [ ] Amount picker $10/$25/$50/custom + weekly recurring toggle → Stripe Checkout
- [ ] Success page + email receipt + follow-the-journey opt-in
- [ ] "Recent impact" milestones list (consented)
- [ ] Consent-revoked state: generic org giving page within minutes (revalidate hook)
- [ ] QR scan analytics row written on load; conversion linked on webhook
