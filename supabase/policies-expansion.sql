-- =====================================================================
-- My Struggle — Row Level Security, EXPANSION (v2)
-- =====================================================================
-- Implements docs/10-COMPLIANCE.md as database policy for the tables in
-- schema-expansion.sql. Run AFTER schema.sql, schema-expansion.sql, and
-- policies.sql (which defines is_staff() / is_mentor() / is_mentor_of()).
--
-- PRINCIPLES (docs/10):
--   * RLS ENABLED ON EVERY NEW TABLE — no exceptions.
--   * Members own their own rows.
--   * A CENTER sees a member's CONTINUUM data ONLY via an active,
--     revocable consent_grant to that center (the has_active_consent()
--     gate below). Revocation is immediate — an inactive grant fails the
--     predicate on the very next query.
--   * Crisis-flagged / held care messages are NOT broadly readable
--     (sender + owning-center staff only).
--   * Advertiser / licensed-research reads are AGGREGATE-ONLY and cannot
--     select identifiable columns (placement_events has no member-level
--     select policy for a center; the de-identified plane lives in
--     outcomes-analytics.sql with k>=11 suppression).
--   * BARC self-checks + private career data are self-scoped, never public.
--
-- Each section ends with NEGATIVE TEST comments — runnable patterns for
-- the policy test suite (AUTOPILOT: RLS items require negative tests).
-- =====================================================================

-- ── helper predicates ────────────────────────────────────────────────
-- SECURITY DEFINER so they read profiles/consent without recursing into
-- those tables' own RLS. They only ever reveal facts keyed to auth.uid().

-- The caller's own center (staff/mentor affiliation). NULL for members or
-- platform-only staff. Used to scope every center-plane continuum read.
create or replace function public.caller_center()
returns uuid
language sql stable security definer set search_path = public
as $$
  select center_id from public.profiles where id = auth.uid();
$$;

-- TRUE when `member` has an ACTIVE (unrevoked) continuum consent grant to
-- `center`. THE center-plane gate. Revocation is immediate: revoked_at
-- being set flips this to false on the next evaluation.
create or replace function public.has_active_consent(member uuid, center uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select center is not null and exists (
    select 1 from public.consent_grants
    where member_id = member
      and center_id = center
      and scope = 'continuum'
      and revoked_at is null
  );
$$;

-- TRUE when the caller is staff AT the center that owns this member's
-- continuum data AND the member has consented to that center. This single
-- predicate expresses "a center sees a member's continuum data ONLY via an
-- active, revocable consent" for every continuum table.
create or replace function public.staff_has_consent(member uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_staff()
     and public.has_active_consent(member, public.caller_center());
$$;

-- TRUE when the caller is a member of the given circle (co-member reads).
create or replace function public.is_circle_member(c uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.circle_memberships
    where circle_id = c and member_id = auth.uid()
  );
$$;

-- TRUE when the caller may read the given care channel:
--   one_to_one   → the member side, or consented staff of the center
--   program_group→ consented staff of the center, or a member with an
--                  active consent to that center (cohort discussion)
--   announcement → any member with an active consent to that center
create or replace function public.can_read_care_channel(ch uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.care_channels c
    where c.id = ch
      and (
        (c.member_id is not null and c.member_id = auth.uid())
        or (public.is_staff() and c.center_id = public.caller_center())
        or public.has_active_consent(auth.uid(), c.center_id)
      )
  );
$$;

revoke execute on function
  public.has_active_consent(uuid, uuid),
  public.staff_has_consent(uuid),
  public.is_circle_member(uuid),
  public.can_read_care_channel(uuid)
from anon;

-- ── enable RLS everywhere (new tables) ───────────────────────────────

alter table public.profile_details      enable row level security;
alter table public.barc_checks          enable row level security;
alter table public.circles              enable row level security;
alter table public.circle_memberships   enable row level security;
alter table public.recovery_goals       enable row level security;
alter table public.goal_milestones      enable row level security;
alter table public.job_applications     enable row level security;
alter table public.resumes              enable row level security;
alter table public.resume_sections      enable row level security;
alter table public.care_episodes        enable row level security;
alter table public.phase_transitions    enable row level security;
alter table public.continuum_events     enable row level security;
alter table public.care_channels        enable row level security;
alter table public.care_messages        enable row level security;
alter table public.consent_grants       enable row level security;
alter table public.follow_up_checkins   enable row level security;
alter table public.sponsored_placements enable row level security;
alter table public.placement_events     enable row level security;
alter table public.demo_leads           enable row level security;
alter table public.employers            enable row level security;
alter table public.job_posts            enable row level security;

-- =====================================================================
-- COMMUNITY EXPANSION
-- =====================================================================

-- ── profile_details ──────────────────────────────────────────────────
-- Self read/write; staff read; a mentor reads their mentee's details.
-- The PUBLIC projection (rings + milestones when opted in) flows ONLY
-- through the definer view public_profile_details below — never the table.
create policy "profile_details: read own"
  on public.profile_details for select to authenticated using (user_id = auth.uid());
create policy "profile_details: staff read"
  on public.profile_details for select to authenticated using (public.is_staff());
create policy "profile_details: mentor reads mentee"
  on public.profile_details for select to authenticated using (public.is_mentor_of(user_id));
create policy "profile_details: upsert own"
  on public.profile_details for insert to authenticated with check (user_id = auth.uid());
create policy "profile_details: update own"
  on public.profile_details for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Public-safe profile projection: exposes the recovery-capital rings /
-- milestones flag ONLY for members who opted in AND whose giving page is
-- public. No interests/tagline leak unless opted in. anon reads this view,
-- never profile_details directly.
create or replace view public.public_profile_details as
select
  p.slug,
  p.name,
  pd.tagline,
  pd.interests,
  pd.recovery_capital_public,
  pd.show_milestones
from public.profile_details pd
join public.profiles p on p.id = pd.user_id
where p.role = 'member'
  and p.consent_public = true
  and p.slug is not null
  and pd.recovery_capital_public = true;

comment on view public.public_profile_details is
  'Public profile rings/milestones — only for opted-in, consent_public members (docs/10 §1). Revocation is immediate.';

grant select on public.public_profile_details to anon, authenticated;

-- NEGATIVE TESTS (profile_details):
--   as anon:            select * from profile_details;                         → 0 rows
--   as member danielle: select * from profile_details where user_id <> auth.uid(); → 0 rows
--   as anon:            select * from public_profile_details
--                         where slug='andre';                                  → 0 rows (recovery_capital_public=false or consent off)

-- ── barc_checks ──────────────────────────────────────────────────────
-- BARC-10 is warm self-reflection: NEVER public, NEVER clinical. Self
-- read/write only; staff read for supportive follow-up (internal, never a
-- public surface). No mentor read (kept to the member + staff).
create policy "barc_checks: read own"
  on public.barc_checks for select to authenticated using (member_id = auth.uid());
create policy "barc_checks: staff read"
  on public.barc_checks for select to authenticated using (public.is_staff());
create policy "barc_checks: insert own"
  on public.barc_checks for insert to authenticated with check (member_id = auth.uid());

-- NEGATIVE TESTS (barc_checks):
--   as anon:            select * from barc_checks;                             → 0 rows (never public)
--   as member danielle: insert into barc_checks (member_id,...) values (<tyrell>,...); → ERROR: RLS violation
--   as mentor marcus:   select * from barc_checks where member_id=<mentee>;    → 0 rows (member + staff only)

-- ── circles ──────────────────────────────────────────────────────────
-- Any authenticated user browses circles (Community tab); staff manage.
create policy "circles: authenticated read"
  on public.circles for select to authenticated using (true);
create policy "circles: staff manage"
  on public.circles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── circle_memberships ───────────────────────────────────────────────
-- A member joins/leaves circles as themselves; co-members and staff can
-- read the roster of a circle the caller belongs to.
create policy "circle_memberships: read own"
  on public.circle_memberships for select to authenticated using (member_id = auth.uid());
create policy "circle_memberships: co-member reads roster"
  on public.circle_memberships for select to authenticated
  using (public.is_circle_member(circle_id));
create policy "circle_memberships: staff read"
  on public.circle_memberships for select to authenticated using (public.is_staff());
create policy "circle_memberships: join as self"
  on public.circle_memberships for insert to authenticated with check (member_id = auth.uid());
create policy "circle_memberships: leave own"
  on public.circle_memberships for delete to authenticated using (member_id = auth.uid());

-- NEGATIVE TESTS (circles):
--   as anon:            select * from circles;                                 → 0 rows (sign-in required)
--   as member danielle: insert into circle_memberships (circle_id,member_id)
--                         values (<c>, <tyrell>);                              → ERROR: RLS violation (forged member)
--   as member danielle: select * from circle_memberships where member_id<>auth.uid()
--                         and circle_id = <circle she is NOT in>;             → 0 rows

-- ── recovery_goals ───────────────────────────────────────────────────
-- Self owns fully. Read widens with visibility: mentor sees a mentee's
-- goals at visibility 'mentor'|'circle'|'public'; circle co-members see
-- 'circle'|'public'; staff see all. Only the owner writes.
create policy "recovery_goals: read own"
  on public.recovery_goals for select to authenticated using (member_id = auth.uid());
create policy "recovery_goals: staff read"
  on public.recovery_goals for select to authenticated using (public.is_staff());
create policy "recovery_goals: mentor reads shared"
  on public.recovery_goals for select to authenticated
  using (public.is_mentor_of(member_id) and visibility in ('mentor','circle','public'));
create policy "recovery_goals: owner writes"
  on public.recovery_goals for insert to authenticated with check (member_id = auth.uid());
create policy "recovery_goals: owner updates"
  on public.recovery_goals for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "recovery_goals: owner deletes"
  on public.recovery_goals for delete to authenticated using (member_id = auth.uid());

-- ── goal_milestones ──────────────────────────────────────────────────
-- Access follows the parent goal's owner; staff read all. (Owner-scoped
-- via an EXISTS on recovery_goals — no direct member_id column here.)
create policy "goal_milestones: owner reads"
  on public.goal_milestones for select to authenticated
  using (exists (select 1 from public.recovery_goals g
                 where g.id = goal_id and g.member_id = auth.uid()));
create policy "goal_milestones: staff read"
  on public.goal_milestones for select to authenticated using (public.is_staff());
create policy "goal_milestones: owner writes"
  on public.goal_milestones for insert to authenticated
  with check (exists (select 1 from public.recovery_goals g
                      where g.id = goal_id and g.member_id = auth.uid()));
create policy "goal_milestones: owner updates"
  on public.goal_milestones for update to authenticated
  using (exists (select 1 from public.recovery_goals g
                 where g.id = goal_id and g.member_id = auth.uid()))
  with check (exists (select 1 from public.recovery_goals g
                      where g.id = goal_id and g.member_id = auth.uid()));
create policy "goal_milestones: owner deletes"
  on public.goal_milestones for delete to authenticated
  using (exists (select 1 from public.recovery_goals g
                 where g.id = goal_id and g.member_id = auth.uid()));

-- NEGATIVE TESTS (recovery_goals / goal_milestones):
--   as member danielle: select * from recovery_goals where member_id<>auth.uid()
--                         and visibility='private';                            → 0 rows
--   as mentor marcus:   select * from recovery_goals
--                         where member_id=<mentee> and visibility='private';   → 0 rows (private stays private)
--   as member danielle: insert into recovery_goals (member_id,...) values (<tyrell>,...); → ERROR: RLS violation
--   as member danielle: insert into goal_milestones (goal_id,...)
--                         values (<tyrell's goal>,...);                        → ERROR (not her goal)

-- ── job_applications ─────────────────────────────────────────────────
-- Private career tracker: self + staff only (no mentor / no public).
create policy "job_applications: read own"
  on public.job_applications for select to authenticated using (member_id = auth.uid());
create policy "job_applications: staff read"
  on public.job_applications for select to authenticated using (public.is_staff());
create policy "job_applications: owner writes"
  on public.job_applications for insert to authenticated with check (member_id = auth.uid());
create policy "job_applications: owner updates"
  on public.job_applications for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "job_applications: owner deletes"
  on public.job_applications for delete to authenticated using (member_id = auth.uid());

-- ── resumes / resume_sections ────────────────────────────────────────
-- Self + staff. resume_sections follow the parent resume's owner.
create policy "resumes: read own"
  on public.resumes for select to authenticated using (member_id = auth.uid());
create policy "resumes: staff read"
  on public.resumes for select to authenticated using (public.is_staff());
create policy "resumes: owner writes"
  on public.resumes for insert to authenticated with check (member_id = auth.uid());
create policy "resumes: owner updates"
  on public.resumes for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "resumes: owner deletes"
  on public.resumes for delete to authenticated using (member_id = auth.uid());

create policy "resume_sections: owner reads"
  on public.resume_sections for select to authenticated
  using (exists (select 1 from public.resumes r
                 where r.id = resume_id and r.member_id = auth.uid()));
create policy "resume_sections: staff read"
  on public.resume_sections for select to authenticated using (public.is_staff());
create policy "resume_sections: owner writes"
  on public.resume_sections for insert to authenticated
  with check (exists (select 1 from public.resumes r
                      where r.id = resume_id and r.member_id = auth.uid()));
create policy "resume_sections: owner updates"
  on public.resume_sections for update to authenticated
  using (exists (select 1 from public.resumes r
                 where r.id = resume_id and r.member_id = auth.uid()))
  with check (exists (select 1 from public.resumes r
                      where r.id = resume_id and r.member_id = auth.uid()));
create policy "resume_sections: owner deletes"
  on public.resume_sections for delete to authenticated
  using (exists (select 1 from public.resumes r
                 where r.id = resume_id and r.member_id = auth.uid()));

-- NEGATIVE TESTS (job_applications / resumes):
--   as anon:            select * from job_applications;                       → 0 rows
--   as anon:            select * from resumes;                                → 0 rows (never public)
--   as member danielle: select * from resumes where member_id<>auth.uid();    → 0 rows
--   as member danielle: insert into resume_sections (resume_id,...)
--                         values (<tyrell's resume>,...);                     → ERROR: RLS violation

-- =====================================================================
-- CONTINUUM OF CARE  — consent is the gate on every center-plane read.
-- =====================================================================

-- ── care_episodes ────────────────────────────────────────────────────
-- Member reads own. A center (staff) reads a member's episode ONLY when
-- the episode is at their center AND the member has an active consent to
-- that center (staff_has_consent). Phase/LOC advances are staff writes
-- under the same consent gate; the member does not self-edit clinical
-- phase. Cross-center staff, and staff without consent, see nothing.
create policy "care_episodes: member reads own"
  on public.care_episodes for select to authenticated using (member_id = auth.uid());
create policy "care_episodes: consented center reads"
  on public.care_episodes for select to authenticated
  using (center_id = public.caller_center() and public.staff_has_consent(member_id));
create policy "care_episodes: consented center writes"
  on public.care_episodes for insert to authenticated
  with check (center_id = public.caller_center() and public.staff_has_consent(member_id));
create policy "care_episodes: consented center updates"
  on public.care_episodes for update to authenticated
  using (center_id = public.caller_center() and public.staff_has_consent(member_id))
  with check (center_id = public.caller_center() and public.staff_has_consent(member_id));

-- ── phase_transitions ────────────────────────────────────────────────
-- Append-only log. Readable by anyone who can read the parent episode
-- (member self OR consented center). Insert by consented center staff or
-- the member's own actions (changed_by = self); NO update / NO delete
-- policy → the log cannot be rewritten.
create policy "phase_transitions: read via episode"
  on public.phase_transitions for select to authenticated
  using (exists (
    select 1 from public.care_episodes e
    where e.id = episode_id
      and (e.member_id = auth.uid()
           or (e.center_id = public.caller_center() and public.staff_has_consent(e.member_id)))
  ));
create policy "phase_transitions: append via episode"
  on public.phase_transitions for insert to authenticated
  with check (
    changed_by = auth.uid()
    and exists (
      select 1 from public.care_episodes e
      where e.id = episode_id
        and (e.member_id = auth.uid()
             or (e.center_id = public.caller_center() and public.staff_has_consent(e.member_id)))
    )
  );

-- ── continuum_events ─────────────────────────────────────────────────
-- The heartbeat has a SINGLE write path: the emit hook / service role
-- (like donations, there is deliberately NO user-facing insert policy).
-- Read: the member (own timeline) + consented center staff. The
-- de-identified licensed plane (outcomes-analytics.sql) reads these under
-- the matview owner, never through these policies.
create policy "continuum_events: member reads own"
  on public.continuum_events for select to authenticated using (member_id = auth.uid());
create policy "continuum_events: consented center reads"
  on public.continuum_events for select to authenticated
  using (public.staff_has_consent(member_id)
         and exists (select 1 from public.care_episodes e
                     where e.member_id = continuum_events.member_id
                       and e.center_id = public.caller_center()));

-- ── care_channels ────────────────────────────────────────────────────
-- Read gated by can_read_care_channel() (member side / consented staff /
-- consented member of the center). Center staff of the owning center
-- create and manage channels; members do not create care channels.
create policy "care_channels: read if permitted"
  on public.care_channels for select to authenticated
  using (public.can_read_care_channel(id));
create policy "care_channels: owning center manages"
  on public.care_channels for all to authenticated
  using (public.is_staff() and center_id = public.caller_center())
  with check (public.is_staff() and center_id = public.caller_center());

-- ── care_messages ────────────────────────────────────────────────────
-- Readable when the caller can read the channel AND the message is either
-- approved OR authored by the caller OR the caller is owning-center staff.
-- A 'flagged' (held / crisis) message is therefore NOT broadly readable —
-- only its sender and the center staff see it until moderation clears it.
-- Send as self into a channel you may read.
create policy "care_messages: read visible in channel"
  on public.care_messages for select to authenticated
  using (
    public.can_read_care_channel(channel_id)
    and (
      moderation_status = 'approved'
      or sender_id = auth.uid()
      or exists (select 1 from public.care_channels c
                 where c.id = channel_id
                   and public.is_staff() and c.center_id = public.caller_center())
    )
  );
create policy "care_messages: send as self"
  on public.care_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_read_care_channel(channel_id));
create policy "care_messages: owning-center staff moderate"
  on public.care_messages for update to authenticated
  using (exists (select 1 from public.care_channels c
                 where c.id = channel_id
                   and public.is_staff() and c.center_id = public.caller_center()))
  with check (exists (select 1 from public.care_channels c
                      where c.id = channel_id
                        and public.is_staff() and c.center_id = public.caller_center()));

-- ── consent_grants ───────────────────────────────────────────────────
-- The member OWNS consent: grants and revokes their OWN rows. The center
-- reads grants naming their center (to know who consented). Revoke = the
-- member updates revoked_at on their own row; access dies immediately
-- (has_active_consent flips false). No one grants on a member's behalf.
create policy "consent_grants: member reads own"
  on public.consent_grants for select to authenticated using (member_id = auth.uid());
create policy "consent_grants: center reads grants to it"
  on public.consent_grants for select to authenticated
  using (public.is_staff() and center_id = public.caller_center());
create policy "consent_grants: member grants own"
  on public.consent_grants for insert to authenticated
  with check (member_id = auth.uid() and revoked_at is null);
create policy "consent_grants: member revokes own"
  on public.consent_grants for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ── follow_up_checkins ───────────────────────────────────────────────
-- Member reads/completes own; consented center staff read/schedule for
-- their center. Same consent gate as the rest of the continuum.
create policy "follow_up_checkins: member reads own"
  on public.follow_up_checkins for select to authenticated using (member_id = auth.uid());
create policy "follow_up_checkins: consented center reads"
  on public.follow_up_checkins for select to authenticated
  using (center_id = public.caller_center() and public.staff_has_consent(member_id));
create policy "follow_up_checkins: member completes own"
  on public.follow_up_checkins for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "follow_up_checkins: consented center schedules"
  on public.follow_up_checkins for insert to authenticated
  with check (center_id = public.caller_center() and public.staff_has_consent(member_id));

-- NEGATIVE TESTS (continuum — the consent gate):
--   as anon:              select * from care_episodes;                        → 0 rows
--   as member danielle:   select * from continuum_events where member_id<>auth.uid(); → 0 rows
--   as staff (center X, NO consent from danielle):
--                         select * from care_episodes where member_id=<danielle>;     → 0 rows
--   grant: (as danielle) insert into consent_grants(member_id,center_id) values(auth.uid(),X);
--   as staff (center X):  select * from care_episodes where member_id=<danielle>;     → now visible
--   revoke: (as danielle) update consent_grants set revoked_at=now() where ...;
--   as staff (center X):  select * from care_episodes where member_id=<danielle>;     → 0 rows again (immediate)
--   as staff (center Y ≠ episode center): ... → 0 rows even WITH a consent to X (center match required)
--   as member tyrell:     select * from care_messages
--                           where channel_id=<flagged msg's channel> and moderation_status='flagged'
--                           and sender_id<>auth.uid();                        → 0 rows (held msg not broadly readable)
--   as member danielle:   insert into continuum_events (...);                 → ERROR (no user insert path; service role only)

-- =====================================================================
-- COMMUNITY AD PRODUCT  — advertiser reads are aggregate-only.
-- =====================================================================

-- ── sponsored_placements ─────────────────────────────────────────────
-- Members / anon see ONLY running placements (served in-feed). The buying
-- center manages its OWN placements (any status). Platform staff (ms_admin)
-- review/approve everything. A center cannot see another center's drafts.
create policy "sponsored_placements: running are visible"
  on public.sponsored_placements for select to anon, authenticated
  using (status = 'running');
create policy "sponsored_placements: center manages own"
  on public.sponsored_placements for all to authenticated
  using (public.is_staff() and org_id = public.caller_center())
  with check (public.is_staff() and org_id = public.caller_center());
create policy "sponsored_placements: platform staff review all"
  on public.sponsored_placements for select to authenticated using (public.is_staff());
create policy "sponsored_placements: platform staff moderate"
  on public.sponsored_placements for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── placement_events ─────────────────────────────────────────────────
-- The trust boundary. member_id is server-side only. A member records
-- their OWN interaction (impression/click/dismiss/report). There is NO
-- per-member SELECT policy for a center — advertisers get counts ONLY via
-- the placement_stats() definer RPC below, which never returns member_id.
-- Only platform staff may read raw rows.
create policy "placement_events: record own interaction"
  on public.placement_events for insert to authenticated
  with check (member_id = auth.uid());
create policy "placement_events: platform staff read raw"
  on public.placement_events for select to authenticated using (public.is_staff());

-- Aggregate-only stats for a center's own placements. Returns COUNTS by
-- kind — never a member_id. SECURITY DEFINER so it can aggregate the
-- otherwise-unreadable table, but it self-checks org ownership first.
create or replace function public.placement_stats(p_placement uuid)
returns table (kind public.placement_event_kind, n bigint)
language sql stable security definer set search_path = public
as $$
  select e.kind, count(*)::bigint
  from public.placement_events e
  join public.sponsored_placements sp on sp.id = e.placement_id
  where e.placement_id = p_placement
    and (
      public.is_staff() and (sp.org_id = public.caller_center() or public.caller_center() is null)
    )
  group by e.kind;
$$;

revoke execute on function public.placement_stats(uuid) from anon;

-- ── demo_leads ───────────────────────────────────────────────────────
-- Public write-only drop box (marketing "For Recovery Centers" form);
-- staff read + advance. status must start 'new'. Mirrors mentor_applications.
create policy "demo_leads: public submit"
  on public.demo_leads for insert to anon, authenticated with check (status = 'new');
create policy "demo_leads: staff read"
  on public.demo_leads for select to authenticated using (public.is_staff());
create policy "demo_leads: staff update"
  on public.demo_leads for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- NEGATIVE TESTS (ad product):
--   as anon:            select * from sponsored_placements where status<>'running'; → 0 rows (only live ads)
--   as center-staff(X): select * from sponsored_placements where org_id<>X;         → 0 rows... unless platform staff (review)
--   as center-staff(X): select member_id from placement_events;                     → 0 rows (no per-member select)
--   as center-staff(X): select * from placement_stats(<own placement>);             → counts by kind, NO member_id
--   as center-staff(X): select * from placement_stats(<other center's placement>);  → 0 rows (org check)
--   as anon:            select * from demo_leads;                                    → 0 rows (write-only)
--   as anon:            insert into demo_leads (...,status) values (...,'closed');   → ERROR (must start 'new')

-- =====================================================================
-- EMPLOYERS + JOB POSTS (OPTIONAL / PROVISIONAL) — see schema-expansion §4
-- =====================================================================
-- Minimal, decoupled-from-auth policies matching the provisional standalone
-- tables. Public reads open jobs; platform staff manage both. The employer
-- self-service model (employer = profiles.role 'employer') is an open
-- decision (docs/13 §Decisions still needed); revisit these policies then.
create policy "employers: authenticated read"
  on public.employers for select to authenticated using (true);
create policy "employers: staff manage"
  on public.employers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "job_posts: open are public"
  on public.job_posts for select to anon, authenticated using (status = 'open');
create policy "job_posts: staff read all"
  on public.job_posts for select to authenticated using (public.is_staff());
create policy "job_posts: staff manage"
  on public.job_posts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
