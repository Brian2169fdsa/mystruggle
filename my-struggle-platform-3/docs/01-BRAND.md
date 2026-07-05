# 01 — Brand & Design System

Source of truth: my-struggle.dudasites.com (crawled) + directive "modern blue and clean."

## Identity

- **Name**: My Struggle
- **Tagline**: "End the Struggle, Build the Future Together"
- **Secondary lines**: "Bring someone home" / "Empowering second chances"
- **Logo**: https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png (download to `/public/brand/` at build time; also grab the %2844% variant used in the header)
- **Contact**: info@themystruggles.com · 602-402-7197 · Laveen, AZ

## Voice

Warm, hopeful, direct, dignity-forward. Speaks about people, never cases. "Help Danielle succeed in her journey back to society" — always the person's goal, then the ask. Avoid clinical language ("client," "patient," "case") on all participant-facing and public surfaces; use "participant," "mentor," "member," "journey." Celebrate progress loudly; state needs plainly with concrete dollar impact ("$175 a week for the hallway house could change everything").

## Color Tokens (modern blue and clean)

```css
:root {
  --ms-blue-900: #0B2545;   /* deep navy — headers, dashboard nav */
  --ms-blue-700: #13478C;   /* primary brand blue — buttons, links */
  --ms-blue-500: #2E7CD6;   /* interactive accents, active states */
  --ms-blue-100: #E3EEFB;   /* tinted backgrounds, selected rows */
  --ms-sky-050:  #F5F9FE;   /* page background */
  --ms-white:    #FFFFFF;
  --ms-ink-900:  #101828;   /* primary text */
  --ms-ink-600:  #475467;   /* secondary text */
  --ms-success:  #12B76A;   /* milestones, goal funded, streaks */
  --ms-warning:  #F79009;   /* attention, at-risk flags */
  --ms-danger:   #E5484D;   /* alerts only — use sparingly */
  --ms-gold:     #EAB308;   /* badges, gamification highlights */
}
```

Tailwind: extend theme with `ms` palette matching the above. Primary button = `ms-blue-700` bg, white text, `rounded-xl`. Cards = white on `ms-sky-050`, `rounded-2xl`, `shadow-sm`, generous padding.

## Typography

- Headings + body: **Montserrat** (confirmed across the My Struggle deck and REPrieve materials) — headings 700/600 with tight tracking, body 400/500, 16px base on mobile, 15px in dashboard tables. Inter is the acceptable fallback stack.
- Numbers (donation amounts, KPIs, balances): tabular-nums, 700, brand blue for positive metrics — the REPrieve dashboard's "big blue number" KPI cards are the reference pattern.

## Confirmed Brand Facts (from pitch decks)

- Tagline variants in circulation: "End the Struggle, Build the Future Together" (site) and "The End of Struggle, The Start of Unity" (deck) — site version is primary for the platform.
- Giving domain: **give.my-struggle.org**
- Campaign voice reference — the Re-Humanization contrast: lead with "How can I help you?" / "Let's talk; tell me about you." The brand's whole premise is replacing contempt with compassion; every string in the product should pass that test.
- All materials (site, both decks, REPrieve UI) consistently use a bright modern blue on white with generous whitespace — the token set above matches this direction.

## Layout Language

- **Participant/mentor PWA**: bottom tab bar (Home · Learn · Give/QR · Chat · Me), single-column cards, large touch targets (min 44px), pull-to-refresh feeds, celebratory moments use full-screen confetti overlays in brand blue + gold.
- **Center dashboard**: left sidebar nav (navy `ms-blue-900`), white content canvas, KPI card row on every overview page, charts in blues with success-green for positive outcomes.
- **Public QR pages**: hero photo (if consented) or brand-blue avatar, first name + participant #, progress bars toward goals, single dominant Donate button. These pages must load fast on any phone — static-generated with ISR, no auth, no trackers.

## Imagery

Real people, real moments, warm light. Never stock-photo despair imagery. Divider pattern from site (`divider-pattern-lines.svg`) may be reused as a section accent.
