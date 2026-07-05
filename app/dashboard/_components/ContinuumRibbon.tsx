"use client";

import { useEffect, useState } from "react";
import { CARD, SKELETON, relTime } from "./types";

// ── GET /api/continuum?memberId=… response contract (code defensively) ──
type CarePhase =
  | "pre_care"
  | "intake"
  | "in_program"
  | "transition"
  | "continuing";

type EventSource =
  | "community"
  | "lms"
  | "goal"
  | "giving"
  | "mentorship"
  | "checkin"
  | "session"
  | "phase";

type ContinuumEpisode = {
  carePhase: CarePhase;
  levelOfCare?: string;
  startedAt: number;
  phaseChangedAt: number;
  endedAt?: number;
};

type ContinuumTransition = {
  fromPhase?: string;
  toPhase: string;
  reason: string;
  at: number;
};

type ContinuumEvent = {
  source: EventSource;
  weight: number;
  occurredAt: number;
};

type MonthActivity = { month: string; count: number; weight: number };

type ContinuumData = {
  episode: ContinuumEpisode | null;
  transitions: ContinuumTransition[];
  events: ContinuumEvent[];
  score: number;
  monthlyActivity: MonthActivity[];
};

// ── Phase constants ────────────────────────────────────────────────────
const PHASE_ORDER: CarePhase[] = [
  "pre_care",
  "intake",
  "in_program",
  "transition",
  "continuing",
];

const PHASE_LABEL: Record<CarePhase, string> = {
  pre_care: "Pre-care",
  intake: "Intake",
  in_program: "In-program",
  transition: "Transition",
  continuing: "Continuing",
};

// sky-tint → blue → indigo → green progression for filled segments
const PHASE_FILL: Record<CarePhase, string> = {
  pre_care: "#BCD6F5",
  intake: "#6FA8E6",
  in_program: "#2E7CD6",
  transition: "#4E5B9B",
  continuing: "#12B76A",
};

// Phase chip look: PRE-CARE sky-tint / INTAKE blue-outline / IN-PROGRAM blue
// / TRANSITION indigo / CONTINUING success-green.
const PHASE_CHIP: Record<CarePhase, string> = {
  pre_care: "bg-sky-tint text-blue-primary",
  intake: "border-[1.5px] border-blue-primary text-blue-primary bg-white",
  in_program: "bg-blue-primary text-white",
  transition: "bg-indigo-brand text-white",
  continuing: "bg-success text-white",
};

// Event dot colors, per source, at dot scale.
const SOURCE_COLOR: Record<EventSource, string> = {
  community: "#2E7CD6",
  lms: "#4E5B9B",
  goal: "#12B76A",
  giving: "#E5484D",
  mentorship: "#0B2545",
  session: "#0B2545",
  checkin: "#8FBCF0",
  phase: "#4E5B9B",
};

const SOURCE_LABEL: Record<EventSource, string> = {
  community: "Community",
  lms: "Learning",
  goal: "Goals",
  giving: "Giving",
  mentorship: "Mentorship",
  session: "Sessions",
  checkin: "Check-ins",
  phase: "Phase change",
};

function monthYear(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/** Pretty-print a "YYYY-MM" month key; fall back to the raw string. */
function fmtMonth(m: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (match) {
    const d = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return m;
}

/**
 * Derive per-phase durations (ms) from episode timestamps + transitions,
 * defensively. Phases the person hasn't reached get 0. Current phase runs to
 * endedAt || now.
 */
function phaseDurations(
  episode: ContinuumEpisode,
  transitions: ContinuumTransition[]
): number[] {
  const curIdx = PHASE_ORDER.indexOf(episode.carePhase);
  const now = Date.now();
  const starts: (number | undefined)[] = new Array(5).fill(undefined);

  // Timeline begins at the episode start (assigned to the first phase slot).
  starts[0] = episode.startedAt;

  // Transitions pin the start of each phase they land on.
  [...transitions]
    .filter((t) => Number.isFinite(t.at))
    .sort((a, b) => a.at - b.at)
    .forEach((t) => {
      const i = PHASE_ORDER.indexOf(t.toPhase as CarePhase);
      if (i >= 0) starts[i] = t.at;
    });

  // Current phase falls back to phaseChangedAt.
  if (curIdx >= 0 && starts[curIdx] == null) {
    starts[curIdx] = episode.phaseChangedAt;
  }

  // Linear-interpolate any gaps between known anchors up to the current phase.
  const anchors: number[] = [];
  for (let i = 0; i <= Math.max(curIdx, 0); i++) {
    if (starts[i] != null) anchors.push(i);
  }
  for (let a = 0; a < anchors.length - 1; a++) {
    const lo = anchors[a];
    const hi = anchors[a + 1];
    const loT = starts[lo] as number;
    const hiT = starts[hi] as number;
    for (let k = lo + 1; k < hi; k++) {
      starts[k] = loT + ((hiT - loT) * (k - lo)) / (hi - lo);
    }
  }

  const endCur = episode.endedAt ?? now;
  const durations = new Array(5).fill(0);
  for (let i = 0; i <= curIdx; i++) {
    const s = starts[i];
    if (s == null) continue;
    const end = i < curIdx ? (starts[i + 1] as number) ?? endCur : endCur;
    durations[i] = Math.max(0, end - s);
  }
  return durations;
}

/** Segment widths (%) from durations: every segment gets a min so labels fit,
 *  the remainder is split proportionally to real phase duration. */
function segmentWidths(durations: number[]): number[] {
  const MIN = 12;
  const remain = 100 - MIN * 5;
  const total = durations.reduce((a, b) => a + b, 0);
  if (total <= 0) return new Array(5).fill(20);
  return durations.map((d) => MIN + (remain * d) / total);
}

export default function ContinuumRibbon({ memberId }: { memberId: string }) {
  const [data, setData] = useState<ContinuumData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "offline">(
    "loading"
  );
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let alive = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    setData(null);
    setStatus("loading");

    async function load() {
      attempts += 1;
      try {
        const r = await fetch(`/api/continuum?memberId=${memberId}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = (await r.json()) as ContinuumData;
        if (!alive) return;
        setData(d);
        setStatus("ready");
      } catch {
        if (!alive) return;
        setStatus("offline");
        // The API may not be live yet — retry a few times as it warms up.
        if (attempts < 6) {
          timer = setTimeout(load, 4000);
        }
      }
    }

    load();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [memberId]);

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className={CARD + " px-[30px] py-[26px]"}>
        <div className="flex items-center gap-4">
          <div className={SKELETON + " h-11 w-16"} />
          <div className={SKELETON + " h-6 w-28"} />
        </div>
        <div className={SKELETON + " mt-5 h-9 w-full"} />
        <div className={SKELETON + " mt-4 h-12 w-full"} />
      </div>
    );
  }

  // ── API not live — quiet placeholder ──────────────────────────────────
  if (status === "offline" || !data) {
    return (
      <div className={CARD + " px-[30px] py-[26px]"}>
        <div className="text-[15px] font-bold text-ink-900">Continuum</div>
        <div className="mt-3 flex items-center gap-3 text-[13px] text-ink-600">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-blue-primary/50" />
          Continuum timeline coming online…
        </div>
      </div>
    );
  }

  const { episode, transitions, events, score, monthlyActivity } = data;

  // ── Empty state — no episode (unaffiliated / pre-care) ────────────────
  if (!episode) {
    return (
      <div className={CARD + " px-[30px] py-[26px]"}>
        <div className="text-[15px] font-bold text-ink-900">Continuum</div>
        <div className="mt-2 text-[13px] text-ink-600">
          No continuum record yet — this member is pre-care/unaffiliated.
        </div>
      </div>
    );
  }

  const curIdx = PHASE_ORDER.indexOf(episode.carePhase);
  const durations = phaseDurations(episode, transitions);
  const widths = segmentWidths(durations);
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));

  // Sparkline scaling — heights driven by weight.
  const months = Array.isArray(monthlyActivity) ? monthlyActivity : [];
  const maxWeight = months.reduce((m, x) => Math.max(m, x.weight || 0), 0) || 1;

  // Event markers — last ~30, positioned along the episode timeline.
  const t0 = episode.startedAt;
  const t1 = episode.endedAt ?? Date.now();
  const span = Math.max(1, t1 - t0);
  const markerEvents = Array.isArray(events)
    ? [...events]
        .filter((e) => Number.isFinite(e.occurredAt))
        .sort((a, b) => a.occurredAt - b.occurredAt)
        .slice(-30)
    : [];

  // Which sources actually appear — drives the legend.
  const presentSources = Array.from(
    new Set(markerEvents.map((e) => e.source))
  ).filter((s): s is EventSource => s in SOURCE_COLOR);

  return (
    <div className={CARD + " px-[30px] py-[26px]"}>
      <style>{`
        @keyframes continuum-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(46,124,214,.45); }
          50%      { box-shadow: 0 0 0 4px rgba(46,124,214,0); }
        }
      `}</style>

      {/* 1 — Score header */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-400">
            Continuum score
          </div>
          <div className="tnum text-[40px] font-extrabold leading-none text-blue-primary">
            {safeScore}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <span
            className={
              "inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.04em] " +
              (PHASE_CHIP[episode.carePhase] ?? "bg-sky-tint text-blue-primary")
            }
          >
            {PHASE_LABEL[episode.carePhase] ?? episode.carePhase}
          </span>
          {episode.levelOfCare && (
            <span className="inline-flex h-[26px] items-center rounded-full bg-[#DDEBFB] px-3 text-[11px] font-bold uppercase text-blue-primary">
              {episode.levelOfCare}
            </span>
          )}
          <span className="text-[12px] font-semibold text-ink-400">
            since {monthYear(episode.startedAt)}
          </span>
        </div>
      </div>

      {/* 2 — The ribbon */}
      <div className="mt-5 flex gap-1.5">
        {PHASE_ORDER.map((phase, i) => {
          const isPast = i < curIdx;
          const isCurrent = i === curIdx;
          const filled = isPast || isCurrent;
          return (
            <div
              key={phase}
              style={{ width: `${widths[i]}%` }}
              className="min-w-0"
            >
              <div
                className="h-3 rounded-full"
                style={{
                  background: filled ? PHASE_FILL[phase] : "#EAF2FC",
                  animation: isCurrent
                    ? "continuum-pulse 1.8s ease-in-out infinite"
                    : undefined,
                }}
              />
              <div
                className={
                  "mt-1.5 truncate text-[10px] font-semibold " +
                  (isCurrent
                    ? "text-blue-primary"
                    : filled
                    ? "text-ink-600"
                    : "text-ink-400")
                }
                title={PHASE_LABEL[phase]}
              >
                {PHASE_LABEL[phase]}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 — Engagement sparkline */}
      {months.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">
            Engagement · last {months.length} months
          </div>
          <div className="mt-2 flex h-12 items-end gap-[3px]">
            {months.map((m, i) => {
              const h = Math.max(
                6,
                Math.round(((m.weight || 0) / maxWeight) * 100)
              );
              const recent = i === months.length - 1;
              return (
                <div
                  key={m.month + i}
                  title={`${fmtMonth(m.month)}: ${m.count} actions`}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}%`,
                    background: recent ? "#0B2545" : "#2E7CD6",
                    opacity: recent ? 1 : 0.75,
                  }}
                />
              );
            })}
          </div>

          {/* 4 — Event markers along the time axis */}
          <div className="relative mt-2 h-4">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-sky-tint-2" />
            {markerEvents.map((e, i) => {
              const left = Math.max(
                0,
                Math.min(100, ((e.occurredAt - t0) / span) * 100)
              );
              const color = SOURCE_COLOR[e.source] ?? "#2E7CD6";
              const isPhase = e.source === "phase";
              return (
                <span
                  key={i}
                  title={`${SOURCE_LABEL[e.source] ?? e.source} · ${relTime(
                    e.occurredAt
                  )}`}
                  className="absolute top-1/2"
                  style={{
                    left: `${left}%`,
                    width: isPhase ? 9 : 7,
                    height: isPhase ? 9 : 7,
                    marginLeft: isPhase ? -4.5 : -3.5,
                    marginTop: isPhase ? -4.5 : -3.5,
                    background: color,
                    borderRadius: isPhase ? 2 : "50%",
                    transform: isPhase ? "rotate(45deg)" : undefined,
                    border: "1px solid #fff",
                  }}
                />
              );
            })}
          </div>

          {/* Legend */}
          {presentSources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {presentSources.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ink-600"
                >
                  <span
                    className="inline-block"
                    style={{
                      width: 7,
                      height: 7,
                      background: SOURCE_COLOR[s],
                      borderRadius: s === "phase" ? 1 : "50%",
                      transform: s === "phase" ? "rotate(45deg)" : undefined,
                    }}
                  />
                  {SOURCE_LABEL[s]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5 — Phase history */}
      {transitions.length > 0 && (
        <div className="mt-5 border-t border-canvas pt-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex cursor-pointer items-center gap-1.5 text-[12px] font-bold text-blue-primary"
          >
            <span
              className="inline-block transition-transform"
              style={{ transform: showHistory ? "rotate(90deg)" : undefined }}
            >
              ▸
            </span>
            Phase history ({transitions.length})
          </button>
          {showHistory && (
            <div className="mt-2.5 flex flex-col gap-2">
              {[...transitions]
                .sort((a, b) => b.at - a.at)
                .map((t, i) => {
                  const from = t.fromPhase
                    ? PHASE_LABEL[t.fromPhase as CarePhase] ?? t.fromPhase
                    : "—";
                  const to =
                    PHASE_LABEL[t.toPhase as CarePhase] ?? t.toPhase;
                  return (
                    <div
                      key={i}
                      className="text-[12px] text-ink-600"
                    >
                      <span className="font-semibold text-ink-900">
                        {from} → {to}
                      </span>{" "}
                      · {t.reason} ·{" "}
                      <span className="text-ink-400">{relTime(t.at)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
