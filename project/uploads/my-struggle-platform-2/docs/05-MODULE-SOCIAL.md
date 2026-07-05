# 05 — Module: Community Feed

## Purpose

A Facebook-style feed built for recovery: mentees and mentors share wins, testimonies, questions, and encouragement in a moderated, safe space. The feed is the emotional heartbeat of the platform and the surface where gamification, LMS, and giving become visible and social.

## Feed Composition (Home tab)

- **Audiences**: `community` (all platform members), `org` (your center only), `mentors_only`. Selector on composer; default = org if participant has an active enrollment, else community.
- **Post types**: update (text/photo), milestone (auto or manual), testimony (long-form story), question, celebration. **System posts** are auto-generated on: badge earned, course completed, goal fully funded, journey stage advance, streak milestones — participant can hide any auto-post before it publishes (5-minute grace toast: "Share your win? ✓ Post / ✗ Keep private").
- Ranking v1: reverse-chron with pinned staff posts. No algorithmic ranking, no infinite-dopamine patterns — this product's engagement goal is connection, not time-on-app.
- Reactions: heart only in v1 (no counts race). Comments threaded one level.

## Moderation Pipeline (non-negotiable)

1. Post submitted → `moderation_status=pending`
2. Instant first pass (edge function): blocklist + pattern rules → auto-approve clean text-only posts from members in good standing within seconds (feels instant); media and flagged text go to step 3
3. Claude review (`claude-sonnet-4-6`, strict rubric): substance glamorization, bullying, solicitation, contact-info sharing, self-harm signals → approve / flag / remove-recommend
4. **Crisis language** (self-harm, overdose risk): immediately alert org staff + ms_admin via email/SMS-webhook, post held, supportive resource message shown to author. Never auto-respond beyond resources; a human follows up.
5. Staff moderation queue in dashboard with one-click actions; every action → `moderation_events`

## Realtime & Notifications

- New posts on subscribed channel appear via a "New posts ↑" pill (no jarring reflow)
- Notifications (in-app + optional email digest): reactions/comments on your post, mentor commented, your center posted an announcement

## Safety UX

- Report button on every post/comment → moderation queue
- Block user (hides both directions)
- Display names only, avatars only if consented; no DMs outside mentorship threads (prevents grooming/exploitation of vulnerable users)
- Anniversary sensitivity: sobriety-date posts get a special respectful celebration treatment (gold accent, no comment jokes prompt)

## Done When

- Post → auto-moderation → feed appearance loop under 5s for clean posts
- Crisis-language test post triggers staff alert and never appears publicly
- Org-audience post from Center A is invisible to Center B accounts (RLS negative test)
