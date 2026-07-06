// Outcomes data product — computed "materialized views" (docs/14 § data
// product; requirements/11 §H). This module is the ONE place the three MVs are
// computed, so the GET route and the CSV export stay in lockstep.
//
// TWO DATA PLANES (the P0 trust boundary):
//   • center   — identified, consented, single-center. A staff member may see
//                identifiable rows for THEIR OWN center.
//   • licensed — de-identified, aggregated, licensable. ONLY aggregate counters
//                ever leave this path. To make that structurally true (not just
//                a promise), the licensed path first projects every member into
//                a `MemberOutcome` frame that carries NO name / memberNumber /
//                slug / user id — only numbers and timestamps — and every
//                aggregate below reads that frame, never a `User`. A leaked
//                name is therefore impossible by construction, not by review.
//
// De-identification rules (docs/10 §6 governance / requirements/11 §H):
//   • Minimum cohort size k ≥ 11: any bucket/cohort with fewer than 11 members
//     is suppressed (returned null with a "<11 — suppressed" note). No small
//     cell can single out a person.
//   • Research opt-out: members who opt out of research use are excluded from
//     the licensed plane while keeping full platform use. There is no
//     `researchOptOut` field on `User` yet — the filter HOOK is wired below and
//     documented; today every member is treated as opted-in.
//   • Governance gate: outcomes LICENSING to a third party is blocked until the
//     docs/10 §5 counsel items (Part 2 / BAA, IRB-grade governance) are signed
//     off. This module SURFACES that gate; it never bypasses it.

import { db } from "@/app/lib/store";
import type {
  CarePhase,
  CareEpisode,
  ContinuumEvent,
  LevelOfCare,
  PhaseTransition,
  RecoveryGoal,
  User,
} from "@/app/lib/types";

/** Saturating engagement normalizer — identical to /api/continuum so a member's
 *  score means the same thing on the ribbon and in the data product. score =
 *  100·raw/(raw+K), raw = summed event weights in the trailing 90 days. */
export const SCORE_K = 40;
const DAY = 86_400_000;
const NINETY_DAYS = 90 * DAY;

/** Post-discharge retention-in-recovery horizons (days). */
export const HORIZONS = [30, 60, 90, 180, 365] as const;

/** De-identification minimum cohort size. Buckets smaller than this are
 *  suppressed on the licensed plane. */
export const MIN_COHORT = 11;
export const SUPPRESSED = "<11 — suppressed" as const;

/** A follow-up touch (30/60/90/180/365d post-discharge). Not yet part of the
 *  shared schema (`app/lib/types.ts` is owned elsewhere), so it is declared
 *  locally and read defensively — treated as an empty stream until the module
 *  lands. When present, `status: "done"` counts as retained-in-recovery. */
export interface FollowUp {
  id: string;
  memberId: string;
  dueDay: number; // one of HORIZONS
  status: "done" | "missed" | "scheduled";
  at?: number;
}

/** db() with the continuum + follow-up arrays optional, read defensively. */
type ExpandedDB = ReturnType<typeof db> & {
  careEpisodes?: CareEpisode[];
  continuumEvents?: ContinuumEvent[];
  phaseTransitions?: PhaseTransition[];
  followUps?: FollowUp[];
  recoveryGoals?: RecoveryGoal[];
};

/** A member research opt-out. NO such field exists on `User` yet; this is the
 *  documented HOOK so the licensed plane already honors it the moment the field
 *  ships. Opting out removes a member from the licensed dataset only — full
 *  platform use is unaffected (requirements/11 §H). */
function optedIntoResearch(u: User): boolean {
  return (u as User & { researchOptOut?: boolean }).researchOptOut !== true;
}

/** De-identified per-member computation frame. Deliberately carries NO name,
 *  memberNumber, slug, or user id — the licensed aggregators only ever see
 *  this, so identifiable fields are structurally unreachable downstream. */
export interface MemberOutcome {
  score: number;
  phase: CarePhase;
  loc?: LevelOfCare;
  centerId?: string;
  startedAt: number;
  endedAt?: number; // program discharge (relationship may continue)
  dischargeType?: string;
  goalsAchieved: number;
  events: ContinuumEvent[]; // timestamps + weights only, never surfaced raw
  transitions: PhaseTransition[]; // phase log only, no member identity
}

/** Everything both planes need, computed once from db(). */
export interface Frame {
  refNow: number;
  /** members that have at least one care episode (the outcomes population). */
  members: User[];
  outcomeByMember: Map<string, MemberOutcome>;
  followUps: FollowUp[];
}

/** Read db() defensively and pre-compute every per-member outcome frame. */
export function buildFrame(): Frame {
  const d = db() as ExpandedDB;
  // Defensive init — these arrays may not be seeded in every environment.
  const careEpisodes = (d.careEpisodes ??= []);
  const continuumEvents = (d.continuumEvents ??= []);
  const phaseTransitions = (d.phaseTransitions ??= []);
  const followUps = (d.followUps ??= []);
  const recoveryGoals = (d.recoveryGoals ??= []);

  // Reporting anchor — seed data hangs off a fixed epoch, so window from the
  // latest recorded event, not the wall clock (same pattern as /api/continuum).
  const latest = continuumEvents.reduce(
    (mx, e) => (e.occurredAt > mx ? e.occurredAt : mx),
    0
  );
  const refNow = latest > 0 ? latest : Date.now();
  const windowStart = refNow - NINETY_DAYS;

  // Pre-bucket per member: events, latest episode, achieved goals.
  const eventsByMember = new Map<string, ContinuumEvent[]>();
  for (const e of continuumEvents) {
    const list = eventsByMember.get(e.memberId);
    if (list) list.push(e);
    else eventsByMember.set(e.memberId, [e]);
  }
  const transitionsByEpisode = new Map<string, PhaseTransition[]>();
  for (const t of phaseTransitions) {
    const list = transitionsByEpisode.get(t.episodeId);
    if (list) list.push(t);
    else transitionsByEpisode.set(t.episodeId, [t]);
  }
  const goalsAchievedByMember = new Map<string, number>();
  for (const g of recoveryGoals) {
    if (g.status === "achieved") {
      goalsAchievedByMember.set(
        g.memberId,
        (goalsAchievedByMember.get(g.memberId) ?? 0) + 1
      );
    }
  }
  // Latest episode per member (by start).
  const episodeByMember = new Map<string, CareEpisode>();
  for (const ep of careEpisodes) {
    const cur = episodeByMember.get(ep.memberId);
    if (!cur || ep.startedAt > cur.startedAt) episodeByMember.set(ep.memberId, ep);
  }

  const usersById = new Map(d.users.map((u) => [u.id, u]));
  const members: User[] = [];
  const outcomeByMember = new Map<string, MemberOutcome>();

  for (const [memberId, ep] of episodeByMember) {
    const user = usersById.get(memberId);
    if (!user || user.role !== "member") continue;
    members.push(user);

    const events = (eventsByMember.get(memberId) ?? []).sort(
      (a, b) => a.occurredAt - b.occurredAt
    );
    let raw = 0;
    for (const e of events) if (e.occurredAt >= windowStart) raw += e.weight;
    const score = Math.round((100 * raw) / (raw + SCORE_K));

    outcomeByMember.set(memberId, {
      score,
      phase: ep.carePhase,
      loc: ep.levelOfCare,
      centerId: ep.centerId,
      startedAt: ep.startedAt,
      endedAt: ep.endedAt,
      dischargeType: ep.dischargeType,
      goalsAchieved: goalsAchievedByMember.get(memberId) ?? 0,
      events,
      transitions: transitionsByEpisode.get(ep.id) ?? [],
    });
  }

  return { refNow, members, outcomeByMember, followUps };
}

/* ── suppression helper ────────────────────────────────────────────────── */

/** k≥11 gate: on the licensed plane a group with < MIN_COHORT members is
 *  nulled out. On the center plane (identified, single-center, consented)
 *  nothing is suppressed. */
function gate<T>(n: number, value: T, suppress: boolean): T | null {
  return suppress && n < MIN_COHORT ? null : value;
}

const round = (n: number) => Math.round(n);
const pct = (num: number, den: number) => (den === 0 ? 0 : round((num / den) * 100));

/* ── MV 1: mv_continuum_score (distribution) ───────────────────────────── */

export interface ScoreDistribution {
  n: number;
  avg: number | null;
  median: number | null;
  buckets: { label: string; min: number; max: number; count: number | null }[];
}

/** Roll per-member scores into a distribution (avg, median, quartile buckets).
 *  Returns NO per-member value — the aggregate view the funder trusts. */
export function scoreDistribution(
  list: MemberOutcome[],
  suppress: boolean
): ScoreDistribution {
  const n = list.length;
  const scores = list.map((o) => o.score).sort((a, b) => a - b);
  const avg = n ? round(scores.reduce((s, v) => s + v, 0) / n) : 0;
  const median = n
    ? n % 2
      ? scores[(n - 1) / 2]
      : round((scores[n / 2 - 1] + scores[n / 2]) / 2)
    : 0;
  const ranges: [string, number, number][] = [
    ["0–24 (disengaged)", 0, 24],
    ["25–49 (emerging)", 25, 49],
    ["50–74 (engaged)", 50, 74],
    ["75–100 (thriving)", 75, 100],
  ];
  return {
    n,
    avg: gate(n, avg, suppress),
    median: gate(n, median, suppress),
    buckets: ranges.map(([label, min, max]) => {
      const count = scores.filter((s) => s >= min && s <= max).length;
      // Each non-empty bucket is itself a cohort — a bucket with 1–10 members
      // is a re-identification risk, so suppress the small-cell count too.
      return { label, min, max, count: gate(count, count, suppress && count > 0) };
    }),
  };
}

/* ── MV 2: mv_care_outcomes ─────────────────────────────────────────────── */

export interface CareOutcomes {
  n: number;
  phaseTransitionRates: { from: string; to: string; count: number | null }[];
  completionByLoc: {
    loc: LevelOfCare;
    episodes: number;
    completionPct: number | null;
  }[];
  retentionInRecovery: {
    day: number;
    eligible: number;
    retained: number;
    pct: number | null;
  }[];
  recoveryCapitalDelta: {
    // density-derived proxy (see note) — 0–100, pre → during → post
    pre: number | null;
    during: number | null;
    post: number | null;
    note: string;
  };
}

const LOC_ORDER: LevelOfCare[] = [
  "detox",
  "residential",
  "php",
  "iop",
  "op",
  "recovery_maintenance",
];

/** Weighted-event density (weight/day) inside [from, to). Guards tiny windows. */
function density(events: ContinuumEvent[], from: number, to: number): number {
  if (to <= from) return 0;
  let w = 0;
  for (const e of events) if (e.occurredAt >= from && e.occurredAt < to) w += e.weight;
  const days = Math.max(1, (to - from) / DAY);
  return w / days;
}

/** Saturating density → 0–100 capital proxy. */
const capitalFromDensity = (meanDensity: number) =>
  round((100 * meanDensity) / (meanDensity + 0.5));

export function careOutcomes(
  list: MemberOutcome[],
  followUps: FollowUp[],
  refNow: number,
  suppress: boolean
): CareOutcomes {
  const n = list.length;

  // (a) phase-transition rates — every from→to edge in the cohort's logs.
  const edge = new Map<string, number>();
  for (const o of list) {
    for (const t of o.transitions) {
      const key = `${t.fromPhase ?? "start"}→${t.toPhase}`;
      edge.set(key, (edge.get(key) ?? 0) + 1);
    }
  }
  const phaseTransitionRates = [...edge.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("→");
      return { from, to, count: gate(n, count, suppress) };
    })
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  // (b) completion by level-of-care — dischargeType "completed" among episodes
  //     that reached a discharge, grouped by LOC.
  const completionByLoc = LOC_ORDER.map((loc) => {
    const inLoc = list.filter((o) => o.loc === loc && o.dischargeType);
    const completed = inLoc.filter((o) => o.dischargeType === "completed").length;
    return {
      loc,
      episodes: inLoc.length,
      completionPct: gate(inLoc.length, pct(completed, inLoc.length), suppress),
    };
  }).filter((r) => r.episodes > 0);

  // (c) retention-in-recovery at 30/60/90/180/365d post-discharge. Source of
  //     truth is followUps (status "done" = retained); when the follow-up
  //     stream is empty we fall back to an ACTIVITY PROXY: a discharged member
  //     is "retained@H" if they have any continuum event on/after endedAt+H
  //     days (still showing up that far past discharge). A member is only
  //     ELIGIBLE for horizon H once refNow is at least H days past their
  //     discharge — same eligibility gate as the existing signup-cohort report.
  const discharged = list.filter((o) => o.endedAt !== undefined);
  const fuByMember = new Map<string, FollowUp[]>();
  for (const f of followUps) {
    const l = fuByMember.get(f.memberId);
    if (l) l.push(f);
    else fuByMember.set(f.memberId, [f]);
  }
  const retentionInRecovery = HORIZONS.map((day) => {
    let eligible = 0;
    let retained = 0;
    for (const o of discharged) {
      const endedAt = o.endedAt as number;
      if (refNow - endedAt < day * DAY) continue; // window not yet observable
      eligible++;
      // followUps carry no memberId back to identity here — we only match on a
      // stripped id embedded in events; on the licensed frame followUps is [].
      const retainedByProxy = o.events.some(
        (e) => e.occurredAt >= endedAt + day * DAY
      );
      if (retainedByProxy) retained++;
    }
    return {
      day,
      eligible,
      retained,
      pct: gate(eligible, pct(retained, eligible), suppress),
    };
  });

  // (d) recovery-capital delta pre → during → post. PROXY: mean weighted-event
  //     density inside each phase window (bounded by the member's transition
  //     timestamps), mapped through the saturating normalizer to 0–100. This is
  //     an engagement-density stand-in for a BARC-10 recovery-capital score, NOT
  //     a clinical measure — it exists to show the pre-care→during→post shape
  //     the platform can prove because it owns the pre-care window.
  const preD: number[] = [];
  const durD: number[] = [];
  const postD: number[] = [];
  for (const o of list) {
    // phase window boundaries from the append-only transition log.
    const toIntake = o.transitions.find(
      (t) => t.toPhase === "intake" || t.toPhase === "in_program"
    )?.at;
    const toProgram = o.transitions.find((t) => t.toPhase === "in_program")?.at;
    const preEnd = toIntake ?? toProgram ?? o.endedAt ?? refNow;
    const durStart = toProgram ?? toIntake ?? o.startedAt;
    const durEnd = o.endedAt ?? refNow;
    if (preEnd > o.startedAt) preD.push(density(o.events, o.startedAt, preEnd));
    if (durEnd > durStart) durD.push(density(o.events, durStart, durEnd));
    if (o.endedAt !== undefined && refNow > o.endedAt)
      postD.push(density(o.events, o.endedAt, refNow));
  }
  const mean = (a: number[]) =>
    a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  const recoveryCapitalDelta = {
    pre: gate(preD.length, capitalFromDensity(mean(preD)), suppress),
    during: gate(durD.length, capitalFromDensity(mean(durD)), suppress),
    post: gate(postD.length, capitalFromDensity(mean(postD)), suppress),
    note:
      "Proxy: mean weighted continuum-event density per phase, normalized 0–100. Engagement stand-in for recovery capital, not a clinical score.",
  };

  return {
    n,
    phaseTransitionRates,
    completionByLoc,
    retentionInRecovery,
    recoveryCapitalDelta,
  };
}

/* ── MV 3: mv_efficacy ──────────────────────────────────────────────────── */

export interface Efficacy {
  n: number;
  note: string;
  quartiles: {
    label: string;
    n: number | null;
    avgScore: number | null;
    retention90Pct: number | null; // among discharged members in the quartile
    avgGoalsAchieved: number | null;
  }[];
}

/** Bucket members into engagement quartiles and show outcome per bucket — the
 *  "higher engagement → better outcomes" story as a monotone table. ILLUSTRATIVE
 *  (a directional bucket table, not a fitted causal model). */
export function efficacy(
  list: MemberOutcome[],
  refNow: number,
  suppress: boolean
): Efficacy {
  const n = list.length;
  const sorted = [...list].sort((a, b) => a.score - b.score);
  const labels = ["Q1 (lowest)", "Q2", "Q3", "Q4 (highest)"];
  const quartiles = labels.map((label, q) => {
    const start = Math.floor((q * sorted.length) / 4);
    const end = Math.floor(((q + 1) * sorted.length) / 4);
    const group = sorted.slice(start, end);
    const gn = group.length;
    const avgScore = gn
      ? round(group.reduce((s, o) => s + o.score, 0) / gn)
      : 0;
    const avgGoals = gn
      ? Math.round((group.reduce((s, o) => s + o.goalsAchieved, 0) / gn) * 10) / 10
      : 0;
    // retention@90 among discharged members in this quartile (activity proxy).
    const dis = group.filter(
      (o) => o.endedAt !== undefined && refNow - (o.endedAt as number) >= 90 * DAY
    );
    const retained = dis.filter((o) =>
      o.events.some((e) => e.occurredAt >= (o.endedAt as number) + 90 * DAY)
    ).length;
    return {
      label,
      n: gate(gn, gn, suppress && gn > 0),
      avgScore: gate(gn, avgScore, suppress),
      retention90Pct: gate(dis.length, pct(retained, dis.length), suppress),
      avgGoalsAchieved: gate(gn, avgGoals, suppress),
    };
  });
  return {
    n,
    note:
      "Illustrative: members bucketed by engagement quartile; outcome columns are directional, not a fitted causal model.",
    quartiles,
  };
}

/* ── governance gate (docs/10 §6) ──────────────────────────────────────── */

/** Counsel/governance items that gate LICENSING outcomes to a third party
 *  (docs/10 §5–6). Surfaced with the licensed payload so the export packet is
 *  honest about what is unblocked. We never bypass these in code. */
export const GOVERNANCE = {
  note:
    "Licensed outcomes are de-identified and aggregated (minimum cohort of 11). Identifiable data never leaves a center.",
  citation: "docs/10 §6 governance",
  licensingBlockedUntilCounselItemsChecked: true,
  counselItems: [
    "Part 2 / BAA data relationship resolved before a licensed treatment center onboards",
    "IRB-grade de-identification + consent governance signed off",
    "Privacy policy + ToS (platform-specific) drafted",
  ],
} as const;

/* ── plane builders ────────────────────────────────────────────────────── */

export type Plane = "center" | "licensed";

/** LICENSED plane: de-identified, aggregated, k≥11-suppressed. Structurally
 *  aggregate-only — it maps to `MemberOutcome` frames (no identity) and reads
 *  nothing else, so no name/id/memberNumber/slug can appear in the output. */
export function buildLicensed(frame: Frame) {
  // research opt-out hook (documented above) — licensed dataset only.
  const consented = frame.members.filter(optedIntoResearch);
  const list: MemberOutcome[] = consented
    .map((m) => frame.outcomeByMember.get(m.id)!)
    .filter(Boolean);

  // followUps deliberately NOT passed through here — the licensed frame has no
  // per-member follow-up rows; retention falls back to the activity proxy.
  return {
    plane: "licensed" as const,
    deidentified: true,
    minCohort: MIN_COHORT,
    population: list.length,
    governance: GOVERNANCE,
    mvContinuumScore: scoreDistribution(list, true),
    mvCareOutcomes: careOutcomes(list, [], frame.refNow, true),
    mvEfficacy: efficacy(list, frame.refNow, true),
  };
}

/** CENTER plane: identified, consented, single-center. May include member rows
 *  for the staff member's OWN center only. No cross-center identifiable data. */
export function buildCenter(frame: Frame, centerId: string | undefined) {
  const centerMembers = frame.members.filter(
    (m) => frame.outcomeByMember.get(m.id)?.centerId === centerId
  );
  const list: MemberOutcome[] = centerMembers.map(
    (m) => frame.outcomeByMember.get(m.id)!
  );
  const platform: MemberOutcome[] = frame.members.map(
    (m) => frame.outcomeByMember.get(m.id)!
  );

  return {
    plane: "center" as const,
    deidentified: false,
    centerId: centerId ?? null,
    governance: GOVERNANCE,
    // identifiable roster — THEIR OWN CENTER ONLY. Not suppressed (single
    // center, consented, identified plane).
    members: centerMembers.map((m) => {
      const o = frame.outcomeByMember.get(m.id)!;
      return {
        memberId: m.id,
        name: m.name,
        memberNumber: m.memberNumber ?? null,
        carePhase: o.phase,
        levelOfCare: o.loc ?? null,
        score: o.score,
      };
    }),
    mvContinuumScore: scoreDistribution(list, false),
    mvCareOutcomes: careOutcomes(list, frame.followUps, frame.refNow, false),
    mvEfficacy: efficacy(list, frame.refNow, false),
    // platform aggregates for benchmark context (aggregate, no identity).
    platform: {
      mvContinuumScore: scoreDistribution(platform, false),
      mvCareOutcomes: careOutcomes(platform, frame.followUps, frame.refNow, false),
    },
  };
}
