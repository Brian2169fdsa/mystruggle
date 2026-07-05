"use client";

import { useState } from "react";
import { CARD } from "./types";

type Row = {
  name: string;
  num: string;
  stage: string;
  stageBg: string;
  stageColor: string;
  program: string;
  streak: string;
  streakGold: boolean;
  course: string;
  active: string;
  activeColor: string;
  risk: "watch" | "follow up" | null;
};

const ROWS: Row[] = [
  {
    name: "Danielle",
    num: "#039521464",
    stage: "Transitional",
    stageBg: "#DDEBFB",
    stageColor: "#2E7CD6",
    program: "PON",
    streak: "◆ 12d",
    streakGold: true,
    course: "45%",
    active: "today",
    activeColor: "#12B76A",
    risk: null,
  },
  {
    name: "Tyrell",
    num: "#039521502",
    stage: "In Program",
    stageBg: "#F0EDFB",
    stageColor: "#4E5B9B",
    program: "IOP",
    streak: "paused",
    streakGold: false,
    course: "15%",
    active: "6 days",
    activeColor: "#A16207",
    risk: "watch",
  },
  {
    name: "Maria",
    num: "#039521477",
    stage: "Stabilization",
    stageBg: "#F0EDFB",
    stageColor: "#4E5B9B",
    program: "PON",
    streak: "◆ 3d",
    streakGold: true,
    course: "22%",
    active: "today",
    activeColor: "#12B76A",
    risk: "follow up",
  },
  {
    name: "Andre",
    num: "#039521511",
    stage: "Outreach",
    stageBg: "#EAF2FC",
    stageColor: "#2E7CD6",
    program: "NAV",
    streak: "day 1",
    streakGold: false,
    course: "—",
    active: "today",
    activeColor: "#12B76A",
    risk: null,
  },
  {
    name: "Jasmine",
    num: "#039521433",
    stage: "Transitional",
    stageBg: "#DDEBFB",
    stageColor: "#2E7CD6",
    program: "VOC",
    streak: "◆ 21d",
    streakGold: true,
    course: "78%",
    active: "today",
    activeColor: "#12B76A",
    risk: null,
  },
  {
    name: "Robert",
    num: "#039521390",
    stage: "Independent",
    stageBg: "#E8F8F0",
    stageColor: "#12B76A",
    program: "PON",
    streak: "alumni",
    streakGold: false,
    course: "100%",
    active: "2 weeks",
    activeColor: "#4B5563",
    risk: null,
  },
];

const GRID = "grid grid-cols-[2.2fr_1.3fr_1fr_1fr_1fr_1.1fr_.8fr]";

export default function Participants({
  riskOnly,
  onToggleRisk,
  onOpenDanielle,
}: {
  riskOnly: boolean;
  onToggleRisk: () => void;
  onOpenDanielle: () => void;
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = ROWS.filter(
    (r) =>
      (!riskOnly || r.risk) &&
      (!q || r.name.toLowerCase().includes(q) || r.num.includes(q))
  );
  const total = riskOnly || q ? filtered.length : 214;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Participants{" "}
          <span className="text-[15px] font-semibold text-ink-600">
            · 214 members
          </span>
        </div>
        <button
          type="button"
          className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-6 text-sm font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover"
        >
          + New member
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or member #…"
          className="h-11 w-[300px] rounded-full border-[1.5px] border-sky-tint bg-white px-5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
        />
        <button
          type="button"
          className="inline-flex h-10 cursor-pointer items-center rounded-full bg-blue-primary px-[18px] text-[13px] font-bold text-white"
        >
          All stages ▾
        </button>
        <button
          type="button"
          className="inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-sky-tint bg-white px-[18px] text-[13px] font-semibold text-ink-600"
        >
          Program: any ▾
        </button>
        <button
          type="button"
          onClick={onToggleRisk}
          className={
            "inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] px-[18px] text-[13px] " +
            (riskOnly
              ? "border-blue-primary bg-sky-tint font-bold text-blue-primary"
              : "border-sky-tint bg-white font-semibold text-ink-600")
          }
        >
          Needs attention only
        </button>
      </div>

      <div className={CARD + " overflow-hidden"}>
        <div
          className={
            GRID +
            " bg-canvas px-[26px] py-3.5 text-xs font-bold tracking-[.06em] text-ink-600"
          }
        >
          <span>MEMBER</span>
          <span>STAGE</span>
          <span>PROGRAM</span>
          <span>STREAK</span>
          <span>COURSE</span>
          <span>LAST ACTIVE</span>
          <span>RISK</span>
        </div>
        {filtered.map((r) => (
          <div
            key={r.num}
            onClick={r.name === "Danielle" ? onOpenDanielle : undefined}
            className={
              GRID +
              " cursor-pointer items-center border-t border-canvas px-[26px] py-4 hover:bg-sky-tint"
            }
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-tint text-sm font-extrabold text-indigo-brand">
                {r.name[0]}
              </div>
              <div>
                <div className="text-[15px] font-bold text-ink-900">
                  {r.name}
                </div>
                <div className="text-xs text-ink-600">{r.num}</div>
              </div>
            </div>
            <span>
              <span
                className="inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-bold"
                style={{ background: r.stageBg, color: r.stageColor }}
              >
                {r.stage}
              </span>
            </span>
            <span className="text-[13px] font-bold text-indigo-brand">
              {r.program}
            </span>
            <span
              className={
                "tnum text-sm font-bold " +
                (r.streakGold ? "text-gold-ink" : "text-ink-400")
              }
            >
              {r.streak}
            </span>
            <span className="tnum text-sm font-semibold text-ink-900">
              {r.course}
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: r.activeColor }}
            >
              {r.active}
            </span>
            <span>
              {r.risk ? (
                <span
                  className={
                    "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold " +
                    (r.risk === "watch"
                      ? "bg-amber-bg text-amber-ink"
                      : "bg-heart-bg text-heart-red")
                  }
                >
                  {r.risk}
                </span>
              ) : (
                <span className="text-[13px] font-semibold text-ink-400">
                  —
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[13px] font-semibold text-ink-600">
        <span>
          Showing 1–{filtered.length} of {total}
        </span>
        <span className="text-blue-primary">1 · 2 · 3 · … · 36 →</span>
      </div>
    </div>
  );
}
