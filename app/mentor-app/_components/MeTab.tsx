"use client";

import { useEffect, useState } from "react";
import { Diamond } from "lucide-react";

/* ── GET /api/mentor/analytics shape ───────────────────────────────────── */

type BarcTrend = "up" | "flat" | "down";

type MenteeAnalytics = {
  id: string;
  name: string;
  avatarColor: string;
  memberNumber: string | null;
  streak: number;
  points: number;
  level: string;
  lastSession: number | null;
  sessionsThisQuarter: number;
  courseProgress: number | null;
  goalsActive: number;
  goalsAchieved: number;
  lastBarcTotal: number | null;
  barcTrend: BarcTrend | null;
  openConcern: boolean;
  communityPosts30d: number;
  needsAttention: boolean;
};

type Rollup = {
  mentees: number;
  avgStreak: number;
  sessionsThisMonth: number;
  goalsAchievedTotal: number;
  menteesNeedingAttention: number;
};

type Analytics = { mentees: MenteeAnalytics[]; rollup: Rollup };

const CARD_SHADOW = "shadow-[0_1px_3px_rgba(11,37,69,.06)]";

/** "today" / "5 days ago" / "May 12" - session recency. */
function rel(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400e3);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** BARC check-in trend - warm arrows, never red on a person. */
const TREND: Record<BarcTrend, { glyph: string; cls: string; word: string }> = {
  up: { glyph: "▲", cls: "text-success", word: "rising" },
  flat: { glyph: "▬", cls: "text-ink-400", word: "steady" },
  down: { glyph: "▼", cls: "text-amber-ink", word: "dipping" },
};

/* ── demo fallback - mirrors the roster's three flagship mentees ───────── */

const DEMO_MENTEES: MenteeAnalytics[] = [
  {
    id: "demo-danielle",
    name: "Danielle",
    avatarColor: "#2E7CD6",
    memberNumber: "039521464",
    streak: 12,
    points: 640,
    level: "Silver",
    lastSession: Date.now() - 3 * 86400e3,
    sessionsThisQuarter: 5,
    courseProgress: 45,
    goalsActive: 2,
    goalsAchieved: 1,
    lastBarcTotal: 41,
    barcTrend: "up",
    openConcern: false,
    communityPosts30d: 3,
    needsAttention: false,
  },
  {
    id: "demo-tyrell",
    name: "Tyrell",
    avatarColor: "#0B2545",
    memberNumber: "039521512",
    streak: 0,
    points: 310,
    level: "Bronze",
    lastSession: Date.now() - 9 * 86400e3,
    sessionsThisQuarter: 2,
    courseProgress: 15,
    goalsActive: 1,
    goalsAchieved: 0,
    lastBarcTotal: 24,
    barcTrend: "down",
    openConcern: false,
    communityPosts30d: 0,
    needsAttention: true,
  },
  {
    id: "demo-andre",
    name: "Andre",
    avatarColor: "#12B76A",
    memberNumber: "039521588",
    streak: 1,
    points: 10,
    level: "Bronze",
    lastSession: null,
    sessionsThisQuarter: 0,
    courseProgress: null,
    goalsActive: 1,
    goalsAchieved: 0,
    lastBarcTotal: null,
    barcTrend: null,
    openConcern: false,
    communityPosts30d: 0,
    needsAttention: false,
  },
];

const DEMO: Analytics = {
  mentees: DEMO_MENTEES,
  rollup: {
    mentees: 3,
    avgStreak: 4.3,
    sessionsThisMonth: 6,
    goalsAchievedTotal: 1,
    menteesNeedingAttention: 1,
  },
};

/* ── pieces ────────────────────────────────────────────────────────────── */

function RollupStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="tnum text-[22px] font-extrabold text-blue-primary">
        {value}
      </div>
      <div className="text-[10px] font-semibold text-ink-600">{label}</div>
    </div>
  );
}

function MenteeCard({ m }: { m: MenteeAnalytics }) {
  const goalsTotal = m.goalsActive + m.goalsAchieved;
  const trend = m.barcTrend ? TREND[m.barcTrend] : null;
  return (
    <div
      className={
        `rounded-2xl bg-white p-5 ${CARD_SHADOW}` +
        (m.needsAttention ? " border-l-[3px] border-gold-badge" : "")
      }
    >
      {/* name row */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sky-tint text-[15px] font-extrabold"
          style={{ color: m.avatarColor || "#4E5B9B" }}
        >
          {m.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-ink-900">
            {m.name}
          </div>
          <div className="text-[11px] font-medium text-ink-600">
            {m.lastSession
              ? `last session ${rel(m.lastSession)} · ${m.sessionsThisQuarter} this quarter`
              : "no sessions logged yet"}
          </div>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          <span className="inline-flex h-6 items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-extrabold text-blue-primary">
            {m.level}
          </span>
          <span
            className={
              "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-extrabold " +
              (m.streak > 0
                ? "bg-gold-bg text-gold-ink"
                : "bg-[#F1F5F9] text-ink-600")
            }
          >
            <Diamond size={9} fill="currentColor" />
            {m.streak > 0 ? `${m.streak}d streak` : "streak paused"}
          </span>
        </div>
      </div>

      {/* course progress */}
      <div className="mt-4">
        <div className="flex justify-between text-[11px] font-semibold text-ink-600">
          <span>Course progress</span>
          <span className="tnum text-blue-primary">
            {m.courseProgress === null ? "not started" : `${m.courseProgress}%`}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sky-tint">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#4E5B9B,#2E7CD6)]"
            style={{ width: `${m.courseProgress ?? 0}%` }}
          />
        </div>
      </div>

      {/* goals */}
      <div className="mt-3">
        <div className="flex justify-between text-[11px] font-semibold text-ink-600">
          <span>Goals</span>
          <span className="tnum">
            {m.goalsActive} active · {m.goalsAchieved} achieved
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sky-tint">
          <div
            className="h-full rounded-full bg-success"
            style={{
              width:
                goalsTotal > 0
                  ? `${Math.round((m.goalsAchieved / goalsTotal) * 100)}%`
                  : "0%",
            }}
          />
        </div>
      </div>

      {/* check-in trend + community activity */}
      <div className="mt-3.5 flex items-center justify-between border-t border-canvas pt-3">
        {trend ? (
          <span className="text-[11px] font-semibold text-ink-600">
            <span className={"mr-1 " + trend.cls}>{trend.glyph}</span>
            check-in trend {trend.word}
            {m.lastBarcTotal !== null && (
              <span className="tnum text-ink-400"> · {m.lastBarcTotal}/50</span>
            )}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-ink-400">
            no self-checks yet
          </span>
        )}
        <span className="tnum text-[11px] font-semibold text-ink-600">
          {m.communityPosts30d} post{m.communityPosts30d === 1 ? "" : "s"} ·
          30 days
        </span>
      </div>
    </div>
  );
}

/* ── the tab ───────────────────────────────────────────────────────────── */

/** "Me" tab → My mentoring: live per-mentee analytics for the signed-in
 *  mentor; a demo preview with a sign-in hint otherwise. */
export default function MeTab({
  signedIn,
  meRole,
}: {
  signedIn: boolean | undefined;
  meRole: string | null;
}) {
  const isMentor = signedIn && (meRole === "mentor" || meRole === "staff");
  const [data, setData] = useState<Analytics | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (signedIn === undefined) return; // auth check still in flight
    if (!isMentor) {
      setData(DEMO);
      setLive(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/mentor/analytics");
        const body = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && body?.rollup && body.mentees?.length > 0) {
          setData(body as Analytics);
          setLive(true);
          return;
        }
      } catch {
        /* falls through to demo */
      }
      if (alive) {
        setData(DEMO);
        setLive(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [signedIn, isMentor]);

  const r = data?.rollup;

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-white px-5 pb-3.5 pt-[18px]">
        <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
          My mentoring
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-ink-600">
          How your mentees are growing - at a glance.
        </div>
      </div>
      <div className="hairline" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {!live && signedIn === false && (
          <a
            href="/login"
            className="flex min-h-[44px] items-center justify-center rounded-2xl border-[1.5px] border-sky-tint-2 bg-sky-tint px-5 py-3 text-center text-[13px] font-bold text-blue-primary hover:bg-sky-tint-2"
          >
            This is a preview - sign in as a mentor to see your real
            mentees →
          </a>
        )}

        {/* loading skeletons */}
        {!data && (
          <>
            <div className="h-[92px] animate-pulse rounded-2xl bg-sky-tint" />
            <div className="h-[210px] animate-pulse rounded-2xl bg-sky-tint" />
            <div className="h-[210px] animate-pulse rounded-2xl bg-sky-tint" />
          </>
        )}

        {data && r && (
          <>
            {/* rollup stat row */}
            <div className={`rounded-2xl bg-white p-5 ${CARD_SHADOW}`}>
              <div className="text-xs font-bold tracking-[.12em] text-blue-primary">
                MY MENTORING
              </div>
              <div className="mt-3.5 grid grid-cols-4 gap-2 text-center">
                <RollupStat value={String(r.mentees)} label="mentees" />
                <RollupStat value={String(r.avgStreak)} label="avg streak" />
                <RollupStat
                  value={String(r.sessionsThisMonth)}
                  label="sessions · 30d"
                />
                <RollupStat
                  value={String(r.goalsAchievedTotal)}
                  label="goals achieved"
                />
              </div>
              {r.menteesNeedingAttention > 0 && (
                <div className="mt-3.5 border-t border-canvas pt-3 text-center text-[11px] font-semibold text-amber-ink">
                  {r.menteesNeedingAttention} mentee
                  {r.menteesNeedingAttention === 1 ? "" : "s"} could use a
                  little extra attention this week
                </div>
              )}
            </div>

            <div className="text-xs font-bold tracking-[.12em] text-blue-primary">
              YOUR MENTEES
            </div>
            {data.mentees.map((m) => (
              <MenteeCard key={m.id} m={m} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
