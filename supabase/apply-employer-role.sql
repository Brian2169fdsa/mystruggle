-- =====================================================================
-- My Struggle — RECONCILIATION: employer = a User with role 'employer'
-- =====================================================================
-- Implements the LOCKED product decision (docs/13 §Decisions): an employer
-- is NOT a standalone `employers` row — it is a `profiles` account with
-- role = 'employer' and a `company` field, and every JobPost.employerId
-- keys to that user id. This supersedes schema-expansion.sql §4 (the
-- provisional standalone `employers` table) and the placeholder job_posts
-- policies in policies-expansion.sql.
--
-- ─────────────────────────────────────────────────────────────────────
-- RUN ORDER — THIS FILE RUNS LAST.
-- ─────────────────────────────────────────────────────────────────────
-- It must run AFTER schema-expansion.sql (which CREATES `employers` +
-- `job_posts`) AND AFTER policies-expansion.sql (which CREATES the RLS
-- policies on `employers` + `job_posts`). Running it earlier would fail:
-- policies-expansion.sql would later try to enable RLS / create policies
-- on an `employers` table this file has already dropped, and would collide
-- with the job_posts policies this file replaces. As a reconciliation
-- migration that supersedes objects defined by the base package, LAST is
-- the correct position. Full validated sequence:
--
--   schema.sql -> schema-expansion.sql -> schema-run9-10.sql
--   -> policies.sql -> policies-expansion.sql -> policies-run9-10.sql
--   -> apply-employer-role.sql   (this file)
--
-- ─────────────────────────────────────────────────────────────────────
-- TRANSACTION NOTE — DO NOT wrap this file in a single transaction.
-- ─────────────────────────────────────────────────────────────────────
-- Step 1 (`alter type ... add value`) cannot be used in the SAME
-- transaction that adds it, and later steps DO use 'employer'::user_role.
-- Run with psql WITHOUT `--single-transaction` (the default `psql -f`
-- autocommits each statement), or run step 1 on its own via `psql -c`.
-- Every step is guarded so re-running is safe.
-- =====================================================================

-- ── 1. add the 'employer' enum value (OUTSIDE a txn block) ────────────
-- Idempotent via IF NOT EXISTS. Must commit before any statement below
-- references 'employer'::public.user_role — hence: not single-transaction.
alter type public.user_role add value if not exists 'employer';

-- ── 2. profiles.company (User.company — the business an employer hires for) ─
alter table public.profiles add column if not exists company text;

comment on column public.profiles.company is
  'Employer accounts (role=''employer'') only: the business they hire for. Set at signup enrichment; NULL for members/mentors/staff.';

-- ── 3. repoint job_posts.employer_id at profiles(id) ──────────────────
-- Was references public.employers(id); now the posting user's profile id.
-- Drop-if-exists + re-add makes this re-runnable (constraint name is stable).
do $$
begin
  if to_regclass('public.job_posts') is not null then
    alter table public.job_posts drop constraint if exists job_posts_employer_id_fkey;
    alter table public.job_posts
      add constraint job_posts_employer_id_fkey
      foreign key (employer_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- ── 4. drop the standalone employers table + its policies ─────────────
-- CASCADE removes the RLS policies policies-expansion.sql created on it
-- (and any remaining dependents). job_posts no longer references it (step 3).
drop table if exists public.employers cascade;

-- ── 5. employer self-service helper (mirrors is_staff()) ──────────────
-- SECURITY DEFINER so it reads profiles without recursing into its RLS.
create or replace function public.is_employer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'employer'
  );
$$;

revoke execute on function public.is_employer() from anon;

-- ── 6. tighten job_posts RLS to owner-scoped writes ───────────────────
-- Replace the placeholder policies from policies-expansion.sql §Employers.
-- Public reads OPEN jobs (fair-chance board); the owning employer manages
-- ONLY their own posts (employer_id = me AND role = 'employer'); the
-- employer reads their own posts in any status; platform staff read all.
alter table public.job_posts enable row level security;

drop policy if exists "job_posts: open are public"  on public.job_posts;
drop policy if exists "job_posts: staff read all"    on public.job_posts;
drop policy if exists "job_posts: staff manage"      on public.job_posts;

drop policy if exists "job_posts: open are public read"  on public.job_posts;
drop policy if exists "job_posts: employer reads own"    on public.job_posts;
drop policy if exists "job_posts: platform staff read"   on public.job_posts;
drop policy if exists "job_posts: employer manages own"  on public.job_posts;

create policy "job_posts: open are public read"
  on public.job_posts for select to anon, authenticated
  using (status = 'open');
create policy "job_posts: employer reads own"
  on public.job_posts for select to authenticated
  using (employer_id = auth.uid());
create policy "job_posts: platform staff read"
  on public.job_posts for select to authenticated
  using (public.is_staff());
create policy "job_posts: employer manages own"
  on public.job_posts for all to authenticated
  using (employer_id = auth.uid() and public.is_employer())
  with check (employer_id = auth.uid() and public.is_employer());

-- NEGATIVE TESTS (employer model):
--   as anon:              select * from job_posts where status<>'open';        → 0 rows (only open jobs public)
--   as member danielle:   insert into job_posts (employer_id,...) values (auth.uid(),...); → ERROR (not an employer)
--   as employer acme:     insert ... (employer_id = <other employer>, ...);    → ERROR: RLS violation (forged owner)
--   as employer acme:     update job_posts set status='closed' where employer_id<>auth.uid(); → 0 rows updated
--   (schema) select 'employer'::public.user_role;                              → ok (enum value present)
--   (schema) select 1 from employers;                                         → ERROR: relation does not exist (dropped)
