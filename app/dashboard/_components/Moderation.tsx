"use client";

import { CARD } from "./types";
import type { ModStatus, Verdict } from "./types";

const POSTS: {
  key: keyof ModStatus;
  author: string;
  initial: string;
  meta: string;
  text: string;
  aiText: string;
  aiBg: string;
  aiColor: string;
}[] = [
  {
    key: "jasmine",
    author: "Jasmine R. · update with photo",
    initial: "J",
    meta: "40 min ago · Laveen Center audience",
    text: '"First paycheck cashed at the center today. Groceries bought with MY money."',
    aiText:
      "Recommend approve. Photo pended for routine review (faces of others not detected). No policy concerns.",
    aiBg: "#EAF2FC",
    aiColor: "#2E7CD6",
  },
  {
    key: "kevin",
    author: "Kevin D. · question",
    initial: "K",
    meta: "2 hrs ago · community audience",
    text: '"anyone got a number for the guy who does day labor pickups on 35th? hmu 602-555-…"',
    aiText:
      "Recommend flag: personal contact info shared publicly. Suggest asking author to route through center staff — job leads should go via the NAV program.",
    aiBg: "#FFF9EC",
    aiColor: "#A16207",
  },
];

const VERDICTS: Record<
  Exclude<Verdict, "pending">,
  { label: string; bg: string; color: string }
> = {
  approved: { label: "✓ APPROVED", bg: "#E8F8F0", color: "#12B76A" },
  flagged: {
    label: "⚑ FLAGGED — EDIT REQUESTED",
    bg: "#FFF9EC",
    color: "#A16207",
  },
  removed: { label: "REMOVED", bg: "#F1F5F9", color: "#4B5563" },
};

export default function Moderation({
  pendingCount,
  modStatus,
  onVerdict,
  goParticipants,
}: {
  pendingCount: number;
  modStatus: ModStatus;
  onVerdict: (key: keyof ModStatus, verdict: Verdict) => void;
  goParticipants: () => void;
}) {
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Moderation queue{" "}
          <span className="text-[15px] font-semibold text-ink-600">
            · {pendingCount} pending
          </span>
        </div>
        <div className="flex gap-2.5">
          <span className="inline-flex h-[38px] items-center rounded-full bg-blue-primary px-[18px] text-[13px] font-bold text-white">
            Pending
          </span>
          <button
            type="button"
            className="inline-flex h-[38px] cursor-pointer items-center rounded-full border-[1.5px] border-sky-tint bg-white px-[18px] text-[13px] font-semibold text-ink-600"
          >
            Resolved
          </button>
        </div>
      </div>

      {/* CRISIS — always pinned, crisis red lives only here */}
      <div className="rounded-2xl border-[1.5px] border-[#F5C6C8] bg-white px-[30px] py-6 shadow-[0_2px_10px_rgba(229,72,77,.12)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-[26px] items-center rounded-full bg-heart-red px-3 text-[11px] font-extrabold text-white">
            CRISIS — HELD
          </span>
          <span className="text-[13px] font-semibold text-ink-600">
            Anonymous to feed · staff + admin alerted 12 min ago
          </span>
        </div>
        <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] font-medium text-ink-900">
          &quot;I don&apos;t see the point anymore. tired of trying&quot;
        </div>
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl bg-heart-bg px-4 py-3">
          <span className="mt-0.5 flex-none text-[11px] font-extrabold text-heart-red">
            AI REVIEW
          </span>
          <span className="text-[13px]/[1.6] font-medium text-ink-900">
            Self-harm signal detected. Post held from feed; author shown
            supportive resources. Recommend: personal follow-up today — do not
            resolve without human contact.
          </span>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={goParticipants}
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-heart-red px-6 text-[13px] font-bold text-white"
          >
            Open member · follow up
          </button>
          <button
            type="button"
            className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-[#E2E8F0] px-6 text-[13px] font-bold text-ink-600"
          >
            Assign to Sarah
          </button>
        </div>
      </div>

      {POSTS.map((p) => {
        const status = modStatus[p.key];
        const pending = status === "pending";
        const verdict = pending ? null : VERDICTS[status];
        return (
          <div
            key={p.key}
            className={
              CARD +
              " px-[30px] py-6" +
              (status === "removed" ? " opacity-50" : "")
            }
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-tint text-[15px] font-extrabold text-indigo-brand">
                {p.initial}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-ink-900">{p.author}</div>
                <div className="text-xs text-ink-600">{p.meta}</div>
              </div>
              {verdict && (
                <span
                  className="inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-extrabold"
                  style={{ background: verdict.bg, color: verdict.color }}
                >
                  {verdict.label}
                </span>
              )}
            </div>
            <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] font-medium text-ink-900">
              {p.text}
            </div>
            <div
              className="mt-3.5 flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{ background: p.aiBg }}
            >
              <span
                className="mt-0.5 flex-none text-[11px] font-extrabold"
                style={{ color: p.aiColor }}
              >
                AI REVIEW
              </span>
              <span className="text-[13px]/[1.6] font-medium text-ink-900">
                {p.aiText}
              </span>
            </div>
            {pending && (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => onVerdict(p.key, "approved")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full bg-success px-6 text-[13px] font-bold text-white"
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  onClick={() => onVerdict(p.key, "flagged")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-gold-badge px-6 text-[13px] font-bold text-amber-ink hover:bg-amber-bg"
                >
                  ⚑ Flag · request edit
                </button>
                <button
                  type="button"
                  onClick={() => onVerdict(p.key, "removed")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-[#E2E8F0] px-6 text-[13px] font-bold text-ink-600"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
