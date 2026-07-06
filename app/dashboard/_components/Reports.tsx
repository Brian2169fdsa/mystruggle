"use client";

import { useCallback, useEffect, useState } from "react";
import { CARD, SKELETON, fmtMoney } from "./types";

/* ── GET /api/admin/reports shape ──────────────────────────────────────── */

type Horizon = { pct: number | null; eligible: number };

type Cohort = {
  label: string; // "Q3 2025"
  size: number;
  m3: Horizon;
  m6: Horizon;
  m12: Horizon;
};

type GivingMonth = { month: string; total: number; count: number };

type ReportsData = {
  members: number;
  retention: Cohort[];
  givingByMonth: GivingMonth[];
  summary: {
    stageAdvances: number;
    reachedIndependent: number;
    savingsHeld: number;
  };
};

/* ── GET /api/admin/analytics shape (recovery capital, docs/13 Part F) ─── */

type CapitalAvgs = { personal: number; social: number; community: number };

type CenterAnalytics = {
  centerId: string;
  name: string;
  members: number;
  avgStreak: number;
  engagement30d: number;
  goalsActive: number;
  goalsAchieved: number;
  recoveryCapitalAvgs: CapitalAvgs;
  barcParticipation: number; // % of members with ≥1 BARC-10 self-check
  fundedRequests: number;
};

type AnalyticsData = {
  perCenter: CenterAnalytics[];
  platform: Omit<CenterAnalytics, "centerId" | "name"> & {
    goalsByMonth: { month: string; count: number }[];
  };
};

/** Recovery-capital domains - blues + success green, never clinical reds. */
const DOMAINS = [
  { key: "personal", label: "Personal", bar: "bg-indigo-brand" },
  { key: "social", label: "Social", bar: "bg-blue-primary" },
  { key: "community", label: "Community", bar: "bg-success" },
] as const;

function DomainBars({ avgs }: { avgs: CapitalAvgs }) {
  return (
    <div className="flex flex-col gap-3">
      {DOMAINS.map((d) => (
        <div key={d.key} className="grid grid-cols-[86px_1fr_44px] items-center gap-3">
          <span className="text-xs font-semibold text-ink-600">{d.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-sky-tint">
            <div
              className={"h-full rounded-full " + d.bar}
              style={{ width: `${Math.min(100, avgs[d.key])}%` }}
            />
          </div>
          <span className="tnum text-right text-[13px] font-extrabold text-ink-900">
            {avgs[d.key]}%
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── benchmarks (published case-study reference): 65 / 65 / 80 ─────────── */

const BENCH_3 = 65;
const BENCH_6 = 65;
const BENCH_12 = 80;

const TONE = {
  green: "text-success",
  red: "text-heart-red",
  blue: "text-blue-primary",
} as const;

/** 3/6-month cells: green at/above the 65 benchmark, red below. The
 *  12-month column is always blue per the report design. Horizons a cohort
 *  hasn't reached yet come back null and render as an ink-400 em dash. */
function RetentionCell({
  h,
  bench,
  blue,
  showUpDelta,
}: {
  h: Horizon;
  bench: number;
  blue?: boolean;
  showUpDelta?: boolean;
}) {
  if (h.pct === null) {
    return <span className="text-[22px] font-extrabold text-ink-400">-</span>;
  }
  const tone = blue ? "blue" : h.pct >= bench ? "green" : "red";
  const delta =
    !blue && h.pct < bench
      ? `▼ −${bench - h.pct} vs goal`
      : !blue && showUpDelta
        ? `▲ +${h.pct - bench} vs goal`
        : null;
  return (
    <span className={"tnum text-[22px] font-extrabold " + TONE[tone]}>
      {h.pct}%
      {delta && (
        <span className="text-[11px] font-semibold text-ink-600"> {delta}</span>
      )}
    </span>
  );
}

/* ── GET /api/outcomes?plane=center shape (docs/14 data product) ───────── */

type ScoreBucket = { label: string; count: number | null };
type RetentionPoint = {
  day: number;
  eligible: number;
  retained: number;
  pct: number | null;
};
type CapitalDelta = {
  pre: number | null;
  during: number | null;
  post: number | null;
  note: string;
};
type Quartile = {
  label: string;
  n: number | null;
  avgScore: number | null;
  retention90Pct: number | null;
  avgGoalsAchieved: number | null;
};

type OutcomesData = {
  plane: "center" | "licensed";
  centerId: string | null;
  governance: { note: string; citation: string };
  mvContinuumScore: { n: number; avg: number | null; buckets: ScoreBucket[] };
  mvCareOutcomes: {
    retentionInRecovery: RetentionPoint[];
    recoveryCapitalDelta: CapitalDelta;
  };
  mvEfficacy: { note: string; quartiles: Quartile[] };
};

/** Retention-in-recovery benchmark line (illustrative, case-study framing:
 *  long-term recovery target). Not a clinical threshold. */
const RETENTION_BENCH = 60;

/* ── GET /api/roi shape (docs/16 Part F - ROI & Executive) ─────────────── */

type RoiActuals = {
  activeEnrollments: number;
  completedEnrollments: number;
  completionRatePct: number;
  dropoutRatePct: number;
  engagedDays30: number; // distinct member-days with a continuum event, 30d
  staffTouches30: number;
  sessionsDelivered30: number;
  alumniRetained: number; // post-center members active in the last 30d
};

type RoiData = { actuals: RoiActuals };

/** Editable assumptions - the center's numbers, never ours. Defaults are
 *  deliberately middle-of-the-road; every input is a plain number field. */
type RoiAssumptions = {
  episodeRevenue: number; // avg revenue per completed episode ($)
  hourlyCost: number; // clinician hourly cost ($/hr)
  adminHoursPerDay: number; // admin hours saved per day
  alumniMonthly: number; // alumni program revenue per retained alumnus / month
};

const ROI_DEFAULTS: RoiAssumptions = {
  episodeRevenue: 9000,
  hourlyCost: 85,
  adminHoursPerDay: 2,
  alumniMonthly: 150,
};

const ROI_INPUTS: {
  key: keyof RoiAssumptions;
  label: string;
  suffix: string;
}[] = [
  { key: "episodeRevenue", label: "Avg revenue per completed episode", suffix: "$" },
  { key: "hourlyCost", label: "Clinician hourly cost", suffix: "$/hr" },
  { key: "adminHoursPerDay", label: "Admin hours saved per day", suffix: "hrs" },
  { key: "alumniMonthly", label: "Alumni revenue per retained alumnus", suffix: "$/mo" },
];

/** Published case-study reference points - rendered as reference chips,
 *  always labeled "case-study reference, not a guarantee". */
const CASE_BENCHMARKS = [
  { label: "Completion", value: "50% → 65%" },
  { label: "Engagement", value: "40% → 65%" },
  { label: "Staff time", value: "2 hrs/day saved" },
  { label: "ROI", value: "2x → 5x" },
];

/** Rows for the measured-actuals strip in the ROI block + one-pager. */
function roiActualRows(a: RoiActuals): { label: string; value: string }[] {
  return [
    { label: "Active enrollments", value: String(a.activeEnrollments) },
    { label: "Completed enrollments", value: String(a.completedEnrollments) },
    { label: "Completion rate", value: `${a.completionRatePct}%` },
    { label: "Dropout rate", value: `${a.dropoutRatePct}%` },
    { label: "Engaged member-days (30d)", value: String(a.engagedDays30) },
    { label: "Staff touches (30d)", value: String(a.staffTouches30) },
    { label: "Sessions delivered (30d)", value: String(a.sessionsDelivered30) },
    { label: "Alumni retained (30d)", value: String(a.alumniRetained) },
  ];
}

/** Print-only rules for the executive one-pager: hide everything else, show
 *  the #roi-onepager section alone. A real branded PDF export is out of scope
 *  for now - this uses the browser's print-to-PDF. */
const ONE_PAGER_CSS = `
@media screen { #roi-onepager { display: none; } }
@media print {
  body * { visibility: hidden; }
  #roi-onepager, #roi-onepager * { visibility: visible; }
  #roi-onepager { display: block; position: absolute; left: 0; top: 0; width: 100%; padding: 32px; }
}
`;

/** pre → during → post recovery-capital bars - reuse the domain palette so the
 *  outcomes block reads as one system with the recovery-capital block above. */
const CAPITAL_PHASES = [
  { key: "pre", label: "Pre-care", bar: "bg-indigo-brand" },
  { key: "during", label: "During", bar: "bg-blue-primary" },
  { key: "post", label: "Post-discharge", bar: "bg-success" },
] as const;

/** Download the de-identified (k≥11) licensed CSV - Blob download, cookie auth,
 *  same pattern as the cohort export. The licensed plane is the ONLY exportable
 *  one: identifiable single-center rows never leave the building (docs/10 §6). */
async function exportLicensedCsv() {
  const res = await fetch("/api/outcomes/export?plane=licensed");
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "licensed-outcomes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Client-side CSV of the cohort table - Blob download, no deps. */
function exportCohortCsv(retention: Cohort[]) {
  const cell = (h: Horizon) => (h.pct === null ? "" : String(h.pct));
  const lines = [
    "Cohort,Enrolled,3-month %,6-month %,12-month %",
    ...retention.map((r) =>
      [r.label, r.size, cell(r.m3), cell(r.m6), cell(r.m12)].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n") + "\n"], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "retention-cohorts.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState(false);
  // Recovery-capital analytics load independently - a hiccup here never
  // takes down the existing retention/giving report.
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsError, setAnalyticsError] = useState(false);
  // Outcomes data product (docs/14) loads independently too - the retention /
  // efficacy block never blocks the existing retention + recovery-capital cards.
  const [outcomes, setOutcomes] = useState<OutcomesData | null>(null);
  const [outcomesError, setOutcomesError] = useState(false);
  // ROI actuals (docs/16 Part F) - independent load, same resilience rule.
  const [roi, setRoi] = useState<RoiData | null>(null);
  const [roiError, setRoiError] = useState(false);
  const [assump, setAssump] = useState<RoiAssumptions>(ROI_DEFAULTS);

  const load = useCallback(async () => {
    setError(false);
    setAnalyticsError(false);
    setOutcomesError(false);
    setRoiError(false);
    fetch("/api/roi")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body) => setRoi(body as RoiData))
      .catch(() => setRoiError(true));
    fetch("/api/admin/analytics")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body) => setAnalytics(body as AnalyticsData))
      .catch(() => setAnalyticsError(true));
    // Center plane: the staff member's own center (identified) + platform
    // aggregates. The licensed (de-identified) plane is reached only via the
    // Export CSV button below.
    fetch("/api/outcomes?plane=center")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((body) => setOutcomes(body as OutcomesData))
      .catch(() => setOutcomesError(true));
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as ReportsData);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxGiving = data
    ? Math.max(1, ...data.givingByMonth.map((g) => g.total))
    : 1;

  /* ── ROI math: your assumptions x our measurements (docs/16 Part F) ──
     Every line below is rendered verbatim in the UI - no hidden factors. */
  const act = roi?.actuals;
  const staffMonthly = assump.adminHoursPerDay * 30 * assump.hourlyCost;
  const alumniMonthlyTotal = (act?.alumniRetained ?? 0) * assump.alumniMonthly;
  const monthlyValue = staffMonthly + alumniMonthlyTotal;
  const completionValue =
    (act?.completedEnrollments ?? 0) * assump.episodeRevenue;
  const annualValue = monthlyValue * 12 + completionValue;

  const roiMathLines: { label: string; formula: string; result: string }[] =
    act
      ? [
          {
            label: "Staff time saved",
            formula: `${assump.adminHoursPerDay} hrs/day saved x 30 days x ${fmtMoney(assump.hourlyCost)}/hr`,
            result: `${fmtMoney(staffMonthly)}/mo`,
          },
          {
            label: "Alumni program revenue",
            formula: `${act.alumniRetained} retained alumni (measured) x ${fmtMoney(assump.alumniMonthly)}/mo`,
            result: `${fmtMoney(alumniMonthlyTotal)}/mo`,
          },
          {
            label: "Completed-episode revenue",
            formula: `${act.completedEnrollments} completions (measured) x ${fmtMoney(assump.episodeRevenue)}/episode`,
            result: fmtMoney(completionValue),
          },
        ]
      : [];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Outcomes &amp; retention
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-[22px] text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
          >
            All cohorts ▾
          </button>
          <button
            type="button"
            title="Coming soon"
            className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-[22px] text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
          >
            Export PDF
          </button>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && exportCohortCsv(data.retention)}
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-[22px] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover disabled:cursor-default disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* ── error: warm retry card ─────────────────────────────────────── */}
      {error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-amber-bg px-8 py-7 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-base font-bold text-amber-ink">
            We couldn&apos;t load the reports right now
          </div>
          <div className="text-sm font-medium text-ink-600">
            The numbers are safe - this is just a hiccup reaching the server.
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-[22px] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── loading: sky-tint skeletons in the final layout ────────────── */}
      {!error && !data && (
        <>
          <div className={SKELETON + " h-[340px]"} />
          <div className={SKELETON + " h-[210px]"} />
          <div className="grid grid-cols-3 gap-[18px]">
            <div className={SKELETON + " h-[126px]"} />
            <div className={SKELETON + " h-[126px]"} />
            <div className={SKELETON + " h-[126px]"} />
          </div>
        </>
      )}

      {!error && data && (
        <>
          {/* ── retention by signup cohort ─────────────────────────────── */}
          <div className={CARD + " px-8 py-7"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-bold text-ink-900">
                Retention by signup cohort
              </div>
              <div className="text-xs font-semibold text-ink-600">
                Benchmarks: 65% (3-mo) · 65% (6-mo) · 80% (12-mo program
                completion)
              </div>
            </div>
            <div className="mt-5 grid grid-cols-[1.2fr_1fr_1fr_1fr] px-1 text-xs font-bold tracking-[.06em] text-ink-600">
              <span>COHORT</span>
              <span>3-MONTH</span>
              <span>6-MONTH</span>
              <span>12-MONTH</span>
            </div>
            {data.retention.map((r, i) => (
              <div
                key={r.label}
                className={
                  "grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center border-t border-canvas px-1 py-4" +
                  (i === 0 ? " mt-2.5" : "")
                }
              >
                <span className="text-[15px] font-bold text-ink-900">
                  <span
                    className={
                      "mr-2.5 inline-flex h-6 items-center rounded-full px-3 text-[11px] font-extrabold " +
                      (i % 2 === 1
                        ? "bg-[#F0EDFB] text-indigo-brand"
                        : "bg-sky-tint text-blue-primary")
                    }
                  >
                    {r.label}
                  </span>
                  {r.size} enrolled
                </span>
                <RetentionCell h={r.m3} bench={BENCH_3} showUpDelta={i === 0} />
                <RetentionCell h={r.m6} bench={BENCH_6} />
                <RetentionCell h={r.m12} bench={BENCH_12} blue />
              </div>
            ))}
          </div>

          {/* ── recovery capital (docs/13 Part F - additive) ───────────── */}
          {!analytics && !analyticsError && (
            <div className={SKELETON + " h-[260px]"} />
          )}
          {analytics && (
            <div className={CARD + " px-8 py-7"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-bold text-ink-900">
                  Recovery capital
                </div>
                <div className="text-xs font-semibold text-ink-600">
                  Personal · Social · Community - activity-derived domain
                  averages, 0–100 · never clinical
                </div>
              </div>

              {/* domain averages per center */}
              <div className="mt-6 grid grid-cols-2 gap-10">
                {analytics.perCenter.map((c) => (
                  <div key={c.centerId}>
                    <div className="mb-3.5 text-[15px] font-bold text-ink-900">
                      <span className="mr-2.5 inline-flex h-6 items-center rounded-full bg-sky-tint px-3 text-[11px] font-extrabold text-blue-primary">
                        {c.name}
                      </span>
                      {c.members} members
                    </div>
                    <DomainBars avgs={c.recoveryCapitalAvgs} />
                  </div>
                ))}
              </div>

              {/* goals-achieved trend + BARC participation */}
              <div className="mt-7 grid grid-cols-[1.6fr_1fr] gap-10 border-t border-canvas pt-6">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-bold text-ink-900">
                      Goals achieved
                    </div>
                    <div className="text-xs font-semibold text-ink-600">
                      last 12 months ·{" "}
                      {analytics.platform.goalsByMonth.reduce(
                        (s, g) => s + g.count,
                        0
                      )}{" "}
                      total
                    </div>
                  </div>
                  <div className="mt-4 grid h-24 grid-cols-12 items-end gap-2">
                    {(() => {
                      const maxGoals = Math.max(
                        1,
                        ...analytics.platform.goalsByMonth.map((g) => g.count)
                      );
                      return analytics.platform.goalsByMonth.map((g, i) => {
                        const best = g.count === maxGoals && g.count > 0;
                        return (
                          <div
                            key={g.month + i}
                            title={`${g.month}: ${g.count} goal${g.count === 1 ? "" : "s"} achieved`}
                            className="flex h-full flex-col items-center justify-end gap-1"
                          >
                            {best && (
                              <span className="tnum text-[11px] font-bold text-success">
                                {g.count}
                              </span>
                            )}
                            <div
                              className={
                                "w-full rounded-t-[4px] " +
                                (best ? "bg-success" : "bg-blue-primary")
                              }
                              style={{
                                height: `${Math.max(3, Math.round((g.count / maxGoals) * 100))}%`,
                              }}
                            />
                            <span className="text-[11px] font-semibold text-ink-600">
                              {g.month}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="flex flex-col justify-center border-l border-canvas pl-10">
                  <div className="text-[13px] font-medium text-ink-600">
                    BARC-10 participation
                  </div>
                  <div className="tnum mt-1.5 text-[40px] font-extrabold tracking-[-0.02em] text-blue-primary">
                    {analytics.platform.barcParticipation}%
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-ink-600">
                    of members have taken at least one self-check ·{" "}
                    {analytics.platform.goalsActive} goals in motion
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── giving by month mini-chart ─────────────────────────────── */}
          <div className={CARD + " px-8 py-7"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-bold text-ink-900">
                Giving by month
              </div>
              <div className="text-xs font-semibold text-ink-600">
                QR Code Giving · last 12 months ·{" "}
                {fmtMoney(data.givingByMonth.reduce((s, g) => s + g.total, 0))}{" "}
                total
              </div>
            </div>
            <div className="mt-5 grid h-36 grid-cols-12 items-end gap-2">
              {data.givingByMonth.map((g) => {
                const best = g.total === maxGiving && g.total > 0;
                return (
                  <div
                    key={g.month + g.total}
                    title={`${g.month}: ${fmtMoney(g.total)} · ${g.count} gift${g.count === 1 ? "" : "s"}`}
                    className="flex h-full flex-col items-center justify-end gap-1"
                  >
                    {best && (
                      <span className="tnum text-[11px] font-bold text-success">
                        {fmtMoney(g.total)}
                      </span>
                    )}
                    <div
                      className={
                        "w-full rounded-t-[4px] " +
                        (best ? "bg-success" : "bg-blue-primary")
                      }
                      style={{
                        height: `${Math.max(3, Math.round((g.total / maxGiving) * 100))}%`,
                      }}
                    />
                    <span className="text-[11px] font-semibold text-ink-600">
                      {g.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── summary cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-[18px]">
            <div className={CARD + " px-7 py-6"}>
              <div className="text-[13px] font-medium text-ink-600">
                Stage advances this year
              </div>
              <div className="tnum mt-1.5 text-[40px] font-extrabold tracking-[-0.02em] text-blue-primary">
                {data.summary.stageAdvances}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-ink-600">
                members at Silver or Gold
              </div>
            </div>
            <div className={CARD + " px-7 py-6"}>
              <div className="text-[13px] font-medium text-ink-600">
                Reached Independent
              </div>
              <div className="tnum mt-1.5 text-[40px] font-extrabold tracking-[-0.02em] text-success">
                {data.summary.reachedIndependent}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-ink-600">
                Gold-level members
              </div>
            </div>
            <div className={CARD + " px-7 py-6"}>
              <div className="text-[13px] font-medium text-ink-600">
                Reentry savings held
              </div>
              <div className="tnum mt-1.5 text-[40px] font-extrabold tracking-[-0.02em] text-blue-primary">
                {fmtMoney(data.summary.savingsHeld)}
              </div>
              <div className="mt-0.5 text-xs font-semibold text-ink-600">
                across {data.members} members&apos; savings
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── OUTCOMES & EFFICACY (docs/14 data product - additive) ──────────
          Retention-in-recovery curve, pre→during→post recovery-capital delta,
          the engagement→outcome efficacy table, and the de-identified (k≥11)
          licensed export. Loads independently of the reports above. */}
      {!outcomes && !outcomesError && (
        <>
          <div className={SKELETON + " h-[240px]"} />
          <div className={SKELETON + " h-[190px]"} />
        </>
      )}

      {outcomes && (
        <>
          {/* retention-in-recovery curve */}
          <div className={CARD + " px-8 py-7"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-bold text-ink-900">
                Retention in recovery
              </div>
              <div className="text-xs font-semibold text-ink-600">
                Post-discharge follow-up ·{" "}
                {RETENTION_BENCH}% long-term benchmark · engagement, never
                clinical
              </div>
            </div>
            <div className="mt-6 grid grid-cols-5 items-end gap-4">
              {outcomes.mvCareOutcomes.retentionInRecovery.map((r) => {
                const observable = r.eligible > 0 && r.pct !== null;
                const h = observable ? Math.max(4, r.pct as number) : 0;
                const hitsBench = observable && (r.pct as number) >= RETENTION_BENCH;
                return (
                  <div
                    key={r.day}
                    title={
                      observable
                        ? `${r.day}d: ${r.retained}/${r.eligible} retained`
                        : `${r.day}d: not yet observable in this cohort`
                    }
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="relative flex h-28 w-full items-end justify-center">
                      {/* benchmark reference line */}
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-ink-400/60"
                        style={{ bottom: `${RETENTION_BENCH}%` }}
                      />
                      {observable ? (
                        <div
                          className={
                            "w-full max-w-[46px] rounded-t-[5px] " +
                            (hitsBench ? "bg-success" : "bg-blue-primary")
                          }
                          style={{ height: `${h}%` }}
                        />
                      ) : (
                        <span className="text-[22px] font-extrabold text-ink-400">
                          -
                        </span>
                      )}
                    </div>
                    <span className="tnum text-[15px] font-extrabold text-ink-900">
                      {observable ? `${r.pct}%` : "-"}
                    </span>
                    <span className="text-[11px] font-semibold text-ink-600">
                      {r.day}d
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* recovery-capital pre → during → post + efficacy table */}
          <div className="grid grid-cols-[1fr_1.2fr] gap-[18px] max-lg:grid-cols-1">
            <div className={CARD + " px-8 py-7"}>
              <div className="text-base font-bold text-ink-900">
                Recovery capital: pre → during → post
              </div>
              <div className="mt-1 text-xs font-semibold text-ink-600">
                The delta the pre-care window makes provable
              </div>
              <div className="mt-6 grid grid-cols-3 items-end gap-6">
                {CAPITAL_PHASES.map((p) => {
                  const val = outcomes.mvCareOutcomes.recoveryCapitalDelta[p.key];
                  const h = val === null ? 0 : Math.max(4, val);
                  return (
                    <div key={p.key} className="flex flex-col items-center gap-2">
                      <div className="flex h-32 w-full items-end justify-center">
                        {val === null ? (
                          <span className="text-[20px] font-extrabold text-ink-400">
                            -
                          </span>
                        ) : (
                          <div
                            className={"w-full max-w-[54px] rounded-t-[5px] " + p.bar}
                            style={{ height: `${h}%` }}
                          />
                        )}
                      </div>
                      <span className="tnum text-[18px] font-extrabold text-ink-900">
                        {val === null ? "-" : val}
                      </span>
                      <span className="text-center text-[11px] font-semibold text-ink-600">
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 text-[11px] font-medium leading-snug text-ink-600">
                {outcomes.mvCareOutcomes.recoveryCapitalDelta.note}
              </div>
            </div>

            {/* efficacy: engagement quartile → outcome */}
            <div className={CARD + " px-8 py-7"}>
              <div className="text-base font-bold text-ink-900">
                Engagement &rarr; efficacy
              </div>
              <div className="mt-1 text-xs font-semibold text-ink-600">
                Members bucketed by engagement quartile
              </div>
              <div className="mt-5 grid grid-cols-[1.3fr_1fr_1fr] px-1 text-[11px] font-bold tracking-[.06em] text-ink-600">
                <span>QUARTILE</span>
                <span className="text-right">AVG SCORE</span>
                <span className="text-right">GOALS/MBR</span>
              </div>
              {outcomes.mvEfficacy.quartiles.map((q, i) => (
                <div
                  key={q.label}
                  className={
                    "grid grid-cols-[1.3fr_1fr_1fr] items-center border-t border-canvas px-1 py-3" +
                    (i === 0 ? " mt-2" : "")
                  }
                >
                  <span className="text-[13px] font-bold text-ink-900">
                    {q.label}
                    <span className="ml-1 text-[11px] font-semibold text-ink-600">
                      {q.n === null ? "" : `· ${q.n}`}
                    </span>
                  </span>
                  <span className="tnum text-right text-[15px] font-extrabold text-blue-primary">
                    {q.avgScore ?? "-"}
                  </span>
                  <span className="tnum text-right text-[15px] font-extrabold text-ink-900">
                    {q.avgGoalsAchieved ?? "-"}
                  </span>
                </div>
              ))}
              <div className="mt-3 text-[11px] font-medium leading-snug text-ink-600">
                {outcomes.mvEfficacy.note}
              </div>
            </div>
          </div>

          {/* de-identified export (k≥11) + governance note */}
          <div className={CARD + " border border-sky-tint px-8 py-7"}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-[560px]">
                <div className="text-base font-bold text-ink-900">
                  De-identified export (k&ge;11)
                </div>
                <div className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink-600">
                  {outcomes.governance.note} Cohorts smaller than 11 are
                  suppressed. Licensing to third parties is gated on counsel
                  sign-off ({outcomes.governance.citation}).
                </div>
              </div>
              <button
                type="button"
                onClick={exportLicensedCsv}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full bg-blue-primary px-[22px] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover"
              >
                Export CSV
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── ROI & EXECUTIVE (docs/16 Part F - additive) ────────────────────
          Your assumptions x our measurements, math shown line by line.
          Case-study benchmarks are reference chips, never promises. Loads
          independently of everything above. */}
      <div className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        ROI &amp; executive
      </div>

      {!roi && !roiError && <div className={SKELETON + " h-[320px]"} />}

      {roiError && (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-amber-bg px-8 py-7 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-base font-bold text-amber-ink">
            We couldn&apos;t load the ROI measurements
          </div>
          <div className="text-sm font-medium text-ink-600">
            Your assumptions are safe - this is just a hiccup reaching the
            server.
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-[22px] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover"
          >
            Try again
          </button>
        </div>
      )}

      {roi && act && (
        <>
          <style dangerouslySetInnerHTML={{ __html: ONE_PAGER_CSS }} />

          <div className={CARD + " px-8 py-7"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-bold text-ink-900">
                  Your assumptions x our measurements
                </div>
                <div className="mt-1 text-xs font-semibold text-ink-600">
                  Edit the assumptions - they&apos;re your numbers, never ours.
                  The measurements come live from the platform.
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                title="Opens your browser's print dialog - save as PDF. A branded PDF export is on the roadmap."
                className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-[22px] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover"
              >
                Executive one-pager
              </button>
            </div>

            {/* assumptions panel - editable number inputs */}
            <div className="mt-6 grid grid-cols-4 gap-4 max-lg:grid-cols-2">
              {ROI_INPUTS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold tracking-[.04em] text-ink-600">
                    {f.label}
                  </span>
                  <span className="flex items-center gap-2 rounded-xl border border-sky-tint bg-canvas px-3.5 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={assump[f.key]}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAssump({
                          ...assump,
                          [f.key]: Number.isFinite(v) && v >= 0 ? v : 0,
                        });
                      }}
                      className="tnum w-full bg-transparent text-[16px] font-extrabold text-ink-900 outline-none"
                    />
                    <span className="flex-none text-[11px] font-bold text-ink-400">
                      {f.suffix}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {/* measured actuals strip */}
            <div className="mt-6 grid grid-cols-4 gap-3 border-t border-canvas pt-5 max-lg:grid-cols-2">
              {roiActualRows(act).map((r) => (
                <div key={r.label}>
                  <div className="text-[11px] font-semibold text-ink-600">
                    {r.label}
                  </div>
                  <div className="tnum text-[20px] font-extrabold text-blue-primary">
                    {r.value}
                  </div>
                </div>
              ))}
            </div>

            {/* the math, line by line */}
            <div className="mt-6 border-t border-canvas pt-5">
              <div className="text-[13px] font-bold text-ink-900">
                The math, line by line
              </div>
              {roiMathLines.map((l) => (
                <div
                  key={l.label}
                  className="mt-3 grid grid-cols-[160px_1fr_auto] items-center gap-3 max-lg:grid-cols-1 max-lg:gap-1"
                >
                  <span className="text-[13px] font-bold text-ink-900">
                    {l.label}
                  </span>
                  <span className="tnum text-[13px] font-medium text-ink-600">
                    {l.formula}
                  </span>
                  <span className="tnum text-right text-[15px] font-extrabold text-ink-900 max-lg:text-left">
                    = {l.result}
                  </span>
                </div>
              ))}
              <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-sky-tint px-6 py-5 max-lg:grid-cols-1">
                <div>
                  <div className="text-[12px] font-semibold text-ink-600">
                    Monthly recurring value (staff time + alumni revenue)
                  </div>
                  <div className="tnum text-[32px] font-extrabold tracking-[-0.02em] text-blue-primary">
                    {fmtMoney(monthlyValue)}
                    <span className="text-[15px] font-bold text-ink-600">
                      /mo
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-ink-600">
                    Annualized (12 x monthly + completed-episode revenue)
                  </div>
                  <div className="tnum text-[32px] font-extrabold tracking-[-0.02em] text-success">
                    {fmtMoney(annualValue)}
                    <span className="text-[15px] font-bold text-ink-600">
                      /yr
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* published case-study reference chips */}
            <div className="mt-6 border-t border-canvas pt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                {CASE_BENCHMARKS.map((b) => (
                  <span
                    key={b.label}
                    title="Published case-study reference, not a guarantee"
                    className="inline-flex h-8 items-center gap-2 rounded-full bg-[#F0EDFB] px-3.5 text-[12px] font-extrabold text-indigo-brand"
                  >
                    {b.label}
                    <span className="tnum font-bold text-ink-900">
                      {b.value}
                    </span>
                  </span>
                ))}
              </div>
              <div className="mt-2.5 text-[11px] font-semibold text-ink-600">
                Published case-study benchmarks - a reference, not a guarantee.
              </div>
            </div>

            {/* staff touch -> outcome, directional only */}
            <div className="mt-5 flex flex-wrap items-start gap-3 rounded-2xl border border-sky-tint bg-canvas px-5 py-4">
              <span className="inline-flex h-[22px] flex-none items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-extrabold tracking-[.06em] text-blue-primary">
                STAFF TOUCH → OUTCOME
              </span>
              <p className="min-w-[240px] flex-1 text-[13px]/[1.6] font-medium text-ink-600">
                {act.staffTouches30 > 0
                  ? `${act.staffTouches30} staff touches logged in the last 30 days alongside a ${act.completionRatePct}% completion rate - ` +
                    (act.completionRatePct >= 50
                      ? "engagement and completion are moving in the same direction here, the same pattern the case-study data points to."
                      : "touch volume is building; completion has room to follow. Keep logging kudos, nudges, and check-ins.")
                  : "No staff touches logged in the last 30 days yet - log kudos, nudges, and check-ins to start building this signal."}{" "}
                <span className="font-bold text-ink-900">
                  Directional only - a correlation from your live data, never
                  causal proof.
                </span>
              </p>
            </div>
          </div>

          {/* print-only executive one-pager (browser print-to-PDF; a real
              branded PDF export is out of scope for now) */}
          <div id="roi-onepager">
            <div style={{ fontWeight: 800, fontSize: 24 }}>
              My Struggle - Executive one-pager
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#4A5568" }}>
              Generated {new Date().toLocaleDateString("en-US")} - your
              assumptions x our measurements
            </div>
            <table style={{ marginTop: 20, width: "100%", fontSize: 13 }}>
              <tbody>
                {roiActualRows(act).map((r) => (
                  <tr key={r.label}>
                    <td style={{ padding: "4px 0", color: "#4A5568" }}>
                      {r.label}
                    </td>
                    <td style={{ padding: "4px 0", fontWeight: 800 }}>
                      {r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 20, fontSize: 13 }}>
              {roiMathLines.map((l) => (
                <div key={l.label} style={{ padding: "3px 0" }}>
                  <strong>{l.label}:</strong> {l.formula} = {l.result}
                </div>
              ))}
              <div style={{ marginTop: 12, fontWeight: 800, fontSize: 16 }}>
                Monthly recurring value: {fmtMoney(monthlyValue)}/mo ·
                Annualized: {fmtMoney(annualValue)}/yr
              </div>
            </div>
            <div style={{ marginTop: 20, fontSize: 11, color: "#4A5568" }}>
              Assumptions supplied by the center; measurements from the
              platform. Published case-study benchmarks (completion 50% to 65%,
              engagement 40% to 65%, 2 hrs/day saved, ROI 2x to 5x) are
              case-study references, not guarantees. Staff-touch correlation is
              directional, never causal proof.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
