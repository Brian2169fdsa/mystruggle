# 09 — Seed Data (hard rule: the app must never look empty)

Deterministic seed generated in `app/lib/store.ts` on first boot. Same output
every boot (fixed PRNG seed + fixed epoch).

- [ ] 1 nonprofit org (My Struggle) + 2 centers (Laveen Center, South Phoenix
      Center) present in seed and visible in dashboard overview
- [ ] 500 members total, distributed across both centers, with realistic
      names, member numbers (unique 9-digit, leading 0), avatar colors,
      journey levels (Bronze/Silver/Gold mix), points, streaks (incl. 0 /
      paused), balances, consent flags (~85% public)
- [ ] Danielle #039521464 remains the flagship demo member: story, $175/wk
      hallway-house goal at $105 raised, balances 64/58/240, Silver 640 pts,
      12-day streak, mentored by Marcus, login danielle@themystruggles.com
- [ ] 12 months of donation history (~thousands of gifts, weekly-recurring
      mix) whose totals drive dashboard KPIs
- [ ] Community feed seeded with realistic posts spanning 12 months
      (milestones, wins, regulars; hearts + comments), newest first; a few
      pending/flagged posts so the moderation queue isn't empty
- [ ] Support requests: mix of active + funded across members
- [ ] Mentors: ≥8 mentors incl. Marcus; every member has a mentor; Marcus
      keeps Danielle, Tyrell, Andre for the demo flows
- [ ] Mentor session logs: 12 months of sessions for demo mentees
- [ ] Message threads seeded for demo pairs (Danielle↔Marcus, Tyrell↔Marcus)
- [ ] Store stays fast: seed generation <1s, API responses capped (feed ≤50
      posts) so 500-member volume doesn't degrade UX
- [ ] New features must extend this file + the generator in the same run
