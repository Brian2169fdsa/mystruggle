"use client";

import { useEffect, useState } from "react";
import { CARD, SKELETON, fmtMoney, relTime } from "./types";
import type { OverviewData } from "./types";

/** One row of GET /api/concerns (staff-only). */
type ConcernRow = {
  id: string;
  note?: string;
  status: "open" | "resolved";
  createdAt: number;
  mentorName: string | null;
  memberName: string | null;
  memberNumber: string | null;
};

const KPIS = [
  { chip: "PON", indigo: false, n: "128" },
  { chip: "VOC", indigo: true, n: "64" },
  { chip: "IOP", indigo: false, n: "43" },
  { chip: "NAV", indigo: true, n: "87" },
];

// Engagement trend - 12 weekly bars, pale below goal → primary blue above.
const BARS = [
  { h: 52, c: "#C7DBF4" },
  { h: 58, c: "#C7DBF4" },
  { h: 55, c: "#C7DBF4" },
  { h: 63, c: "#8FBCF0" },
  { h: 60, c: "#C7DBF4" },
  { h: 67, c: "#2E7CD6" },
  { h: 64, c: "#8FBCF0" },
  { h: 70, c: "#2E7CD6" },
  { h: 66, c: "#2E7CD6" },
  { h: 72, c: "#2E7CD6" },
  { h: 69, c: "#2E7CD6" },
  { h: 71, c: "#2E7CD6" },
];

const STAGES = [
  { label: "Outreach", n: "124", w: "100%", c: "#2E7CD6", green: false },
  { label: "Stabilization", n: "96", w: "77%", c: "#4E7BC4", green: false },
  { label: "In Program", n: "71", w: "57%", c: "#4E5B9B", green: false },
  { label: "Transitional", n: "38", w: "31%", c: "#8FBCF0", green: false },
  { label: "Independent", n: "22", w: "18%", c: "#12B76A", green: true },
];

const MILESTONES = [
  {
    glyph: "◆",
    bg: "bg-gold-bg",
    color: "text-gold-ink",
    body: (
      <>
        Danielle earned <strong>30-Day Streak</strong>
      </>
    ),
  },
  {
    glyph: "✓",
    bg: "bg-[#E8F8F0]",
    color: "text-success",
    body: (
      <>
        Jasmine advanced to <strong>Transitional</strong>
      </>
    ),
  },
  {
    glyph: "♥",
    bg: "bg-sky-tint",
    color: "text-blue-primary",
    body: (
      <>
        Marcus T.&apos;s housing goal <strong>fully funded</strong>
      </>
    ),
  },
];

/** LIVE PLATFORM strip - 7 KPIs fed from /api/admin/overview. */
function liveKpis(o: OverviewData) {
  return [
    { label: "Members", value: String(o.members), green: false },
    { label: "Total given", value: fmtMoney(o.totalGiven), green: false },
    { label: "Cash held", value: fmtMoney(o.cashHeld), green: false },
    { label: "Reentry funds held", value: fmtMoney(o.creditsHeld), green: false },
    { label: "Reentry savings held", value: fmtMoney(o.savingsHeld), green: true },
    { label: "Weekly recurring gifts", value: String(o.weeklyRecurring), green: false },
    { label: "Avg streak", value: o.avgStreak.toLocaleString("en-US", { maximumFractionDigits: 1 }), suffix: "days", green: false },
  ] as { label: string; value: string; suffix?: string; green: boolean }[];
}

export default function Overview({
  overview,
  pendingCount,
  goParticipants,
  goModeration,
}: {
  overview: OverviewData | null;
  pendingCount: number;
  goParticipants: () => void;
  goModeration: () => void;
}) {
  // Real open concerns (staff session) - "loading" → skeleton,
  // "denied" (signed out / not staff) → static demo rows stay.
  const [concerns, setConcerns] = useState<ConcernRow[] | "loading" | "denied">(
    "loading"
  );
  // Locally resolved rows: green ✓ + fade instead of vanishing.
  const [resolved, setResolved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/concerns");
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && Array.isArray(data?.concerns)) {
          setConcerns(
            (data.concerns as ConcernRow[]).filter((c) => c.status === "open")
          );
        } else {
          setConcerns("denied");
        }
      } catch {
        if (alive) setConcerns("denied");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const markResolved = async (id: string) => {
    try {
      const res = await fetch("/api/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "resolved" }),
      });
      if (res.ok) setResolved((r) => ({ ...r, [id]: true }));
    } catch {
      /* row simply stays actionable */
    }
  };

  const attention = [
    {
      dot: "bg-gold-badge",
      title: "Tyrell - inactive 6 days (demo)",
      sub: "Mentor Marcus nudged today",
      action: "Open",
      go: goParticipants,
    },
    {
      dot: "bg-gold-badge",
      title: "Maria - mood 1/5 two days running (demo)",
      sub: "Mentor raised a concern · follow up today",
      action: "Open",
      go: goParticipants,
    },
    {
      dot: "bg-gold-badge",
      title: `${pendingCount} post${pendingCount === 1 ? "" : "s"} waiting in moderation`,
      sub: "oldest: 40 minutes",
      action: "Review",
      go: goModeration,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
            Overview
          </div>
          <div className="mt-0.5 text-[13px] font-medium text-ink-600">
            Laveen Center · Friday, July 4
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-[22px] text-sm font-bold text-blue-primary hover:bg-sky-tint"
        >
          Jan 1 – Jul 4 · Edit
        </button>
      </div>

      {/* Row 0 - LIVE PLATFORM KPI strip (fed from /api/admin/overview) */}
      <div>
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="inline-flex h-6 items-center rounded-full bg-sky-tint px-3 text-[11px] font-extrabold tracking-[.06em] text-blue-primary">
            LIVE PLATFORM
          </span>
          <span className="text-xs font-medium text-ink-400">
            real balances &amp; giving · updates on load
          </span>
        </div>
        {overview ? (
          <div className="grid grid-cols-4 gap-[18px]">
            {liveKpis(overview).map((k) => (
              <div key={k.label} className={CARD + " px-[26px] py-5"}>
                <div className="text-[13px] font-medium text-ink-600">
                  {k.label}
                </div>
                <div
                  className={
                    "tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] " +
                    (k.green ? "text-success" : "text-blue-primary")
                  }
                >
                  {k.value}
                  {k.suffix && (
                    <span className="text-[13px] font-semibold text-ink-600">
                      {" "}
                      {k.suffix}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-[18px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={SKELETON + " h-[114px]"} />
            ))}
          </div>
        )}
      </div>

      {/* Row 1 - program KPI cards (static program demo - programs aren't in the data model yet) */}
      <div className="grid grid-cols-4 gap-[18px]">
        {KPIS.map((k) => (
          <div key={k.chip} className={CARD + " px-[26px] py-6"}>
            <span
              className={
                "inline-flex h-6 items-center rounded-full px-3 text-[11px] font-extrabold " +
                (k.indigo
                  ? "bg-[#F0EDFB] text-indigo-brand"
                  : "bg-sky-tint text-blue-primary")
              }
            >
              {k.chip}
            </span>
            <div className="tnum mt-2.5 text-[52px] font-extrabold tracking-[-0.02em] text-blue-primary">
              {k.n}
            </div>
            <div className="text-[13px] font-medium text-ink-600">
              active enrollments
            </div>
          </div>
        ))}
      </div>

      {/* Row 2 - secondary stats */}
      <div className="grid grid-cols-4 gap-[18px]">
        <div className={CARD + " px-[26px] py-5"}>
          <div className="text-[13px] font-medium text-ink-600">
            Weekly engagement
          </div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-success">
            71%{" "}
            <span className="text-[13px] font-semibold text-ink-600">
              / 65% goal
            </span>
          </div>
        </div>
        <div className={CARD + " px-[26px] py-5"}>
          <div className="text-[13px] font-medium text-ink-600">
            Cash redeemed this week
          </div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-blue-primary">
            $1,240
          </div>
        </div>
        <div className={CARD + " px-[26px] py-5"}>
          <div className="text-[13px] font-medium text-ink-600">
            Reentry savings held
          </div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-success">
            $18,400
          </div>
        </div>
        <div className={CARD + " px-[26px] py-5"}>
          <div className="text-[13px] font-medium text-ink-600">Avg streak</div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-blue-primary">
            8.5{" "}
            <span className="text-[13px] font-semibold text-ink-600">days</span>
          </div>
        </div>
      </div>

      {/* Row 3 - engagement trend + journey funnel */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-[18px]">
        <div className={CARD + " px-[30px] py-[26px]"}>
          <div className="flex items-center justify-between">
            <div className="text-base font-bold text-ink-900">
              Engagement trend
            </div>
            <div className="flex gap-4 text-xs font-semibold text-ink-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-blue-primary" />
                weekly active %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 bg-success" />
                65% goal
              </span>
            </div>
          </div>
          <div className="relative mt-[22px] h-[180px]">
            <div className="absolute inset-x-0 bottom-[65%] border-t-2 border-dashed border-success" />
            <div className="absolute inset-0 flex items-end gap-2.5">
              {BARS.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md"
                  style={{ height: `${b.h}%`, background: b.c }}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-400">
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
          </div>
        </div>

        <div className={CARD + " px-[30px] py-[26px]"}>
          <div className="text-base font-bold text-ink-900">Journey stages</div>
          <div className="mt-5 flex flex-col gap-3.5">
            {STAGES.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-[13px] font-semibold text-ink-900">
                  <span>{s.label}</span>
                  <span
                    className={
                      "tnum " + (s.green ? "text-success" : "text-blue-primary")
                    }
                  >
                    {s.n}
                  </span>
                </div>
                <div className="mt-1.5 h-3 rounded-full bg-sky-tint">
                  <div
                    className="h-full rounded-full"
                    style={{ width: s.w, background: s.c }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4 - needs attention + milestones */}
      <div className="grid grid-cols-2 gap-[18px]">
        <div className={CARD + " px-[30px] py-[26px]"}>
          <div className="text-base font-bold text-ink-900">Needs attention</div>

          {/* Loading - quiet skeleton rows */}
          {concerns === "loading" && (
            <div className="mt-3.5 flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={SKELETON + " h-[52px]"} />
              ))}
            </div>
          )}

          {/* Signed out / not staff - the static demo preview stays */}
          {concerns === "denied" && (
            <div className="mt-3.5 flex flex-col">
              {attention.map((a, i) => (
                <div
                  key={a.title}
                  className={
                    "flex items-center gap-3.5 py-3.5 " +
                    (i < attention.length - 1 ? "border-b border-canvas" : "")
                  }
                >
                  <span
                    className={"h-2.5 w-2.5 flex-none rounded-full " + a.dot}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-ink-900">
                      {a.title}
                    </div>
                    <div className="text-xs text-ink-600">{a.sub}</div>
                  </div>
                  <button
                    type="button"
                    onClick={a.go}
                    className="cursor-pointer text-[13px] font-bold text-blue-primary"
                  >
                    {a.action}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Staff - real open concerns from mentors */}
          {Array.isArray(concerns) && concerns.length === 0 && (
            <div className="py-8 text-center text-[13px] font-medium text-ink-400">
              Nothing needs attention right now.
            </div>
          )}
          {Array.isArray(concerns) && concerns.length > 0 && (
            <div className="mt-3.5 flex flex-col">
              {concerns.map((c, i) => {
                const done = resolved[c.id];
                return (
                  <div
                    key={c.id}
                    className={
                      "flex items-center gap-3.5 py-3.5 transition-opacity duration-700 " +
                      (done ? "opacity-40 " : "") +
                      (i < concerns.length - 1 ? "border-b border-canvas" : "")
                    }
                  >
                    {done ? (
                      <span className="w-2.5 flex-none text-center text-[13px] font-extrabold leading-none text-success">
                        ✓
                      </span>
                    ) : (
                      <span className="h-2.5 w-2.5 flex-none rounded-full bg-gold-badge" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-ink-900">
                        {c.memberName ?? "Member"}
                        {c.memberNumber ? ` · #${c.memberNumber}` : ""}
                      </div>
                      <div className="text-xs text-ink-600">
                        Raised by {c.mentorName ?? "a mentor"} ·{" "}
                        {relTime(c.createdAt)}
                      </div>
                      {c.note && (
                        <div className="mt-0.5 truncate text-xs text-ink-400">
                          &ldquo;{c.note}&rdquo;
                        </div>
                      )}
                    </div>
                    {!done && (
                      <button
                        type="button"
                        onClick={() => markResolved(c.id)}
                        className="flex-none cursor-pointer text-[13px] font-bold text-blue-primary"
                      >
                        Mark resolved
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={CARD + " px-[30px] py-[26px]"}>
          <div className="text-base font-bold text-ink-900">
            Milestones this week
          </div>
          <div className="mt-3.5 flex flex-col">
            {MILESTONES.map((m, i) => (
              <div
                key={m.glyph}
                className={
                  "flex items-center gap-3.5 py-3.5 " +
                  (i < MILESTONES.length - 1 ? "border-b border-canvas" : "")
                }
              >
                <span
                  className={
                    "inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-[13px] font-extrabold " +
                    m.bg +
                    " " +
                    m.color
                  }
                >
                  {m.glyph}
                </span>
                <div className="text-sm font-semibold text-ink-900">
                  {m.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
