-- =====================================================================
-- My Struggle — Row Level Security (v1)
-- =====================================================================
-- Implements docs/10-COMPLIANCE.md as database policy. Run AFTER
-- schema.sql. Principles:
--
--   * RLS ENABLED ON EVERY TABLE — no exceptions.
--   * Public (anon) surfaces see ONLY: approved feed posts (+ their
--     comments/heart counts) and the consented giving projections via
--     SECURITY-DEFINER VIEWS (public_members, public_request_board).
--     anon NEVER selects the profiles table directly.
--   * Balances (cash/credits/savings) live on profiles → readable by
--     self + staff only; the public_members view exposes savings_cents
--     ONLY (shown as "reentry savings" on /p/[slug]), never cash/credits.
--   * Donations are written by the service role only (Stripe webhook);
--     there is deliberately NO insert policy for any user role.
--   * Concerns are quiet by design: the member they concern can never
--     see them.
--
-- AUTOPILOT: RLS items require negative tests. Each section ends with
-- NEGATIVE TEST comments — runnable patterns for the policy test suite
-- (set request.jwt.claims locally, or supabase-js with per-user JWTs).
-- =====================================================================

-- ── helper predicates ────────────────────────────────────────────────
-- SECURITY DEFINER so they can read profiles without recursing into
-- profiles' own RLS policies. Owned by postgres; safe: they only ever
-- reveal the CALLER's role/mentees, keyed to auth.uid().

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'staff'
  );
$$;

create or replace function public.is_mentor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('mentor', 'staff')
  );
$$;

-- True when the caller mentors the given member (mentor-app roster scope).
create or replace function public.is_mentor_of(member uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = member and mentor_id = auth.uid()
  );
$$;

-- True when the caller participates in the given thread (avoids RLS
-- recursion between threads/participants/messages).
create or replace function public.is_thread_participant(t uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.thread_participants
    where thread_id = t and user_id = auth.uid()
  );
$$;

-- True when the post is publicly visible (feed is public-read).
create or replace function public.post_is_approved(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.posts where id = p and status = 'approved'
  );
$$;

revoke execute on function public.is_mentor_of(uuid), public.is_thread_participant(uuid), public.post_is_approved(uuid) from anon;

-- ── enable RLS everywhere ────────────────────────────────────────────

alter table public.centers                enable row level security;
alter table public.profiles               enable row level security;
alter table public.support_requests       enable row level security;
alter table public.donations              enable row level security;
alter table public.posts                  enable row level security;
alter table public.post_hearts            enable row level security;
alter table public.comments               enable row level security;
alter table public.threads                enable row level security;
alter table public.thread_participants    enable row level security;
alter table public.messages               enable row level security;
alter table public.concerns               enable row level security;
alter table public.mentor_applications    enable row level security;
alter table public.sessions               enable row level security;
alter table public.courses                enable row level security;
alter table public.enrollments            enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ── centers ──────────────────────────────────────────────────────────
-- Center names/cities are not sensitive; docs/10 §1 only forbids showing
-- a PERSON's center affiliation publicly (enforced on profiles, below).

create policy "centers: authenticated read"
  on public.centers for select
  to authenticated
  using (true);

create policy "centers: staff manage"
  on public.centers for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── profiles ─────────────────────────────────────────────────────────
-- Self + staff read; mentors read their own mentees (mentor-app roster).
-- NO anon access — public giving data flows ONLY through public_members.
-- Writes: staff only. Members do not update their own row in v1 — every
-- self-mutation in the app today (points, streak, level, balances,
-- consent) is either computed server-side or a staff/compliance action,
-- so granting self-update would let a member forge balances/points.
-- Server-side mutations (lesson complete, donation split) run through
-- SECURITY DEFINER RPCs or the service role.

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: staff read all"
  on public.profiles for select
  to authenticated
  using (public.is_staff());

create policy "profiles: mentor reads mentees"
  on public.profiles for select
  to authenticated
  using (mentor_id = auth.uid());

create policy "profiles: staff update"
  on public.profiles for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- insert happens via the on_auth_user_created trigger (security definer);
-- no user-facing insert policy needed. delete: service role only.

-- NEGATIVE TESTS (profiles):
--   as anon:            select * from profiles;                          → 0 rows
--   as member danielle: select * from profiles where id <> auth.uid();   → 0 rows (no other member visible)
--   as member danielle: update profiles set cash_cents = 999999
--                         where id = auth.uid();                         → 0 rows updated (no self-update policy)
--   as mentor marcus:   select * from profiles where id = <tyrell>;      → 1 row (his mentee)
--   as mentor marcus:   select * from profiles where id = <other-mentor-mentee>; → 0 rows

-- ── public giving views (SECURITY DEFINER) ───────────────────────────
-- docs/02 §Security: public QR pages read a definer view returning ONLY
-- the consented, public-safe projection. RLS denies all direct table
-- access to anon; these views are the single public window.
-- NOTE: intentionally NOT security_invoker — the Supabase linter will
-- flag definer views; this one is the documented exception (docs/02).

create or replace view public.public_members as
select
  p.slug,
  p.name,                                  -- first name only, by construction
  p.member_number,
  coalesce(p.story, '') as story,
  p.savings_cents                          -- "reentry savings" shown on /p/[slug]; cash/credits NEVER here
from public.profiles p
where p.role = 'member'
  and p.consent_public = true
  and p.slug is not null;

comment on view public.public_members is
  'Public-safe donor projection (docs/10 §1). consent_public=false members simply do not exist here — revocation is immediate.';

-- Public support board (/api/requests/board + request cards on /p/[slug]).
create or replace view public.public_request_board as
select
  r.id,
  r.label,
  r.weekly_target_cents,
  r.raised_cents,
  r.status,
  r.created_at,
  p.name        as member_name,
  p.slug,
  p.avatar_color
from public.support_requests r
join public.profiles p on p.id = r.member_id
where p.role = 'member'
  and p.consent_public = true
  and p.slug is not null;

-- Views are owned by the schema owner and bypass RLS (definer behavior);
-- expose them explicitly:
grant select on public.public_members, public.public_request_board to anon, authenticated;

-- NEGATIVE TESTS (public views):
--   as anon: select * from public_members where slug = 'andre';          → 0 rows (consent_public = false)
--   as anon: select cash_cents from public_members;                      → ERROR: column does not exist
--   as anon: select * from public_request_board
--            where slug = 'andre';                                       → 0 rows (his requests hidden with consent off)
--   flip: update profiles set consent_public = false where slug='danielle' (as staff);
--         as anon select * from public_members where slug='danielle';    → 0 rows immediately (docs/10 revocation)

-- ── support_requests ─────────────────────────────────────────────────
-- Own + staff read/manage; members create their own ("request online").
-- raised_cents/status advance via the donation webhook (service role).
-- Public read is ONLY the public_request_board view above.

create policy "support_requests: read own"
  on public.support_requests for select
  to authenticated
  using (member_id = auth.uid());

create policy "support_requests: staff read"
  on public.support_requests for select
  to authenticated
  using (public.is_staff());

create policy "support_requests: member creates own"
  on public.support_requests for insert
  to authenticated
  with check (member_id = auth.uid() and raised_cents = 0 and status = 'active');

create policy "support_requests: staff update"
  on public.support_requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (support_requests):
--   as anon:            select * from support_requests;                  → 0 rows
--   as member danielle: insert .. (member_id = <tyrell>, ...)            → ERROR: RLS violation
--   as member danielle: insert .. (member_id = auth.uid(), raised_cents = 5000, ...) → ERROR (can't pre-fund own goal)
--   as member danielle: update support_requests set raised_cents = 99999
--                         where member_id = auth.uid();                  → 0 rows updated

-- ── donations ────────────────────────────────────────────────────────
-- INSERT: service role ONLY (Stripe webhook — docs/02 §Security). No
-- insert policy exists for anon/authenticated on purpose; the service
-- role bypasses RLS. Read: staff + the receiving member.

create policy "donations: receiving member reads own"
  on public.donations for select
  to authenticated
  using (member_id = auth.uid());

create policy "donations: staff read"
  on public.donations for select
  to authenticated
  using (public.is_staff());

-- NEGATIVE TESTS (donations):
--   as anon:            insert into donations (member_id, amount_cents) values (...); → ERROR: RLS violation
--   as member danielle: insert into donations (member_id, amount_cents)
--                         values (auth.uid(), 1000000);                  → ERROR (can't gift yourself)
--   as member danielle: select * from donations where member_id <> auth.uid(); → 0 rows
--   as service role:    insert ... → succeeds (webhook path)

-- ── posts ────────────────────────────────────────────────────────────
-- The community feed is PUBLIC-READ for approved posts (signed-out
-- /community is read-only). Authors see their own posts in any status
-- (author=me "My posts" includes pending/flagged). Staff see and
-- moderate everything. Authors insert as themselves; the crisis path
-- writes status='flagged' (held), normal path 'approved' — both allowed
-- by the insert check; 'pending' allowed for the docs/05 pipeline.
-- Authors can NOT update posts (no edit in app; moderation is staff-only).

create policy "posts: approved are public"
  on public.posts for select
  to anon, authenticated
  using (status = 'approved');

create policy "posts: author reads own"
  on public.posts for select
  to authenticated
  using (author_id = auth.uid());

create policy "posts: staff read all"
  on public.posts for select
  to authenticated
  using (public.is_staff());

create policy "posts: author inserts own"
  on public.posts for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "posts: staff moderate"
  on public.posts for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (posts):
--   as anon:            select * from posts where status <> 'approved';  → 0 rows
--   as member danielle: select * from posts where status = 'pending'
--                         and author_id <> auth.uid();                   → 0 rows
--   as member danielle: insert into posts (author_id, body) values (<marcus>, 'x'); → ERROR: RLS violation
--   as member danielle: update posts set status = 'approved'
--                         where author_id = auth.uid();                  → 0 rows updated (no self-approve)

-- ── post_hearts ──────────────────────────────────────────────────────
-- Anyone can see reaction counts on public posts; authenticated users
-- toggle their OWN heart (insert/delete) on approved posts only.

create policy "post_hearts: visible on approved posts"
  on public.post_hearts for select
  to anon, authenticated
  using (public.post_is_approved(post_id));

create policy "post_hearts: staff read all"
  on public.post_hearts for select
  to authenticated
  using (public.is_staff());

create policy "post_hearts: heart as self"
  on public.post_hearts for insert
  to authenticated
  with check (user_id = auth.uid() and public.post_is_approved(post_id));

create policy "post_hearts: unheart as self"
  on public.post_hearts for delete
  to authenticated
  using (user_id = auth.uid());

-- NEGATIVE TESTS (post_hearts):
--   as anon:            insert into post_hearts values (<post>, <any>);  → ERROR (anon has no insert)
--   as member danielle: insert into post_hearts (post_id, user_id)
--                         values (<approved post>, <marcus>);            → ERROR: RLS violation (forged reactor)
--   as member danielle: insert ... values (<flagged post>, auth.uid());  → ERROR (can't react to held posts)
--   as member danielle: delete from post_hearts where user_id <> auth.uid(); → 0 rows deleted

-- ── comments ─────────────────────────────────────────────────────────
-- Readable wherever the post is publicly readable; authenticated users
-- comment as themselves on approved posts.

create policy "comments: visible on approved posts"
  on public.comments for select
  to anon, authenticated
  using (public.post_is_approved(post_id));

create policy "comments: staff read all"
  on public.comments for select
  to authenticated
  using (public.is_staff());

create policy "comments: comment as self on approved"
  on public.comments for insert
  to authenticated
  with check (author_id = auth.uid() and public.post_is_approved(post_id));

create policy "comments: staff delete"
  on public.comments for delete
  to authenticated
  using (public.is_staff());

-- NEGATIVE TESTS (comments):
--   as anon:            insert into comments ...                         → ERROR (no anon insert)
--   as member danielle: insert into comments (post_id, author_id, body)
--                         values (<pending post>, auth.uid(), 'hi');     → ERROR (post not approved)
--   as member danielle: insert ... (author_id = <marcus>)                → ERROR: RLS violation (forged author)
--   as member danielle: select * from comments where post_id = <flagged post>; → 0 rows

-- ── threads / thread_participants / messages ─────────────────────────
-- Participants only. Staff read (NOT write) — docs/10 §3: mentor↔mentee
-- communication is auditable. Thread creation goes through the
-- get_or_create_thread() RPC below so participants rows are always
-- written consistently.

create policy "threads: participants read"
  on public.threads for select
  to authenticated
  using (public.is_thread_participant(id));

create policy "threads: staff audit read"
  on public.threads for select
  to authenticated
  using (public.is_staff());

create policy "thread_participants: participants read"
  on public.thread_participants for select
  to authenticated
  using (public.is_thread_participant(thread_id));

create policy "thread_participants: staff audit read"
  on public.thread_participants for select
  to authenticated
  using (public.is_staff());

create policy "messages: participants read"
  on public.messages for select
  to authenticated
  using (public.is_thread_participant(thread_id));

create policy "messages: staff audit read"
  on public.messages for select
  to authenticated
  using (public.is_staff());

create policy "messages: participants send as self"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid() and public.is_thread_participant(thread_id));

-- Find-or-create the DM thread between the caller and another user
-- (replaces store.threadBetween). Definer: inserts bypass the absence of
-- user-facing insert policies on threads/thread_participants.
create or replace function public.get_or_create_thread(other uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  t uuid;
begin
  if other is null or other = auth.uid() then
    raise exception 'invalid participant';
  end if;
  -- Only mentor↔mentee pairs get threads (docs/10 §3: no platform-wide DMs).
  if not (
    public.is_staff()
    or exists (select 1 from public.profiles where id = auth.uid() and mentor_id = other)
    or exists (select 1 from public.profiles where id = other and mentor_id = auth.uid())
  ) then
    raise exception 'threads are mentor-mentee only';
  end if;

  select tp.thread_id into t
  from public.thread_participants tp
  join public.thread_participants tp2 on tp2.thread_id = tp.thread_id and tp2.user_id = other
  where tp.user_id = auth.uid()
  limit 1;

  if t is null then
    insert into public.threads default values returning id into t;
    insert into public.thread_participants (thread_id, user_id)
      values (t, auth.uid()), (t, other);
  end if;
  return t;
end;
$$;

revoke execute on function public.get_or_create_thread(uuid) from anon;

-- NEGATIVE TESTS (threads/messages):
--   as member tyrell:   select * from messages
--                         where thread_id = <danielle-marcus thread>;    → 0 rows (third party)
--   as member danielle: insert into messages (thread_id, sender_id, body)
--                         values (<own thread>, <marcus>, 'x');          → ERROR: RLS violation (forged sender)
--   as member danielle: select get_or_create_thread(<tyrell>);           → ERROR (not her mentor — no member↔member DMs)
--   as anon:            select * from threads;                           → 0 rows

-- ── concerns ─────────────────────────────────────────────────────────
-- Mentors raise; staff read/resolve. The MEMBER CONCERNED NEVER SEES IT
-- (quiet by design — app/api/concerns "never surfaces on the member").
-- Mentors do not read back the queue in the app; staff-only read keeps
-- the escalation discreet even from other mentors.

create policy "concerns: mentor raises as self"
  on public.concerns for insert
  to authenticated
  with check (mentor_id = auth.uid() and public.is_mentor() and status = 'open');

create policy "concerns: staff read"
  on public.concerns for select
  to authenticated
  using (public.is_staff());

create policy "concerns: staff resolve"
  on public.concerns for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (concerns):
--   as member danielle: select * from concerns where member_id = auth.uid(); → 0 rows (NEVER visible to the member)
--   as member danielle: insert into concerns (mentor_id, member_id)
--                         values (auth.uid(), <tyrell>);                 → ERROR (members can't raise concerns)
--   as mentor marcus:   select * from concerns;                          → 0 rows (write-only for mentors; staff read)
--   as mentor marcus:   update concerns set status='resolved' where mentor_id=auth.uid(); → 0 rows updated

-- ── mentor_applications ──────────────────────────────────────────────
-- The marketing-site form posts without auth → anon insert (status must
-- be 'new'); staff read + advance status.

create policy "mentor_applications: public apply"
  on public.mentor_applications for insert
  to anon, authenticated
  with check (status = 'new');

create policy "mentor_applications: staff read"
  on public.mentor_applications for select
  to authenticated
  using (public.is_staff());

create policy "mentor_applications: staff update"
  on public.mentor_applications for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- NEGATIVE TESTS (mentor_applications):
--   as anon:            select * from mentor_applications;               → 0 rows (write-only drop box)
--   as anon:            insert ... (status = 'approved')                 → ERROR (can't self-approve)
--   as mentor marcus:   select * from mentor_applications;               → 0 rows (staff only)

-- ── sessions ─────────────────────────────────────────────────────────
-- Mentor: own sessions (log + review); staff: all. Members never see
-- session notes (supportive-not-clinical, but still mentor/staff-side —
-- docs/03: "notes visible to mentor + staff, NOT public").

create policy "sessions: mentor reads own"
  on public.sessions for select
  to authenticated
  using (mentor_id = auth.uid());

create policy "sessions: staff read"
  on public.sessions for select
  to authenticated
  using (public.is_staff());

create policy "sessions: mentor logs own with own mentee"
  on public.sessions for insert
  to authenticated
  with check (
    mentor_id = auth.uid()
    and public.is_mentor()
    and (public.is_mentor_of(member_id) or public.is_staff())
  );

-- NEGATIVE TESTS (sessions):
--   as member danielle: select * from sessions where member_id = auth.uid(); → 0 rows
--   as mentor marcus:   select * from sessions where mentor_id <> auth.uid(); → 0 rows
--   as mentor marcus:   insert ... (mentor_id = auth.uid(), member_id = <not his mentee>) → ERROR
--   as mentor marcus:   insert ... (mentor_id = <alicia>, ...)           → ERROR: RLS violation (forged mentor)

-- ── courses / enrollments ────────────────────────────────────────────
-- Courses: any signed-in user (Learn tab). Enrollments: own + staff;
-- lesson completion writes go through the RPC pattern (or service role)
-- so points/streak/level on profiles stay server-computed — a plain
-- self-insert/update is still allowed for the enrollment row itself,
-- which holds no reward state.

create policy "courses: authenticated read"
  on public.courses for select
  to authenticated
  using (true);

create policy "courses: staff manage"
  on public.courses for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "enrollments: read own"
  on public.enrollments for select
  to authenticated
  using (member_id = auth.uid());

create policy "enrollments: staff read"
  on public.enrollments for select
  to authenticated
  using (public.is_staff());

create policy "enrollments: enroll self"
  on public.enrollments for insert
  to authenticated
  with check (member_id = auth.uid());

create policy "enrollments: progress own"
  on public.enrollments for update
  to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- NEGATIVE TESTS (enrollments):
--   as anon:            select * from courses;                           → 0 rows (sign-in required, matches /api/courses 401)
--   as member danielle: select * from enrollments where member_id <> auth.uid(); → 0 rows
--   as member danielle: insert into enrollments (member_id, course_id)
--                         values (<tyrell>, <course>);                   → ERROR: RLS violation
--   as member danielle: update profiles set points = 99999 ...           → 0 rows (reward state is not on enrollments)

-- ── newsletter_subscribers ───────────────────────────────────────────
-- Public write-only drop box; staff read for export. The unique index on
-- lower(email) gives the 409-on-duplicate behavior.

create policy "newsletter: public subscribe"
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (true);

create policy "newsletter: staff read"
  on public.newsletter_subscribers for select
  to authenticated
  using (public.is_staff());

-- NEGATIVE TESTS (newsletter_subscribers):
--   as anon:            select * from newsletter_subscribers;            → 0 rows (no email harvesting)
--   as member danielle: select * from newsletter_subscribers;            → 0 rows
--   as anon:            insert same email twice                          → second ERROR: duplicate key (unique lower(email))
