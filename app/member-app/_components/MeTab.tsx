"use client";

import Link from "next/link";
import type { SafeUser, SupportRequest } from "@/app/lib/types";

const JOURNEY: {
  title: string;
  sub: string;
  state: "done" | "current" | "future";
  lineColor?: string;
}[] = [
  {
    title: "Outreach",
    sub: "Met the Laveen team · Oct 2025",
    state: "done",
    lineColor: "#12B76A",
  },
  {
    title: "Stabilization",
    sub: "Matched with Marcus · Nov 2025",
    state: "done",
    lineColor: "#12B76A",
  },
  {
    title: "In Program",
    sub: "GED + first job · Feb 2026",
    state: "done",
    lineColor: "#2E7CD6",
  },
  {
    title: "Transitional — you are here",
    sub: "Hallway house · $175/week goal",
    state: "current",
    lineColor: "#E2E8F0",
  },
  { title: "Independent", sub: "A place of her own", state: "future" },
];

/** Level ladder: Bronze→Silver at 640 pts, Silver→Gold at 1,000. */
function levelProgress(level: string, points: number) {
  const lv = level.toLowerCase();
  if (lv === "gold")
    return { from: "Gold", to: "Top level — well done", pct: 100 };
  if (lv === "silver")
    return {
      from: "Silver",
      to: "Gold at 1,000",
      pct: Math.min(100, Math.round((points / 1000) * 100)),
    };
  return {
    from: "Bronze",
    to: "Silver at 640",
    pct: Math.min(100, Math.round((points / 640) * 100)),
  };
}

export default function MeTab({
  points,
  lessonDone,
  user = null,
  requests = null,
}: {
  points: number;
  lessonDone: boolean;
  user?: SafeUser | null;
  requests?: SupportRequest[] | null;
}) {
  // Signed in → real profile (MemberApp keeps user.points current after
  // lesson completions); signed out → the styled Danielle demo.
  const displayName = user?.name ?? "Danielle";
  const displayPoints = user ? (user.points ?? 0) : points;
  const level = user ? (user.level ?? "Bronze") : "Silver";
  const progress = levelProgress(level, displayPoints);
  const memberNumber = user ? user.memberNumber : "039521464";
  const initial = displayName.charAt(0).toUpperCase();
  const myRequests = user ? (requests ?? []) : null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Navy profile header */}
      <div className="bg-navy-deep px-5 pb-6 pt-3 text-center">
        {!user ? (
          <div className="flex justify-end">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center px-2 text-[13px] font-bold text-[#8FBCF0]"
            >
              Sign in →
            </Link>
          </div>
        ) : (
          <div className="min-h-[16px]" />
        )}
        {user ? (
          <div
            className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-white/25 text-[30px] font-extrabold text-white"
            style={{ background: user.avatarColor }}
          >
            {initial}
          </div>
        ) : (
          <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-white/25 bg-sky-tint text-[30px] font-extrabold text-indigo-brand">
            D
          </div>
        )}
        <div className="mt-3 text-[22px] font-extrabold text-white">
          {displayName}
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-2">
          {memberNumber && (
            <span className="inline-flex h-[26px] items-center rounded-full bg-white/[.12] px-3 text-[11px] font-bold text-[#8FBCF0]">
              Member #{memberNumber}
            </span>
          )}
          <span className="tnum inline-flex h-[26px] items-center gap-[5px] rounded-full bg-[rgba(234,179,8,.18)] px-3 text-[11px] font-extrabold text-gold-badge">
            ◆ {level.toUpperCase()} · {displayPoints} pts
          </span>
        </div>
        <div className="mx-auto mt-3.5 max-w-[260px]">
          <div className="flex justify-between text-[10px] font-semibold text-[#8FBCF0]">
            <span>{progress.from}</span>
            <span>{progress.to}</span>
          </div>
          <div className="mt-[5px] h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gold-badge"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="hairline" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {user && (
          <>
            {/* My story */}
            <div className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
              MY STORY
            </div>
            <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              {user.story ? (
                <p className="text-[14px]/[1.6] font-medium text-ink-900">
                  {user.story}
                </p>
              ) : (
                <p className="text-[14px]/[1.6] font-medium text-ink-600">
                  Your story matters. Add it from your giving page settings so
                  supporters can hear it in your own words.
                </p>
              )}
            </div>

            {/* Support requests */}
            <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
              MY SUPPORT REQUESTS
            </div>
            <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              {myRequests && myRequests.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {myRequests.map((req) => {
                    const funded = req.status === "funded";
                    const pct = Math.min(
                      100,
                      Math.round(
                        (req.raised / Math.max(1, req.weeklyTarget)) * 100,
                      ),
                    );
                    return (
                      <div key={req.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] font-bold text-ink-900">
                            {req.label}
                          </span>
                          {funded ? (
                            <span className="inline-flex h-[22px] items-center rounded-full bg-[#E7F8F0] px-2.5 text-[10px] font-extrabold text-success">
                              ✓ FUNDED
                            </span>
                          ) : (
                            <span className="tnum text-[12px] font-semibold text-ink-600">
                              ${req.raised} of ${req.weeklyTarget}/wk
                            </span>
                          )}
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-tint">
                          <div
                            className={
                              "h-full rounded-full " +
                              (funded ? "bg-success" : "bg-blue-primary")
                            }
                            style={{ width: `${funded ? 100 : pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[14px]/[1.6] font-medium text-ink-600">
                  No support requests yet — your mentor can help you set one up
                  when you're ready.
                </p>
              )}
            </div>

            {/* QR share card */}
            {user.slug && (
              <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
                <div className="flex items-center gap-4">
                  <img
                    src={`/api/qr/${user.slug}`}
                    alt={`QR code for ${displayName}'s giving page`}
                    className="h-[88px] w-[88px] flex-none rounded-xl border border-sky-tint bg-white p-1.5"
                  />
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-ink-900">
                      Your giving page
                    </div>
                    <div className="mt-0.5 text-[12px] text-ink-600">
                      Anyone who scans this can support you directly.
                    </div>
                    <Link
                      href={`/p/${user.slug}`}
                      className="mt-1 inline-flex min-h-[44px] items-center text-[13px] font-bold text-blue-primary"
                    >
                      Share your page → /p/{user.slug}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Badges */}
        <div className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
          MY BADGES
        </div>
        <div className="grid grid-cols-4 gap-3">
          {["First Week", "GED Earned", "30-Day Streak"].map((name) => (
            <div
              key={name}
              className="rounded-2xl border-[1.5px] border-gold-border bg-white px-2 py-3.5 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold-bg text-[16px] font-extrabold text-gold-ink">
                ◆
              </div>
              <div className="mt-2 text-[10px]/[1.3] font-bold text-ink-900">
                {name}
              </div>
            </div>
          ))}
          {/* Course Champ — unlocked by completing the lesson */}
          <div
            className={
              "rounded-2xl border-[1.5px] bg-white px-2 py-3.5 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)] " +
              (lessonDone ? "border-gold-border" : "border-white opacity-45")
            }
          >
            <div
              className={
                "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-extrabold " +
                (lessonDone
                  ? "bg-gold-bg text-gold-ink"
                  : "bg-[#F1F5F9] text-ink-400")
              }
            >
              {lessonDone ? "◆" : "◇"}
            </div>
            <div className="mt-2 text-[10px]/[1.3] font-bold text-ink-900">
              Course Champ
            </div>
          </div>
        </div>

        {/* Journey timeline */}
        <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
          MY JOURNEY
        </div>
        <div className="rounded-2xl bg-white px-6 pb-5 pt-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="flex flex-col">
            {JOURNEY.map((step, i) => {
              const last = i === JOURNEY.length - 1;
              return (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {step.state === "done" && (
                      <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-success text-[11px] font-bold text-white">
                        ✓
                      </span>
                    )}
                    {step.state === "current" && (
                      <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-blue-primary text-[10px] font-bold text-white shadow-[0_0_0_4px_#EAF2FC]">
                        ●
                      </span>
                    )}
                    {step.state === "future" && (
                      <span className="h-[22px] w-[22px] flex-none rounded-full border-2 border-[#E2E8F0]" />
                    )}
                    {!last && (
                      <div
                        className="min-h-[26px] w-0.5 flex-1"
                        style={{ background: step.lineColor }}
                      />
                    )}
                  </div>
                  <div className={last ? "" : "pb-[18px]"}>
                    <div
                      className={
                        "text-[14px] font-bold " +
                        (step.state === "current"
                          ? "text-blue-primary"
                          : step.state === "future"
                            ? "text-ink-400"
                            : "text-ink-900")
                      }
                    >
                      {step.title}
                    </div>
                    <div
                      className={
                        "text-[12px] " +
                        (step.state === "future" ? "text-ink-400" : "text-ink-600")
                      }
                    >
                      {step.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
