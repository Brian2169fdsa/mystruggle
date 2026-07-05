# 06 — COMMUNITY FEED (Facebook-style) & MODERATION REQUIREMENTS

## Feed Core
- [ ] Post types: update, milestone, testimony, question, celebration, system
- [ ] Audiences: community / org / mentors_only; selector defaults to org when enrolled; RLS proves org posts invisible cross-org
- [ ] Reverse-chron feed with pinned staff posts on top; infinite scroll with cursor pagination
- [ ] Media upload (image) to org-scoped bucket with size/type validation
- [ ] Heart reactions (unique per user, optimistic UI); one-level comments with counts
- [ ] System post generation hooks: badge earned, course completed, goal funded, stage advance, streak milestone — each with 5-min opt-out grace
- [ ] Report post/comment · block user (bidirectional hide) · delete own post
- [ ] Realtime: new-post pill via Supabase channel; comment/reaction live counts
- [ ] Notifications: reactions/comments on my post, mentor comment, org announcement (in-app + optional email digest)
- [ ] No algorithmic ranking, no public follower counts, no infinite-dopamine mechanics (design review item)

## Moderation Pipeline (state machine test matrix must pass)
- [ ] All posts enter pending; clean text from members in good standing auto-approves < 5s (edge first pass)
- [ ] Media + flagged text → Claude rubric review (substance glamorization, bullying, solicitation, contact-sharing, self-harm) → approve / flag / remove-recommend
- [ ] Crisis language: post held, author sees supportive resource message (988 included), org staff + ms_admin alerted < 60s, NEVER auto-published, NEVER auto-counseled — test post proves full path
- [ ] Staff queue one-click actions; every action → moderation_events with actor
- [ ] Repeat-flag member → good-standing status revoked (future posts always reviewed)
- [ ] Moderation strictness org setting respected
- [ ] Sobriety anniversary posts: respectful gold-accent treatment
