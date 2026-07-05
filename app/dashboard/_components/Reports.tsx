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

/* ── benchmarks (New Freedom case study): 65 / 65 / 80 ─────────────────── */

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
    return <span className="text-[22px] font-extrabold text-ink-400">—</span>;
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

/** Client-side CSV of the cohort table — Blob download, no deps. */
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

  const load = useCallback(async () => {
    setError(false);
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
            The numbers are safe — this is just a hiccup reaching the server.
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
    </div>
  );
}
