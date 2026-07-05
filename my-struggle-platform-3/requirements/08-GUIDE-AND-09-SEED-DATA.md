# 08 — THE GUIDE (AI) REQUIREMENTS

- [ ] Chat surface in member app (Chat tab section) with warm brand-voice persona and quick-start chips
- [ ] RAG over `resources` table (housing, documents, employment, transport, benefits categories); dashboard resource library editor (CRUD, org-scoped + global)
- [ ] Tools limited to: search_resources, create_journey_task (with member confirmation chip before creating)
- [ ] Hard refusals verified by test prompts: medical dosing/clinical advice, legal counsel, crisis counseling → warm redirect + resources + staff visibility
- [ ] Crisis language in Guide chat triggers the same staff-alert path as the feed (< 60s, test-proven)
- [ ] Transcripts stored, visible to assigned staff in dashboard review pane
- [ ] Rate limiting per member; graceful offline/error states
- [ ] Seeded resources answer the three chip questions correctly (halfway house, driver's license reinstatement AZ, job search)

# 09 — SEED / MOCK DATA REQUIREMENTS (idempotent script: `npm run seed`)

- [ ] Orgs: My Struggle (nonprofit) + Desert Hope Recovery + New Dawn Center (centers) + 2 Store locations
- [ ] 500 members with 12 months of history: realistic name/stage distribution across intake→alumni, varied engagement (thriving/steady/at-risk/dormant cohorts), ~15% discharged-but-active (proves post-discharge tracking)
- [ ] Flagship demo: Danielle #039521464 — full journey timeline, 2 goals ($175/wk hallway house 60% funded, license reinstatement), 14 donations incl. 2 recurring, balances in all three buckets, streak 23, 4 badges, ISE course 5/8, active mentor with 9 logged sessions, 12 feed posts
- [ ] 25 mentors (varied capacity/activity, 2 pending applications, 1 blocked-on-background-check)
- [ ] 60 active mentorships + 400 sessions + message threads with realistic conversations
- [ ] 1,200 feed posts across types/audiences incl. pinned announcements, pending moderation items, 3 flagged examples, sobriety anniversaries
- [ ] 8 ISE courses (PON) with real lesson structure + video library (12 videos, 3 categories) + assignments + progress distributions matching cohorts
- [ ] 900 donations over 12 months (trend visible), qr_scans with realistic conversion (~8%), redemptions (cash + store), reentry savings holders
- [ ] Points/badges/streaks consistent with each member's activity history (derived, not random)
- [ ] Every dashboard chart, KPI card, funnel, heatmap, and report renders meaningfully from seed alone (visual check item)
- [ ] Demo accounts printed at seed end: member, mentor, center_staff, center_admin, ms_admin (password logins for testing)
