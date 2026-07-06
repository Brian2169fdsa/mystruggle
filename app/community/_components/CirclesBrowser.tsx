"use client";

// /community/circles - the circles directory (docs/13 Part B).
// Groups-style browser translated to recovery: three lenses ("For you",
// "Your circles", "Discover"), client-side search, and an optimistic
// Join/Joined pill against POST /api/circles. Joined rows deep-link into
// the circle's feed via the existing /community?circle={id} convention
// (the same lens LeftRail's CirclesCard and Feed.tsx already share).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, Landmark, Lock, Search, Users } from "lucide-react";
import type { CircleKind, SafeUser } from "@/app/lib/types";
import { CIRCLES_CHANGED_EVENT, type CircleSummary } from "./ui";

const CARD = "rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]";

/* ── Kind tile - deterministic gradient + icon per circle kind ────── */

const KIND_TILE: Record<
  CircleKind,
  { gradient: string; Icon: typeof Users }
> = {
  // blue → indigo: shared-topic circles (Job Seekers, Gratitude, …)
  topic: {
    gradient: "linear-gradient(135deg,#2e7cd6,#4e5b9b)",
    Icon: Users,
  },
  // sky → blue: program cohorts walking the same stretch together
  cohort: {
    gradient: "linear-gradient(135deg,#6ea8e6,#2e7cd6)",
    Icon: GraduationCap,
  },
  // deep navy: center alumni circles
  alumni: {
    gradient: "linear-gradient(135deg,#0b2545,#1d4a85)",
    Icon: Landmark,
  },
};

function KindTile({ kind }: { kind: CircleKind }) {
  const { gradient, Icon } = KIND_TILE[kind];
  return (
    <div
      className="flex h-14 w-14 flex-none items-center justify-center rounded-xl text-white"
      style={{ background: gradient }}
      aria-hidden
    >
      <Icon className="h-6 w-6" />
    </div>
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────── */

type Tab = "for-you" | "yours" | "discover";

const TABS: { key: Tab; label: string }[] = [
  { key: "for-you", label: "For you" },
  { key: "yours", label: "Your circles" },
  { key: "discover", label: "Discover" },
];

/* ── One circle row ───────────────────────────────────────────────── */

function CircleRow({
  circle,
  onToggled,
  onNeedsSignIn,
}: {
  circle: CircleSummary;
  onToggled: (next: CircleSummary) => void;
  onNeedsSignIn: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const optimistic: CircleSummary = {
      ...circle,
      joined: !circle.joined,
      members: Math.max(0, circle.members + (circle.joined ? -1 : 1)),
    };
    onToggled(optimistic); // optimistic flip; reverted below on failure
    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          circleId: circle.id,
          action: circle.joined ? "leave" : "join",
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.circle) {
        onToggled(data.circle as CircleSummary);
        // Keep LeftRail's circle list in sync with this join/leave.
        window.dispatchEvent(new Event(CIRCLES_CHANGED_EVENT));
      } else {
        onToggled(circle); // revert
        if (res.status === 401) onNeedsSignIn();
      }
    } catch {
      onToggled(circle); // revert
    } finally {
      setBusy(false);
    }
  }

  const meta = `${circle.members.toLocaleString("en-US")} ${
    circle.members === 1 ? "member" : "members"
  } · ${circle.staffModerated ? "staff-supported" : "peer-led"}`;

  return (
    <li className="relative flex min-h-[72px] items-center gap-3.5 px-4 py-3.5 sm:px-5">
      <KindTile kind={circle.kind} />

      <div className="min-w-0 flex-1">
        {circle.joined ? (
          // Joined rows deep-link into the circle's feed - the whole row is
          // the target via a stretched link (the pill stays above it).
          <Link
            href={`/community?circle=${encodeURIComponent(circle.id)}`}
            className="text-[15px] font-extrabold text-ink-900 after:absolute after:inset-0 after:rounded-2xl hover:text-blue-primary"
          >
            {circle.name}
          </Link>
        ) : (
          <span className="text-[15px] font-extrabold text-ink-900">
            {circle.name}
          </span>
        )}
        <p className="tnum mt-0.5 truncate text-[12.5px] font-semibold text-ink-400">
          {meta}
          {circle.joined && (
            <span className="text-blue-primary"> · joined</span>
          )}
        </p>
        <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-ink-600">
          {circle.description}
        </p>
        {circle.locked && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink-400">
            <Lock className="h-3.5 w-3.5 flex-none" aria-hidden />
            Private to its center alumni
          </p>
        )}
      </div>

      {!circle.locked && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-pressed={circle.joined}
          aria-label={
            circle.joined ? `Leave ${circle.name}` : `Join ${circle.name}`
          }
          className={
            "relative z-10 inline-flex h-11 flex-none cursor-pointer items-center rounded-full px-5 text-[13.5px] font-extrabold transition-colors disabled:opacity-60 " +
            (circle.joined
              ? "border-2 border-sky-tint-2 bg-white text-blue-primary hover:border-blue-primary"
              : "bg-blue-primary text-white hover:bg-blue-hover")
          }
        >
          {busy ? "One sec…" : circle.joined ? "Joined" : "Join"}
        </button>
      )}
    </li>
  );
}

/* ── Empty states ─────────────────────────────────────────────────── */

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={CARD + " px-6 py-10 text-center"}>
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl text-white"
        style={{ background: KIND_TILE.topic.gradient }}
        aria-hidden
      >
        <Users className="h-6 w-6" />
      </div>
      <div className="mx-auto mt-4 max-w-[380px] text-[14px]/[1.65] font-medium text-ink-600">
        {children}
      </div>
    </div>
  );
}

/* ── Browser ──────────────────────────────────────────────────────── */

export default function CirclesBrowser() {
  const [circles, setCircles] = useState<CircleSummary[] | null>(null);
  const [me, setMe] = useState<SafeUser | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("for-you");
  const [query, setQuery] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/circles", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { circles: [] }))
      .then((d) => alive && setCircles(d.circles ?? []))
      .catch(() => alive && setCircles([]));
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => alive && setMe(d.user ?? null))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, []);

  function replaceCircle(next: CircleSummary) {
    setCircles((prev) =>
      prev ? prev.map((c) => (c.id === next.id ? next : c)) : prev
    );
  }

  const visible = useMemo(() => {
    if (!circles) return null;
    const q = query.trim().toLowerCase();
    const matches = (c: CircleSummary) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q);

    if (tab === "yours") return circles.filter((c) => c.joined && matches(c));
    if (tab === "discover")
      return [...circles]
        .sort((a, b) => b.members - a.members)
        .filter(matches);
    // "For you" - open circles you haven't joined, busiest first.
    return circles
      .filter((c) => !c.joined && !c.locked && matches(c))
      .sort((a, b) => b.members - a.members);
  }, [circles, tab, query]);

  const signedOut = me === null;

  return (
    <div className="space-y-4">
      {/* Tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Circle views"
          className="flex flex-wrap gap-2"
        >
          {TABS.map(({ key, label }) => {
            const on = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(key)}
                className={
                  "inline-flex h-11 cursor-pointer items-center rounded-full px-5 text-[13.5px] font-extrabold transition-colors " +
                  (on
                    ? "bg-blue-primary text-white"
                    : "bg-white text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:text-blue-primary")
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        <label className="relative block sm:w-[240px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search circles"
            aria-label="Search circles by name or description"
            className="h-11 w-full rounded-full bg-white pl-11 pr-4 text-[14px] font-semibold text-ink-900 shadow-[0_1px_3px_rgba(11,37,69,.06)] outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-blue-primary"
          />
        </label>
      </div>

      {/* Warm sign-in nudge after a 401 on join */}
      {needsSignIn && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-tint px-5 py-4">
          <p className="text-[13.5px] font-semibold text-ink-600">
            Circles are small spaces to walk together.{" "}
            <span className="font-extrabold text-ink-900">
              Sign in to join one.
            </span>
          </p>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-full bg-blue-primary px-5 text-[13.5px] font-extrabold text-white hover:bg-blue-hover"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* List */}
      {visible === null ? (
        <div className={CARD + " divide-y divide-sky-tint-2"} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3.5 px-4 py-3.5 sm:px-5"
            >
              <div className="h-14 w-14 flex-none rounded-xl bg-sky-tint" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-sky-tint" />
                <div className="h-3 w-56 rounded bg-sky-tint" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        tab === "yours" ? (
          signedOut ? (
            <EmptyCard>
              Circles are small spaces to walk together. Sign in to join one.
              <div className="mt-4">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-full bg-blue-primary px-6 text-[14px] font-extrabold text-white hover:bg-blue-hover"
                >
                  Sign in
                </Link>
              </div>
            </EmptyCard>
          ) : (
            <EmptyCard>
              You haven&apos;t joined a circle yet. Find one under{" "}
              <button
                type="button"
                onClick={() => setTab("for-you")}
                className="cursor-pointer font-extrabold text-blue-primary hover:underline"
              >
                For you
              </button>{" "}
              - nobody walks alone here.
            </EmptyCard>
          )
        ) : query.trim() ? (
          <EmptyCard>
            No circles match &ldquo;{query.trim()}&rdquo; here. Try another
            word, or browse the Discover tab.
          </EmptyCard>
        ) : (
          <EmptyCard>
            Nothing here right now - every circle you can join already has you
            in it. Check &ldquo;Your circles&rdquo; to visit them.
          </EmptyCard>
        )
      ) : (
        <ul className={CARD + " divide-y divide-sky-tint-2"}>
          {visible.map((c) => (
            <CircleRow
              key={c.id}
              circle={c}
              onToggled={replaceCircle}
              onNeedsSignIn={() => setNeedsSignIn(true)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
