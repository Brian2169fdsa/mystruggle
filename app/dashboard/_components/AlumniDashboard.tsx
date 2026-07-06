"use client";

import { useEffect, useState } from "react";
import { CARD, SKELETON } from "./types";

type CadenceEntry = { dueDay: number; status: "pending" | "done" | "missed" };

/** One post-discharge alumnus (GET /api/admin/alumni). */
type Alumnus = {
  id: string;
  name: string;
  memberNumber: string;
  avatarColor: string;
  continuumScore: number;
  monthsSinceDischarge: number;
  cadence: CadenceEntry[];
  relapseRisk: "low" | "watch";
  lastActive: number;
  cadenceDue: number;
};

type Summary = {
  alumniCount: number;
  watchCount: number;
  avgScore: number;
  cadenceDue: number;
};

type Data = { alumni: Alumnus[]; summary: Summary };

const GRID = "grid grid-cols-[1.8fr_1fr_1fr_1.6fr_1fr_1.1fr]";

function relActive(ts: number): string {
  if (!ts) return "no activity yet";
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** A 30/60/90/180/365 follow-up chip, colored by cadence status. */
function CadenceChip({ entry }: { entry: CadenceEntry }) {
  const cls =
    entry.status === "done"
      ? "bg-[#E8F8F0] text-success"
      : entry.status === "missed"
        ? "bg-amber-bg text-amber-ink"
        : "bg-sky-tint text-blue-primary";
  const glyph =
    entry.status === "done" ? "✓" : entry.status === "missed" ? "!" : "·";
  return (
    <span
      title={`${entry.dueDay}-day check-in · ${entry.status}`}
      className={
        "inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[10.5px] font-bold " +
        cls
      }
    >
      <span className="tnum">{entry.dueDay}</span>
      <span className="leading-none">{glyph}</span>
    </span>
  );
}

export default function AlumniDashboard({
  onWatchCount,
}: {
  onWatchCount?: (n: number) => void;
}) {
  const [data, setData] = useState<Data | null | "offline">(null);
  const [sortByScore, setSortByScore] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/alumni");
        if (res.status === 401) {
          if (!stop)
            setData({
              alumni: [],
              summary: { alumniCount: 0, watchCount: 0, avgScore: 0, cadenceDue: 0 },
            });
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const d = (await res.json()) as Data;
        if (stop) return;
        setData(d);
        onWatchCount?.(d.summary?.watchCount ?? 0);
      } catch {
        if (stop) return;
        setData((cur) => (cur && cur !== "offline" ? cur : "offline"));
        timer = setTimeout(load, 4000); // retry quietly over the session
      }
    };

    load();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [onWatchCount]);

  const header = (
    <div>
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Alumni
      </div>
      <div className="mt-0.5 text-[13px] font-medium text-ink-600">
        A drop in engagement is the earliest, kindest relapse warning - reach out
        early.
      </div>
    </div>
  );

  // Coming-online skeleton.
  if (data === null || data === "offline") {
    return (
      <div className="flex flex-col gap-5">
        {header}
        {data === "offline" && (
          <div className="text-[13px] font-semibold text-ink-400">
            Alumni outcomes coming online…
          </div>
        )}
        <div className="grid grid-cols-4 gap-[18px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={SKELETON + " h-[104px]"} />
          ))}
        </div>
        <div className={SKELETON + " h-[360px]"} />
      </div>
    );
  }

  const { alumni, summary } = data;
  const watch = alumni.filter((a) => a.relapseRisk === "watch");
  const rows = sortByScore
    ? [...alumni].sort((a, b) => a.continuumScore - b.continuumScore)
    : alumni; // API already returns watch-first

  const stats = [
    { label: "Alumni tracked", value: summary.alumniCount, green: false, amber: false },
    { label: "On watch", value: summary.watchCount, green: summary.watchCount === 0, amber: summary.watchCount > 0 },
    { label: "Avg continuum score", value: summary.avgScore, green: false, amber: false },
    { label: "Follow-ups due", value: summary.cadenceDue, green: false, amber: false },
  ];

  return (
    <div className="flex flex-col gap-5">
      {header}

      {/* Summary stat row */}
      <div className="grid grid-cols-4 gap-[18px]">
        {stats.map((s) => (
          <div key={s.label} className={CARD + " px-[26px] py-5"}>
            <div className="text-[13px] font-medium text-ink-600">{s.label}</div>
            <div
              className={
                "tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] " +
                (s.amber
                  ? "text-amber-ink"
                  : s.green
                    ? "text-success"
                    : "text-blue-primary")
              }
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Re-engagement queue - watch members, quiet "Reach out" action */}
      {watch.length > 0 && (
        <div
          className={CARD + " border-l-[3px] border-l-gold-badge px-[30px] py-[22px]"}
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 items-center rounded-full bg-amber-bg px-3 text-[11px] font-extrabold tracking-[.06em] text-amber-ink">
              RE-ENGAGEMENT QUEUE
            </span>
            <span className="text-[13px] font-medium text-ink-600">
              {watch.length} alum{watch.length === 1 ? "nus" : "ni"} showing an
              engagement dip
            </span>
          </div>
          <div className="mt-3.5 flex flex-col">
            {watch.map((a, i) => (
              <div
                key={a.id}
                className={
                  "flex items-center gap-3.5 py-3 " +
                  (i < watch.length - 1 ? "border-b border-canvas" : "")
                }
              >
                <div
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-extrabold text-white"
                  style={{ background: a.avatarColor }}
                >
                  {a.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink-900">{a.name}</div>
                  <div className="text-xs text-ink-600">
                    Last active {relActive(a.lastActive)} · score{" "}
                    <span className="tnum font-bold text-amber-ink">
                      {a.continuumScore}
                    </span>
                  </div>
                </div>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex-none cursor-pointer text-[13px] font-bold text-blue-primary hover:underline"
                >
                  Reach out
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roster */}
      <div className={CARD + " overflow-hidden"}>
        <div className="flex items-center justify-between px-[26px] pb-3 pt-[22px]">
          <div className="text-base font-bold text-ink-900">
            Post-discharge roster
          </div>
          <button
            type="button"
            onClick={() => setSortByScore((v) => !v)}
            className="inline-flex h-9 cursor-pointer items-center rounded-full border-[1.5px] border-sky-tint bg-white px-4 text-[12.5px] font-semibold text-ink-600 hover:border-blue-primary"
          >
            Sort: {sortByScore ? "score ▾" : "risk ▾"}
          </button>
        </div>

        <div
          className={
            GRID +
            " bg-canvas px-[26px] py-3 text-xs font-bold tracking-[.06em] text-ink-600"
          }
        >
          <span>ALUMNUS</span>
          <span>SINCE DISCHARGE</span>
          <span>SCORE</span>
          <span>FOLLOW-UP CADENCE</span>
          <span>RISK</span>
          <span>LAST ACTIVE</span>
        </div>

        {rows.length === 0 && (
          <div className="border-t border-canvas px-[26px] py-10 text-center text-[13px] font-semibold text-ink-400">
            No alumni in continuing care yet.
          </div>
        )}

        {rows.map((a) => (
          <div
            key={a.id}
            className={
              GRID +
              " items-center border-t border-canvas py-4 pr-[26px] " +
              (a.relapseRisk === "watch"
                ? "border-l-[3px] border-l-gold-badge bg-amber-bg/40 pl-[23px]"
                : "border-l-[3px] border-l-transparent pl-[23px]")
            }
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-extrabold text-white"
                style={{ background: a.avatarColor }}
              >
                {a.name[0]}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold text-ink-900">
                  {a.name}
                </div>
                <div className="text-xs text-ink-600">#{a.memberNumber}</div>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-ink-900">
              {a.monthsSinceDischarge} mo
            </span>
            <span className="tnum text-[15px] font-extrabold text-blue-primary">
              {a.continuumScore}
            </span>
            <span className="flex flex-wrap gap-1">
              {a.cadence.map((c) => (
                <CadenceChip key={c.dueDay} entry={c} />
              ))}
            </span>
            <span>
              {a.relapseRisk === "watch" ? (
                <span className="inline-flex h-6 items-center rounded-full bg-amber-bg px-2.5 text-[11px] font-bold text-amber-ink">
                  watch
                </span>
              ) : (
                <span className="inline-flex h-6 items-center rounded-full bg-[#E8F8F0] px-2.5 text-[11px] font-bold text-success">
                  low
                </span>
              )}
            </span>
            <span className="text-[13px] font-semibold text-ink-600">
              {relActive(a.lastActive)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
