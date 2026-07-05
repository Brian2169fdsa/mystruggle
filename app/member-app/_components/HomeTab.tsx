"use client";

import { Heart } from "lucide-react";
import CommunityFeed from "@/app/components/feed/CommunityFeed";
import type { SafeUser } from "@/app/lib/types";
import type { Task } from "./MemberApp";
import { DOMAIN_LABELS, type PlanGoal } from "./PlanView";

/** Heart-reaction pill: outline → red fill, count +1. */
function HeartPill({
  liked,
  base,
  onToggle,
}: {
  liked: boolean;
  base: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-[13px] font-bold " +
        (liked
          ? "border-heart-bg bg-heart-bg text-heart-red"
          : "border-sky-tint bg-white text-ink-600")
      }
    >
      <Heart size={14} fill={liked ? "currentColor" : "none"} />
      <span className="tnum">{base + (liked ? 1 : 0)}</span>
    </button>
  );
}

function Avatar({ letter }: { letter: string }) {
  return (
    <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-sky-tint text-[16px] font-extrabold text-indigo-brand">
      {letter}
    </div>
  );
}

export default function HomeTab({
  tasks,
  toggleTask,
  trackerPct,
  heart3,
  toggleHeart3,
  sharedWin,
  user = null,
  planGoals = null,
  openPlan,
}: {
  tasks: Task[];
  toggleTask: (i: number) => void;
  trackerPct: number;
  heart3: boolean;
  toggleHeart3: () => void;
  sharedWin: boolean;
  user?: SafeUser | null;
  planGoals?: PlanGoal[] | null;
  openPlan?: () => void;
}) {
  const firstName = user?.name ?? "Danielle";
  const streak = user ? (user.streak ?? 0) : 12;
  const activeGoals = (planGoals ?? []).filter((g) => g.status === "active");
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="bg-white px-5 pb-3.5 pt-[18px]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
              Welcome home, {firstName}
            </div>
            <div className="mt-0.5 text-[13px] font-medium text-ink-600">
              Friday, July 4 · Laveen Center
            </div>
          </div>
          {streak > 0 ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gold-bg px-3.5 text-[13px] font-extrabold text-gold-ink">
              ◆ {streak}-day streak
            </span>
          ) : (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sky-tint px-3.5 text-[13px] font-bold text-blue-primary">
              Start your streak today
            </span>
          )}
        </div>
      </div>
      <div className="hairline" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Dual progress rings + one-tap tasks */}
        <div className="rounded-2xl bg-white px-5 py-[22px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-2.5">
              <div
                className="flex h-[110px] w-[110px] items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#2E7CD6 0 ${trackerPct}%, #EAF2FC ${trackerPct}% 100%)`,
                }}
              >
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white">
                  <div className="tnum text-[24px] font-extrabold text-blue-primary">
                    {trackerPct}%
                  </div>
                </div>
              </div>
              <div className="text-[13px] font-bold text-ink-900">My Tracker</div>
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[conic-gradient(#4E5B9B_0_45%,#EAF2FC_45%_100%)]">
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white">
                  <div className="tnum text-[24px] font-extrabold text-indigo-brand">
                    45%
                  </div>
                </div>
              </div>
              <div className="text-[13px] font-bold text-ink-900">My Center</div>
            </div>
          </div>
          {/* MY PLAN — compact recovery-goal summary (docs/13 Part C),
              signed in only. Sits between the rings and the tasks. */}
          {user && activeGoals.length > 0 && (
            <div className="mt-[18px] rounded-xl bg-canvas px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-[.12em] text-indigo-brand">
                  MY PLAN
                </span>
                {openPlan && (
                  <button
                    type="button"
                    onClick={openPlan}
                    className="inline-flex min-h-[32px] cursor-pointer items-center text-[12px] font-bold text-blue-primary"
                  >
                    Open My Plan →
                  </button>
                )}
              </div>
              <div className="mt-1 flex flex-col gap-3">
                {activeGoals.map((g) => (
                  <div key={g.id}>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-[18px] flex-none items-center rounded-full bg-sky-tint px-2 text-[9px] font-extrabold tracking-[.06em] text-blue-primary">
                        {DOMAIN_LABELS[g.domain].toUpperCase()}
                      </span>
                      <span className="min-w-0 truncate text-[13px] font-bold text-ink-900">
                        {g.title}
                      </span>
                      <span className="tnum ml-auto flex-none text-[11px] font-extrabold text-blue-primary">
                        {g.progressPct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-[6px] w-full overflow-hidden rounded-full bg-sky-tint">
                      <div
                        className="h-full rounded-full bg-blue-primary"
                        style={{ width: `${g.progressPct}%` }}
                      />
                    </div>
                    {g.linkedRequest && (
                      <div className="tnum mt-1 text-[11px] font-semibold text-ink-600">
                        ${g.linkedRequest.raised} of $
                        {g.linkedRequest.weeklyTarget} weekly funding raised
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-[18px] flex flex-col border-t border-sky-tint">
            {tasks.map((task, i) => (
              <button
                key={task.label + i}
                type="button"
                onClick={() => toggleTask(i)}
                className="flex min-h-[52px] cursor-pointer items-center gap-3.5 border-b border-canvas text-left"
              >
                <span
                  className={
                    "inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg border-2 text-[14px] font-bold text-white " +
                    (task.done
                      ? "border-success bg-success"
                      : "border-[#C7DBF4] bg-white")
                  }
                >
                  {task.done ? "✓" : ""}
                </span>
                <span
                  className={
                    "text-[14px] font-medium " +
                    (task.done ? "text-ink-400 line-through" : "text-ink-900")
                  }
                >
                  {task.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Community feed */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
            COMMUNITY
          </span>
          <span className="text-[12px] font-semibold text-ink-600">
            Laveen Center ▾
          </span>
        </div>

        {/* Local fallback win card — only when the celebration share
            couldn't post to the API (signed out). */}
        {sharedWin && (
          <div className="rounded-2xl border-[1.5px] border-gold-border bg-white px-5 py-[18px] shadow-[0_2px_8px_rgba(234,179,8,.15)]">
            <div className="flex items-center gap-3">
              <Avatar letter="D" />
              <div>
                <div className="text-[14px] font-bold text-ink-900">
                  Danielle{" "}
                  <span className="ml-1 inline-flex h-5 items-center rounded-full bg-gold-bg px-2 text-[10px] font-extrabold text-gold-ink">
                    ◆ WIN
                  </span>
                </div>
                <div className="text-[12px] text-ink-600">
                  Just now · Laveen Center
                </div>
              </div>
            </div>
            <div className="mt-3 text-[15px]/[1.6] font-medium text-ink-900">
              Just finished Lesson 2 of ISE Course 3 — made a decision. +10
              points and the streak lives on.
            </div>
            <div className="mt-3.5 flex items-center gap-4">
              <HeartPill liked={heart3} base={0} onToggle={toggleHeart3} />
              <span className="text-[13px] font-semibold text-ink-600">
                0 comments
              </span>
            </div>
          </div>
        )}

        <CommunityFeed compact />
      </div>
    </div>
  );
}
