"use client";

// Right rail of /community — community stats, the support board, and the
// 50/50 giving explainer. Self-fetching; refreshes stats + board every 30s.

import { useEffect, useState } from "react";
import Link from "next/link";

const CARD =
  "rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]";

const HEADING =
  "text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400";

interface CommunityStats {
  members: number;
  postsThisWeek: number;
  activeRequests: number;
  fundedRequests: number;
  givenThisMonth: number;
}

interface BoardRow {
  id: string;
  label: string;
  weeklyTarget: number;
  raised: number;
  memberName: string;
  slug: string;
  avatarColor: string;
  createdAt: number;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/* ── Community stats ──────────────────────────────────────────────── */

function StatsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-3.5 w-36 rounded bg-sky-tint" />
          <div className="h-4 w-12 rounded bg-sky-tint" />
        </div>
      ))}
    </div>
  );
}

function StatsCard({ stats }: { stats: CommunityStats | null }) {
  const rows = stats
    ? [
        { label: "Members on the journey", value: fmt(stats.members) },
        { label: "Posts this week", value: fmt(stats.postsThisWeek) },
        { label: "Requests funded", value: fmt(stats.fundedRequests) },
        {
          label: "Given this month",
          value: `$${fmt(stats.givenThisMonth)}`,
          blue: true,
        },
      ]
    : null;

  return (
    <div className={CARD}>
      <h2 className={HEADING}>Our community</h2>
      <div className="mt-3">
        {rows ? (
          <dl className="space-y-2.5">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-[13px] font-semibold text-ink-600">
                  {r.label}
                </dt>
                <dd
                  className={
                    "tnum text-[15px] font-extrabold " +
                    (r.blue ? "text-blue-primary" : "text-ink-900")
                  }
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <StatsSkeleton />
        )}
      </div>
    </div>
  );
}

/* ── Support board ────────────────────────────────────────────────── */

function BoardRowItem({ row }: { row: BoardRow }) {
  const pct = Math.min(
    100,
    Math.round((row.raised / Math.max(1, row.weeklyTarget)) * 100),
  );
  return (
    <li className="flex items-center gap-3 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-extrabold text-white"
        style={{ backgroundColor: row.avatarColor }}
      >
        {row.memberName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-ink-900">
          {row.memberName} · {row.label}
        </p>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sky-tint-2"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${row.memberName}'s ${row.label}: ${pct}% funded this week`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-brand to-blue-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="tnum mt-1 text-[12px] font-semibold text-ink-600">
          ${fmt(row.raised)} of ${fmt(row.weeklyTarget)}/wk
        </p>
      </div>
      <Link
        href={`/p/${row.slug}`}
        className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-blue-primary px-3.5 text-[12px] font-extrabold text-white hover:bg-blue-hover"
      >
        Give ❤
      </Link>
    </li>
  );
}

function BoardSkeleton() {
  return (
    <ul className="animate-pulse divide-y divide-sky-tint" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <div className="h-9 w-9 rounded-lg bg-sky-tint" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 rounded bg-sky-tint" />
            <div className="h-1.5 w-full rounded-full bg-sky-tint" />
          </div>
          <div className="h-9 w-16 rounded-full bg-sky-tint" />
        </li>
      ))}
    </ul>
  );
}

function BoardCard({ board }: { board: BoardRow[] | null }) {
  const [showAll, setShowAll] = useState(false);
  const visible = board ? (showAll ? board : board.slice(0, 6)) : null;

  return (
    <div className={CARD}>
      <h2 className={HEADING}>Support board</h2>
      <div className="mt-1">
        {visible === null ? (
          <BoardSkeleton />
        ) : visible.length === 0 ? (
          <p className="py-3 text-[13px] font-medium text-ink-600">
            No open requests right now.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-sky-tint">
              {visible.map((row) => (
                <BoardRowItem key={row.id} row={row} />
              ))}
            </ul>
            {!showAll && board!.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-1 block w-full cursor-pointer rounded-lg py-2 text-center text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
              >
                See every request →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── How giving works ─────────────────────────────────────────────── */

function GivingCard() {
  return (
    <div className="rounded-2xl bg-navy-deep p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[.12em] text-white/60">
        How giving works
      </h2>
      <p className="mt-2 text-[13px] font-medium leading-relaxed text-white/90">
        Every gift splits 50/50 — half cash at the center, half Store Credits.
      </p>
      <Link
        href="/give"
        className="mt-3 inline-block text-[13px] font-bold text-sky-tint hover:underline"
      >
        Learn more →
      </Link>
    </div>
  );
}

/* ── Rail ─────────────────────────────────────────────────────────── */

export default function RightRail() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [board, setBoard] = useState<BoardRow[] | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [sRes, bRes] = await Promise.all([
          fetch("/api/community/stats", { cache: "no-store" }),
          fetch("/api/requests/board", { cache: "no-store" }),
        ]);
        if (!alive) return;
        if (sRes.ok) setStats(await sRes.json());
        if (bRes.ok) {
          const data = await bRes.json();
          if (alive) setBoard(Array.isArray(data.board) ? data.board : []);
        }
      } catch {
        // keep the last good data (or skeletons) on network hiccups
      }
    }

    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="sticky top-[92px] flex flex-col gap-4 self-start">
      <StatsCard stats={stats} />
      <BoardCard board={board} />
      <GivingCard />
    </div>
  );
}
