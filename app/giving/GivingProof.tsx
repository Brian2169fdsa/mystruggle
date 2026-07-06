"use client";

import { useEffect, useState } from "react";

interface CommunityStats {
  members: number;
  fundedRequests: number;
  givenThisMonth: number;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Live stat band for /giving - fetches public community stats client-side
 * and renders them as three tnum figures. Skeletons while loading; keeps
 * the last good numbers on network hiccups.
 */
export default function GivingProof() {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/community/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data) setStats(data);
      })
      .catch(() => {
        // leave skeletons in place on network hiccups
      });
    return () => {
      alive = false;
    };
  }, []);

  const items = stats
    ? [
        { value: `$${fmt(stats.givenThisMonth)}`, label: "given this month" },
        { value: fmt(stats.fundedRequests), label: "goals funded" },
        { value: fmt(stats.members), label: "members" },
      ]
    : null;

  return (
    <div className="mx-auto grid max-w-[860px] grid-cols-1 gap-6 text-center sm:grid-cols-3 lg:gap-8">
      {items
        ? items.map((s) => (
            <div key={s.label}>
              <div className="tnum text-[40px] font-extrabold tracking-[-0.02em] text-blue-primary lg:text-[52px]">
                {s.value}
              </div>
              <div className="mt-1.5 text-[15px] font-medium text-ink-600">
                {s.label}
              </div>
            </div>
          ))
        : [0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="mx-auto h-[44px] w-28 rounded-lg bg-sky-tint lg:h-[56px] lg:w-36" />
              <div className="mx-auto mt-2.5 h-3.5 w-24 rounded bg-canvas" />
            </div>
          ))}
    </div>
  );
}
