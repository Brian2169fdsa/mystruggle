-- =====================================================================
-- My Struggle — Row Level Security, ENGAGEMENT (Runs 9–10 / seed v11)
-- =====================================================================
-- Implements docs/10-COMPLIANCE.md as database policy for the tables in
-- schema-run9-10.sql. Run AFTER schema.sql, schema-expansion.sql,
-- schema-run9-10.sql, policies.sql (defines is_staff() / is_mentor()),
-- and policies-expansion.sql.
--
-- PRINCIPLES (docs/10):
--   * RLS ENABLED ON EVERY NEW TABLE — no exceptions.
--   * notifications: a user reads / marks-read ONLY their own inbox; there
--     is NO user-facing insert path — rows are written server-side by the
--     emit_notification hook / service role (mirrors continuum_events).
--   * community_events: public-read (GET /api/events is open to all, incl.
--     signed-out); mentors + staff create/manage (POST is getRoleUser
--     "mentor" — staff pass every gate → is_mentor()).
--   * event_rsvps: a user manages ONLY their own RSVP rows; per-event
--     RSVP counts are exposed via the event_rsvp_count() aggregate RPC,
--     never by letting a caller scan other members' RSVP rows.
--   * member_blocks: a user manages / reads ONLY their own (blocker = me).
--   * post_reports: a member files their OWN report (reporter = me); staff
--     read + resolve the queue (all-staff — the app notifies every staff
--     user; posts carry no center linkage to scope by).
--
-- Each section ends with NEGATIVE TEST comments — runnable patterns for
-- the policy test suite (AUTOPILOT: RLS items require negative tests).
-- =====================================================================

-- ── enable RLS everywhere (engagement tables) ────────────────────────

alter table public.notifications    enable row level security;
alter table public.community_events enable row level security;
alter table public.event_rsvps      enable row level security;
alter table public.member_blocks    enable row level security;
alter table public.post_reports     enable row level security;

-- =====================================================================
-- NOTIFICATIONS  — own inbox only; no user insert path.
-- =====================================================================
-- A user SELECTs and marks-read (UPDATE) only rows addressed to them.
-- Insert is deliberately absent for anon/authenticated: the inbox is
-- written by emit_notification() (a definer hook) or the service role,
-- exactly like continuum_events / donations. This prevents a member
-- forging a notification into someone else's inbox.
create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications: mark own read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "notifications: staff read"
  on public.notifications for select to authenticated
  using (public.is_staff());

-- NEGATIVE TESTS (notifications):
--   as anon:            select * from notifications;                       → 0 rows
--   as member danielle: select * from notifications where user_id<>auth.uid(); → 0 rows (another inbox is invisible)
--   as member danielle: insert into notifications (user_id,kind,title)
--                         values (<tyrell>,'system','x');                  → ERROR: RLS violation (no user insert path)
--   as member danielle: update notifications set read=true
--                         where user_id<>auth.uid();                       → 0 rows updated

-- =====================================================================
-- COMMUNITY EVENTS  — public read; mentor/staff create + manage.
-- =====================================================================
-- GET /api/events is open (no auth gate) and returns every event, so the
-- feed is public-read for anon + authenticated. Creation/edit is gated to
-- mentors and staff (is_mentor() = role in mentor|staff), creating as self.
create policy "community_events: public read"
  on public.community_events for select to anon, authenticated
  using (true);
create policy "community_events: mentor creates own"
  on public.community_events for insert to authenticated
  with check (public.is_mentor() and creator_id = auth.uid());
create policy "community_events: creator updates own"
  on public.community_events for update to authenticated
  using (public.is_mentor() and creator_id = auth.uid())
  with check (public.is_mentor() and creator_id = auth.uid());
create policy "community_events: staff manage"
  on public.community_events for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (community_events):
--   as member danielle: insert into community_events (creator_id,...)
--                         values (auth.uid(),...);                         → ERROR (members can't create events)
--   as mentor marcus:   insert ... (creator_id = <sarah>, ...);           → ERROR: RLS violation (forged creator)
--   as mentor marcus:   update community_events set title='x'
--                         where creator_id <> auth.uid();                  → 0 rows updated (only own; staff manage all)

-- =====================================================================
-- EVENT RSVPS  — own rows only; counts via a definer aggregate.
-- =====================================================================
-- A member adds/removes ONLY their own RSVP; they may read their own rows
-- (to compute iRsvped). Per-event totals (rsvpCount) come from the
-- event_rsvp_count() definer RPC below — a caller never scans another
-- member's RSVP rows. Staff read all for the roster.
create policy "event_rsvps: read own"
  on public.event_rsvps for select to authenticated
  using (user_id = auth.uid());
create policy "event_rsvps: staff read"
  on public.event_rsvps for select to authenticated
  using (public.is_staff());
create policy "event_rsvps: rsvp as self"
  on public.event_rsvps for insert to authenticated
  with check (user_id = auth.uid());
create policy "event_rsvps: un-rsvp as self"
  on public.event_rsvps for delete to authenticated
  using (user_id = auth.uid());

-- Aggregate-only RSVP count for an event (the rsvpCount the feed shows).
-- SECURITY DEFINER so it can count rows the caller can't individually
-- select; returns a bare number, never member rows. Mirrors the
-- placement_stats() aggregate-RPC pattern in policies-expansion.sql.
create or replace function public.event_rsvp_count(p_event uuid)
returns bigint
language sql stable security definer set search_path = public
as $$
  select count(*)::bigint from public.event_rsvps where event_id = p_event;
$$;

grant execute on function public.event_rsvp_count(uuid) to anon, authenticated;

-- NEGATIVE TESTS (event_rsvps):
--   as member danielle: insert into event_rsvps (event_id,user_id)
--                         values (<e>, <tyrell>);                          → ERROR: RLS violation (forged attendee)
--   as member danielle: select * from event_rsvps where user_id<>auth.uid(); → 0 rows (can't enumerate attendees)
--   as member danielle: delete from event_rsvps where user_id<>auth.uid(); → 0 rows deleted
--   as anon:            select public.event_rsvp_count(<e>);              → a count (no member rows exposed)

-- =====================================================================
-- MEMBER BLOCKS  — own blocks only (blocker = me).
-- =====================================================================
-- A user reads, creates, and removes ONLY the blocks they authored. No one
-- else — not even the blocked user — can see who blocked them via this table
-- (the reverse-lookup filtering is a server-side concern, not a client read).
create policy "member_blocks: read own"
  on public.member_blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy "member_blocks: block as self"
  on public.member_blocks for insert to authenticated
  with check (blocker_id = auth.uid());
create policy "member_blocks: unblock own"
  on public.member_blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- NEGATIVE TESTS (member_blocks):
--   as member danielle: insert into member_blocks (blocker_id,blocked_id)
--                         values (<tyrell>, <marcus>);                     → ERROR: RLS violation (forged blocker)
--   as member danielle: insert ... (auth.uid(), auth.uid());              → ERROR: member_blocks_no_self_ck (can't block self)
--   as member danielle: select * from member_blocks where blocker_id<>auth.uid(); → 0 rows (can't see others' blocks)
--   as member tyrell:   select * from member_blocks where blocked_id=auth.uid();  → 0 rows (blocked user can't enumerate)

-- =====================================================================
-- POST REPORTS  — member files own; staff read + resolve the queue.
-- =====================================================================
-- A signed-in member files a report on a post as themselves; a new report
-- must start 'open'. The reporter may read back their own report (so an
-- insert…returning works). Staff read the whole queue and mark reports
-- 'reviewed' — all-staff, matching the app which notifies EVERY staff user
-- (posts carry no center linkage to scope the queue by).
create policy "post_reports: member files own"
  on public.post_reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open');
create policy "post_reports: reporter reads own"
  on public.post_reports for select to authenticated
  using (reporter_id = auth.uid());
create policy "post_reports: staff read"
  on public.post_reports for select to authenticated
  using (public.is_staff());
create policy "post_reports: staff resolve"
  on public.post_reports for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (post_reports):
--   as anon:            insert into post_reports (...);                    → ERROR (sign-in required; no anon insert)
--   as member danielle: insert into post_reports (post_id,reporter_id,reason)
--                         values (<p>, <tyrell>, 'spam');                  → ERROR: RLS violation (forged reporter)
--   as member danielle: insert ... (reporter_id=auth.uid(), status='reviewed'); → ERROR (must start 'open')
--   as member danielle: select * from post_reports where reporter_id<>auth.uid(); → 0 rows (queue is staff-only)
--   as member danielle: update post_reports set status='reviewed' ...;    → 0 rows updated (only staff resolve)
