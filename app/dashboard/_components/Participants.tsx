"use client";

import { useState } from "react";
import { CARD, SKELETON, relJoined } from "./types";
import type { AdminMember } from "./types";

const GRID = "grid grid-cols-[2.2fr_1.3fr_1fr_1fr_1fr_1.1fr_.8fr]";

export default function Participants({
  members,
  riskOnly,
  onToggleRisk,
  onOpenMember,
}: {
  members: AdminMember[] | null;
  riskOnly: boolean;
  onToggleRisk: () => void;
  onOpenMember: (m: AdminMember) => void;
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const all = members ?? [];
  const filtered = all.filter(
    (m) =>
      (!riskOnly || m.streak === 0) &&
      (!q || m.name.toLowerCase().includes(q) || m.memberNumber.includes(q))
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Participants{" "}
          <span className="text-[15px] font-semibold text-ink-600">
            {members ? `· ${members.length} members` : "· loading…"}
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
          All levels ▾
        </button>
        <button
          type="button"
          className="inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-sky-tint bg-white px-[18px] text-[13px] font-semibold text-ink-600"
        >
          Mentor: any ▾
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
          <span>LEVEL</span>
          <span>MENTOR</span>
          <span>STREAK</span>
          <span>POINTS</span>
          <span>JOINED</span>
          <span>RISK</span>
        </div>

        {!members &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-t border-canvas px-[26px] py-4">
              <div className={SKELETON + " h-9 rounded-xl"} />
            </div>
          ))}

        {members &&
          filtered.map((m) => (
            <div
              key={m.id}
              onClick={() => onOpenMember(m)}
              className={
                GRID +
                " cursor-pointer items-center border-t border-canvas px-[26px] py-4 hover:bg-sky-tint"
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold text-white"
                  style={{ background: m.avatarColor }}
                >
                  {m.name[0]}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-ink-900">
                    {m.name}
                  </div>
                  <div className="text-xs text-ink-600">#{m.memberNumber}</div>
                </div>
              </div>
              <span>
                <span className="inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
                  {m.level}
                </span>
              </span>
              <span className="text-[13px] font-bold text-indigo-brand">
                {m.mentorName ? (
                  `Mentor: ${m.mentorName}`
                ) : (
                  <span className="font-semibold text-ink-400">-</span>
                )}
              </span>
              <span
                className={
                  "tnum text-sm font-bold " +
                  (m.streak > 0 ? "text-gold-ink" : "text-ink-400")
                }
              >
                {m.streak > 0 ? `◆ ${m.streak}d` : "paused"}
              </span>
              <span className="tnum text-sm font-semibold text-ink-900">
                {m.points.toLocaleString("en-US")} pts
              </span>
              <span className="text-[13px] font-semibold text-ink-600">
                {relJoined(m.joinedAt)}
              </span>
              <span>
                {m.streak === 0 ? (
                  <span className="inline-flex h-6 items-center rounded-full bg-amber-bg px-2.5 text-[11px] font-bold text-amber-ink">
                    watch
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold text-ink-400">
                    -
                  </span>
                )}
              </span>
            </div>
          ))}

        {members && filtered.length === 0 && (
          <div className="border-t border-canvas px-[26px] py-8 text-center text-[13px] font-semibold text-ink-400">
            No members match this view.
          </div>
        )}
      </div>

      <div className="flex justify-between text-[13px] font-semibold text-ink-600">
        <span>
          Showing {filtered.length === 0 ? 0 : 1}–{filtered.length} of{" "}
          {all.length}
        </span>
        <span className="text-blue-primary">1 →</span>
      </div>
    </div>
  );
}
