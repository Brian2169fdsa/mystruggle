-- =====================================================================
-- My Struggle — Outcomes Data Product (v2): the two-plane analytics layer
-- =====================================================================
-- SQL realization of app/api/outcomes/compute.ts. Run AFTER
-- schema-expansion.sql + policies-expansion.sql. The three materialized
-- views the funder trusts — mv_continuum_score / mv_care_outcomes /
-- mv_efficacy — are computed ONCE here so the API and CSV export stay in
-- lockstep with the database, exactly as compute.ts is the one place today.
--
-- THE TWO PLANES (the P0 trust boundary — docs/10 §1, §5–6):
--
--   analytics.*  IDENTIFIED CENTER PLANE. Per-member rows carrying member
--                identity. Reachable ONLY by the member (own row) or by
--                consented, same-center staff — enforced because the center
--                plane reads through a security_invoker VIEW over the RLS'd
--                base tables (the consent gate in policies-expansion.sql
--                applies to the caller). NOT suppressed: single center,
--                consented, identified.
--
--   licensed.*   DE-IDENTIFIED LICENSED PLANE. ONLY aggregate counters. The
--                matviews here select NO name / member_number / slug / user
--                id — they GROUP the identified frame down to distributions
--                and rates, so an identifiable value is unreachable by
--                construction, not by review. A dedicated `licensed_research`
--                role is granted these three matviews and NOTHING else (no
--                base tables, no analytics schema). Every cohort is
--                small-cell suppressed at k >= 11.
--
-- k >= 11 MINIMUM-COHORT SUPPRESSION (the rule, enforced in SQL): any
-- group whose distinct-member count < 11 has its value returned NULL. This
-- is applied PER CELL — every bucket, edge, LOC, horizon and quartile is
-- itself a cohort, so a 1..10-member cell is nulled the same way. The raw
-- cohort size `n` is kept beside each value so a reader can see WHY a cell
-- is suppressed, but never the underlying members.
--
-- Score parity with compute.ts: score = round(100 * raw / (raw + 40)),
-- raw = summed continuum_event weights in the trailing 90 days measured
-- from the latest recorded event (ref_now), NOT the wall clock — the seed
-- hangs off a fixed epoch (same anchor as /api/continuum).
-- =====================================================================

create schema if not exists analytics;
create schema if not exists licensed;

comment on schema analytics is
  'Identified center plane — per-member outcome frame. Consent-gated via base-table RLS; never granted to licensed_research.';
comment on schema licensed is
  'De-identified licensed plane — aggregate-only, k>=11 suppressed. The ONLY schema the licensed_research role may read.';

-- The de-identification minimum cohort size (compute.ts MIN_COHORT).
create or replace function analytics.min_cohort() returns int
  language sql immutable as $$ select 11 $$;

-- Reporting anchor: the latest recorded continuum event, or now() if none
-- (compute.ts refNow). Stable so seed data windows correctly.
create or replace function analytics.ref_now() returns timestamptz
  language sql stable security definer set search_path = public as $$
  select coalesce(max(occurred_at), now()) from public.continuum_events;
$$;

-- Saturating engagement score for one member at a reference time
-- (compute.ts SCORE_K = 40, 90-day window). SINGLE source of truth so the
-- center view and the licensed matviews cannot drift.
create or replace function analytics.engagement_score(p_member uuid, p_ref timestamptz)
returns int language sql stable security definer set search_path = public as $$
  select round(100.0 * raw / (raw + 40))::int
  from (
    select coalesce(sum(weight), 0)::numeric as raw
    from public.continuum_events
    where member_id = p_member
      and occurred_at >= p_ref - interval '90 days'
  ) s;
$$;

-- ── analytics.member_outcome_all (identified global frame) ───────────
-- The MemberOutcome frame of compute.ts, per member, for the WHOLE
-- platform. Carries member_id/center_id — IDENTIFIED. It is the private
-- input the licensed aggregates are grouped from (the matview refresh runs
-- as its owner, which is how global aggregation happens); it is NEVER
-- exposed to the licensed_research role or to a center directly. Center
-- staff use the consent-gated view below, not this matview.
create materialized view analytics.member_outcome_all as
with latest as (
  -- latest care episode per member (the outcomes population = members with
  -- at least one episode), member role only.
  select distinct on (ce.member_id)
    ce.member_id, ce.id as episode_id, ce.center_id, ce.care_phase,
    ce.level_of_care, ce.started_at, ce.ended_at, ce.discharge_type
  from public.care_episodes ce
  join public.profiles p on p.id = ce.member_id and p.role = 'member'
  order by ce.member_id, ce.started_at desc
),
goals as (
  select member_id, count(*)::int as goals_achieved
  from public.recovery_goals
  where status = 'achieved'
  group by member_id
)
select
  l.member_id,
  l.episode_id,
  l.center_id,
  l.care_phase,
  l.level_of_care,
  l.started_at,
  l.ended_at,
  l.discharge_type,
  analytics.engagement_score(l.member_id, analytics.ref_now()) as score,
  coalesce(g.goals_achieved, 0) as goals_achieved
from latest l
left join goals g on g.member_id = l.member_id;

create unique index member_outcome_all_pk on analytics.member_outcome_all (member_id);

comment on materialized view analytics.member_outcome_all is
  'IDENTIFIED per-member frame for the whole platform. Private input to the licensed aggregates; not granted to licensed_research or centers.';

-- ── analytics.center_member_outcome (identified CENTER plane) ────────
-- The consent-gated, single-center identified roster a staff member may
-- see (compute.ts buildCenter members[]). security_invoker = true → the
-- consent gate on care_episodes/profiles in policies-expansion.sql applies
-- to the CALLER, so a staff member sees only their own center's consented
-- members, and a member sees only their own row. Recomputes the score from
-- base tables (via the shared function) rather than the private matview, so
-- no un-gated data leaks through.
create view analytics.center_member_outcome
  with (security_invoker = true) as
select
  ce.member_id,
  p.name,                                   -- identified: center plane only
  p.member_number,
  ce.center_id,
  ce.care_phase,
  ce.level_of_care,
  ce.started_at,
  ce.ended_at,
  ce.discharge_type,
  analytics.engagement_score(ce.member_id, analytics.ref_now()) as score,
  (select count(*)::int from public.recovery_goals g
    where g.member_id = ce.member_id and g.status = 'achieved') as goals_achieved
from public.care_episodes ce
join public.profiles p on p.id = ce.member_id and p.role = 'member';

comment on view analytics.center_member_outcome is
  'Identified center-plane roster. security_invoker → base-table RLS (consent + center match) gates every row to the caller. Never suppressed.';

-- =====================================================================
-- LICENSED PLANE — de-identified, aggregate-only, k>=11 suppressed.
-- No matview below selects a name/member_number/slug/member_id.
-- =====================================================================

-- ── licensed.mv_continuum_score (distribution) ───────────────────────
-- compute.ts scoreDistribution: quartile buckets + overall avg/median.
-- One row per engagement bucket plus a summary row (bucket = 'ALL'). Each
-- bucket is a cohort → member_count is NULL when < 11 (small-cell
-- suppression); avg/median on the ALL row are NULL when the population < 11.
create materialized view licensed.mv_continuum_score as
with scored as (
  select
    score,
    case
      when score between 0 and 24 then '0-24 (disengaged)'
      when score between 25 and 49 then '25-49 (emerging)'
      when score between 50 and 74 then '50-74 (engaged)'
      else '75-100 (thriving)'
    end as bucket
  from analytics.member_outcome_all
)
select
  coalesce(bucket, 'ALL') as bucket,
  count(*)::bigint as cohort_n,                        -- raw size (never a person)
  -- k>=11 small-cell suppression, per cell:
  case when count(*) >= analytics.min_cohort() then count(*)::bigint end as member_count,
  case when grouping(bucket) = 1 and count(*) >= analytics.min_cohort()
       then round(avg(score))::int end as avg_score,
  case when grouping(bucket) = 1 and count(*) >= analytics.min_cohort()
       then round(percentile_cont(0.5) within group (order by score))::int end as median_score
from scored
group by grouping sets ((bucket), ());

comment on materialized view licensed.mv_continuum_score is
  'De-identified engagement-score distribution. k>=11 per bucket; avg/median only when population>=11. No identifiable columns.';

-- ── licensed.mv_care_outcomes ────────────────────────────────────────
-- compute.ts careOutcomes, long/tagged format so heterogeneous metrics
-- share one de-identified matview. Every row carries its cohort size `n`
-- and a k>=11-suppressed `value`:
--   phase_transition : from→to edge counts across the append-only log
--   completion_by_loc: discharge 'completed' rate per level of care (%)
--   retention        : retained-in-recovery % at 30/60/90/180/365d post-discharge
--   recovery_capital : engagement-density proxy 0..100, pre → during → post
create materialized view licensed.mv_care_outcomes as
with mo as (
  select * from analytics.member_outcome_all
),
refn as (select analytics.ref_now() as ref_now),

-- (a) phase-transition edge counts (cohort = distinct members on the edge)
trans as (
  select
    coalesce(pt.from_phase::text, 'start') as key_a,
    pt.to_phase::text as key_b,
    count(*)::numeric as raw_value,
    count(distinct ce.member_id) as n
  from public.phase_transitions pt
  join public.care_episodes ce on ce.id = pt.episode_id
  join mo on mo.member_id = ce.member_id
  group by 1, 2
),

-- (b) completion rate by level of care among discharged episodes
loc as (
  select
    mo.level_of_care::text as key_a,
    round(100.0
      * count(*) filter (where mo.discharge_type = 'completed')
      / nullif(count(*) filter (where mo.discharge_type is not null), 0)
    )::numeric as raw_value,
    count(*) filter (where mo.discharge_type is not null) as n
  from mo
  where mo.level_of_care is not null
  group by 1
),

-- (c) retention-in-recovery at each horizon. eligible = discharged members
--     observable that far past discharge; retained = any continuum event on
--     or after ended_at + horizon (compute.ts activity proxy).
horizons(day) as (values (30), (60), (90), (180), (365)),
retn as (
  select
    h.day::text as key_a,
    round(100.0 * count(*) filter (where retained) / nullif(count(*), 0))::numeric as raw_value,
    count(*) as n
  from horizons h
  cross join lateral (
    select
      exists (
        select 1 from public.continuum_events e
        where e.member_id = mo.member_id
          and e.occurred_at >= mo.ended_at + make_interval(days => h.day)
      ) as retained
    from mo, refn
    where mo.ended_at is not null
      and refn.ref_now - mo.ended_at >= make_interval(days => h.day)   -- observable
  ) r
  group by h.day
),

-- (d) recovery-capital proxy: mean weighted-event density (weight/day) in
--     each phase window, mapped through the saturating normalizer
--     capital = round(100 * d / (d + 0.5)) (compute.ts capitalFromDensity).
--     Windows from the append-only transition log per member.
member_density as (
  select
    mo.member_id,
    -- pre window: start → first intake/in_program transition (fallback ended/ref)
    (select coalesce(min(pt.at),
        least(coalesce(mo.ended_at, refn.ref_now), refn.ref_now))
      from public.phase_transitions pt
      where pt.episode_id = mo.episode_id and pt.to_phase in ('intake','in_program')
    ) as pre_end,
    (select min(pt.at) from public.phase_transitions pt
      where pt.episode_id = mo.episode_id and pt.to_phase = 'in_program'
    ) as dur_start,
    mo.started_at,
    coalesce(mo.ended_at, refn.ref_now) as dur_end,
    mo.ended_at,
    refn.ref_now
  from mo, refn
),
density_calc as (
  select
    -- density helper inlined: sum(weight in [from,to)) / max(1 day, span)
    case when md.pre_end > md.started_at then (
      select coalesce(sum(e.weight), 0)::numeric
        / greatest(1, extract(epoch from (md.pre_end - md.started_at)) / 86400.0)
      from public.continuum_events e
      where e.member_id = md.member_id
        and e.occurred_at >= md.started_at and e.occurred_at < md.pre_end
    ) end as pre_d,
    case when md.dur_end > coalesce(md.dur_start, md.pre_end) then (
      select coalesce(sum(e.weight), 0)::numeric
        / greatest(1, extract(epoch from (md.dur_end - coalesce(md.dur_start, md.pre_end))) / 86400.0)
      from public.continuum_events e
      where e.member_id = md.member_id
        and e.occurred_at >= coalesce(md.dur_start, md.pre_end) and e.occurred_at < md.dur_end
    ) end as dur_d,
    case when md.ended_at is not null and md.ref_now > md.ended_at then (
      select coalesce(sum(e.weight), 0)::numeric
        / greatest(1, extract(epoch from (md.ref_now - md.ended_at)) / 86400.0)
      from public.continuum_events e
      where e.member_id = md.member_id
        and e.occurred_at >= md.ended_at and e.occurred_at < md.ref_now
    ) end as post_d
  from member_density md
),
capital as (
  select 'pre'    as key_a, avg(pre_d)  as mean_d, count(pre_d)  as n from density_calc
  union all
  select 'during' as key_a, avg(dur_d)  as mean_d, count(dur_d)  as n from density_calc
  union all
  select 'post'   as key_a, avg(post_d) as mean_d, count(post_d) as n from density_calc
)

select 'phase_transition' as metric, key_a, key_b,
       n::bigint as cohort_n,
       case when n >= analytics.min_cohort() then raw_value end as value
from trans
union all
select 'completion_by_loc', key_a, null::text,
       n::bigint,
       case when n >= analytics.min_cohort() then raw_value end
from loc
union all
select 'retention', key_a, null::text,
       n::bigint,
       case when n >= analytics.min_cohort() then raw_value end
from retn
union all
select 'recovery_capital', key_a, null::text,
       n::bigint,
       case when n >= analytics.min_cohort()
            then round(100.0 * mean_d / (mean_d + 0.5)) end
from capital;

comment on materialized view licensed.mv_care_outcomes is
  'De-identified care outcomes (phase transitions, completion-by-LOC, retention, recovery-capital proxy). k>=11 per row. No identifiable columns.';

-- ── licensed.mv_efficacy ─────────────────────────────────────────────
-- compute.ts efficacy: members bucketed into engagement quartiles; outcome
-- columns per quartile. Illustrative (directional, not a fitted model).
-- Each quartile is a cohort → all values NULL when the quartile has < 11.
create materialized view licensed.mv_efficacy as
with q as (
  select
    member_id, score, ended_at, goals_achieved,
    ntile(4) over (order by score) as quartile
  from analytics.member_outcome_all
),
refn as (select analytics.ref_now() as ref_now),
per_q as (
  select
    q.quartile,
    count(*) as n,
    round(avg(q.score))::int as avg_score,
    round(avg(q.goals_achieved)::numeric, 1) as avg_goals_achieved,
    count(*) filter (
      where q.ended_at is not null
        and (select ref_now from refn) - q.ended_at >= interval '90 days'
    ) as discharged_n,
    count(*) filter (
      where q.ended_at is not null
        and (select ref_now from refn) - q.ended_at >= interval '90 days'
        and exists (
          select 1 from public.continuum_events e
          where e.member_id = q.member_id
            and e.occurred_at >= q.ended_at + interval '90 days'
        )
    ) as retained_90
  from q
  group by q.quartile
)
select
  case quartile when 1 then 'Q1 (lowest)' when 4 then 'Q4 (highest)'
                else 'Q' || quartile end as quartile_label,
  n::bigint as cohort_n,
  case when n >= analytics.min_cohort() then n end as members,
  case when n >= analytics.min_cohort() then avg_score end as avg_score,
  case when n >= analytics.min_cohort() then avg_goals_achieved end as avg_goals_achieved,
  case when discharged_n >= analytics.min_cohort()
       then round(100.0 * retained_90 / nullif(discharged_n, 0))::int end as retention_90_pct
from per_q
order by quartile;

comment on materialized view licensed.mv_efficacy is
  'De-identified engagement-quartile → outcome table. Illustrative, directional. k>=11 per quartile. No identifiable columns.';

-- ── refresh ──────────────────────────────────────────────────────────
-- Refresh order matters: the identified frame first, then the three
-- de-identified aggregates that group it. Schedule via pg_cron / an edge
-- function after continuum writes settle.
create or replace function analytics.refresh_outcomes() returns void
language plpgsql security definer set search_path = public, analytics, licensed as $$
begin
  refresh materialized view analytics.member_outcome_all;
  refresh materialized view licensed.mv_continuum_score;
  refresh materialized view licensed.mv_care_outcomes;
  refresh materialized view licensed.mv_efficacy;
end;
$$;

-- =====================================================================
-- STRUCTURAL SEPARATION — the licensed_research role can read ONLY the
-- de-identified plane, and NOTHING identifiable.
-- =====================================================================
-- A NOLOGIN role a licensing seat's connection/JWT maps into (Supabase:
-- grant to a custom role, or `set role licensed_research` after auth). It
-- is deliberately given USAGE on the `licensed` schema + SELECT on the
-- three aggregate matviews and NOTHING ELSE — no base tables, no
-- `analytics` schema, no `public` continuum tables. A leaked name is
-- therefore impossible by construction: the role literally cannot reference
-- a table that has one.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'licensed_research') then
    create role licensed_research nologin;
  end if;
end
$$;

-- Hard deny everything, then grant back only the de-identified aggregates.
revoke all on all tables    in schema public    from licensed_research;
revoke all on all tables    in schema analytics from licensed_research;
revoke all on all functions in schema analytics from licensed_research;
revoke usage on schema analytics from licensed_research;
revoke usage on schema public   from licensed_research;   -- no base-table reach

grant usage on schema licensed to licensed_research;
grant select on
  licensed.mv_continuum_score,
  licensed.mv_care_outcomes,
  licensed.mv_efficacy
to licensed_research;

-- The identified frame is off-limits to the licensing seat AND to the
-- broad authenticated role (centers use the consent-gated view, not this).
revoke all on analytics.member_outcome_all from anon, authenticated, licensed_research;

-- Center staff / members reach the identified plane ONLY through the
-- security_invoker view (RLS-gated). Aggregates are safe for signed-in
-- staff to read for benchmark context.
grant usage on schema analytics to authenticated;
grant select on analytics.center_member_outcome to authenticated;
grant select on
  licensed.mv_continuum_score,
  licensed.mv_care_outcomes,
  licensed.mv_efficacy
to authenticated;

-- NEGATIVE TESTS (two-plane separation):
--   set role licensed_research;
--     select * from analytics.member_outcome_all;           → ERROR: permission denied
--     select * from public.continuum_events;                → ERROR: permission denied (no base-table reach)
--     select * from analytics.center_member_outcome;        → ERROR: permission denied
--     select member_count from licensed.mv_continuum_score; → OK (aggregate, k>=11 suppressed)
--   k>=11: seed a bucket/LOC/quartile with < 11 members →
--     its member_count / value / avg_score column is NULL, cohort_n shows the real (small) size.
--   center plane consent: as staff of center X with NO active grant from a member →
--     that member is absent from analytics.center_member_outcome (base-table RLS).
--   revoke a grant → the member drops out of center_member_outcome immediately on next query.
