"use client";

// Left rail of /community — profile card, channel nav, and small footer links.
// Self-fetching (GET /api/auth/me); reads the active channel from ?topic=.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Compass } from "lucide-react";
import type { SafeUser, Topic } from "@/app/lib/types";
import { CIRCLES_CHANGED_EVENT, type CircleSummary } from "../ui";

const CARD =
  "rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]";

const CHANNELS: { key: Topic | null; label: string }[] = [
  { key: null, label: "All posts" },
  { key: "general", label: "General" },
  { key: "jobs", label: "Jobs & work" },
  { key: "housing", label: "Housing" },
  { key: "recovery", label: "Recovery" },
  { key: "gratitude", label: "Gratitude" },
];

/* ── Profile card ─────────────────────────────────────────────────── */

function ProfileSkeleton() {
  return (
    <div className={CARD} aria-hidden>
      <div className="flex animate-pulse items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-sky-tint" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-sky-tint" />
          <div className="h-3 w-32 rounded bg-sky-tint" />
        </div>
      </div>
    </div>
  );
}

function SignedOutCard() {
  return (
    <div className={CARD}>
      <h2 className="text-[16px] font-extrabold text-ink-900">
        Join the community
      </h2>
      <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink-600">
        A warm corner of the internet where members cheer each other on — wins,
        gratitude, and honest days alike.
      </p>
      <Link
        href="/signup"
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-blue-primary text-[14px] font-extrabold text-white hover:bg-blue-hover"
      >
        Create account
      </Link>
      <Link
        href="/login"
        className="mt-2.5 inline-flex h-11 w-full items-center justify-center rounded-full border-2 border-blue-primary text-[14px] font-extrabold text-blue-primary hover:bg-sky-tint"
      >
        Sign in
      </Link>
    </div>
  );
}

function ProfileCard({ user }: { user: SafeUser }) {
  const appHref = user.role === "mentor" ? "/mentor-app" : "/member-app";
  const appLabel =
    user.role === "mentor" ? "Open mentor app →" : "Open member app →";
  return (
    <div className={CARD}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[18px] font-extrabold text-white"
          style={{ backgroundColor: user.avatarColor }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-extrabold text-ink-900">
            {user.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {user.memberNumber && (
              <span className="tnum rounded-full bg-sky-tint px-2 py-0.5 text-[11px] font-bold text-blue-primary">
                #{user.memberNumber}
              </span>
            )}
            {user.level && (
              <span className="tnum rounded-full bg-[rgba(78,91,155,.12)] px-2 py-0.5 text-[11px] font-bold text-indigo-brand">
                <span className="uppercase tracking-wide">{user.level}</span> ·{" "}
                {user.points ?? 0} pts
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[13px] font-semibold text-ink-600">
        {user.streak && user.streak > 0
          ? `${user.streak}-day streak`
          : "Start your streak today"}
      </p>
      <div className="mt-3 space-y-1 border-t border-sky-tint-2 pt-3">
        {user.slug && (
          <Link
            href={`/p/${user.slug}`}
            className="block rounded-lg px-2 py-1.5 text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
          >
            My giving page →
          </Link>
        )}
        <Link
          href={appHref}
          className="block rounded-lg px-2 py-1.5 text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
        >
          {appLabel}
        </Link>
        <Link
          href="/account"
          className="block rounded-lg px-2 py-1.5 text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
        >
          My account →
        </Link>
      </div>
    </div>
  );
}

/* ── Explore nav (cross-page destinations) ────────────────────────── */

const EXPLORE: { href: string; label: string; Icon: typeof Compass }[] = [
  { href: "/community/discover", label: "Discover people", Icon: Compass },
  { href: "/community/events", label: "Events", Icon: CalendarDays },
];

function ExploreCard() {
  const pathname = usePathname();
  return (
    <nav className={CARD + " px-3"} aria-label="Explore">
      <h2 className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
        Explore
      </h2>
      <ul className="space-y-0.5">
        {EXPLORE.map(({ href, label, Icon }) => {
          const on = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={
                  "flex h-11 w-full items-center gap-2.5 rounded-xl pl-2 pr-3 text-left text-[14px] transition-colors " +
                  (on
                    ? "bg-sky-tint font-bold text-blue-primary"
                    : "font-semibold text-ink-600 hover:bg-canvas hover:text-ink-900")
                }
              >
                <span
                  className={
                    "h-5 w-[3px] shrink-0 rounded-full " +
                    (on ? "bg-blue-primary" : "bg-transparent")
                  }
                  aria-hidden
                />
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── Channels nav ─────────────────────────────────────────────────── */

function ChannelsCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("topic");
  const inCircle = !!searchParams.get("circle");

  function select(key: Topic | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("circle"); // channels and circles are separate views
    if (key) params.set("topic", key);
    else params.delete("topic");
    const qs = params.toString();
    router.replace(qs ? `/community?${qs}` : "/community", { scroll: false });
  }

  return (
    <nav className={CARD + " px-3"} aria-label="Channels">
      <h2 className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
        Channels
      </h2>
      <ul className="space-y-0.5">
        {CHANNELS.map(({ key, label }) => {
          const on = !inCircle && (active === key || (!active && key === null));
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => select(key)}
                aria-current={on ? "page" : undefined}
                className={
                  "flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl pl-2 pr-3 text-left text-[14px] transition-colors " +
                  (on
                    ? "bg-sky-tint font-bold text-blue-primary"
                    : "font-semibold text-ink-600 hover:bg-canvas hover:text-ink-900")
                }
              >
                <span
                  className={
                    "h-5 w-[3px] shrink-0 rounded-full " +
                    (on ? "bg-blue-primary" : "bg-transparent")
                  }
                  aria-hidden
                />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── Circles nav (docs/13 Part B) ─────────────────────────────────── */

const COLLAPSED_CIRCLES = 4;

function CirclesCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCircle = searchParams.get("circle");
  const [circles, setCircles] = useState<CircleSummary[] | null>(null);
  const [browseAll, setBrowseAll] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/circles", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { circles: [] }))
        .then((d) => alive && setCircles(d.circles ?? []))
        .catch(() => alive && setCircles([]));
    load();
    // Stay in sync when the feed's Join/Leave pill flips a membership.
    window.addEventListener(CIRCLES_CHANGED_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(CIRCLES_CHANGED_EVENT, load);
    };
  }, []);

  function select(id: string) {
    // Circles replace the topic view — one active lens at a time.
    router.replace(`/community?circle=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  if (circles !== null && circles.length === 0) return null;

  // Joined circles first so "my circles" are always in reach when collapsed.
  const ordered = circles
    ? [...circles].sort((a, b) => Number(b.joined) - Number(a.joined))
    : null;
  const visible =
    ordered === null
      ? null
      : browseAll
        ? ordered
        : ordered.slice(0, COLLAPSED_CIRCLES);

  return (
    <nav className={CARD + " px-3"} aria-label="Circles">
      <h2 className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
        Circles
      </h2>
      {visible === null ? (
        <div className="animate-pulse space-y-2 px-2 pb-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 rounded-xl bg-sky-tint" />
          ))}
        </div>
      ) : (
        <>
          <ul className="space-y-0.5">
            {visible.map((c) => {
              const on = activeCircle === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => select(c.id)}
                    aria-current={on ? "page" : undefined}
                    className={
                      "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl py-1.5 pl-2 pr-3 text-left text-[14px] transition-colors " +
                      (on
                        ? "bg-sky-tint text-blue-primary"
                        : "text-ink-600 hover:bg-canvas hover:text-ink-900")
                    }
                  >
                    <span
                      className={
                        "h-5 w-[3px] shrink-0 rounded-full " +
                        (on ? "bg-blue-primary" : "bg-transparent")
                      }
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={
                          "block truncate " +
                          (c.joined || on ? "font-bold" : "font-semibold")
                        }
                      >
                        {c.name}
                      </span>
                      <span className="tnum block text-[11px] font-semibold text-ink-400">
                        {c.members.toLocaleString("en-US")}{" "}
                        {c.members === 1 ? "member" : "members"}
                      </span>
                    </span>
                    {c.joined && (
                      <span className="inline-flex h-5 flex-none items-center rounded-full bg-sky-tint px-2 text-[10px] font-extrabold tracking-[.04em] text-blue-primary">
                        JOINED
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {!browseAll && ordered!.length > COLLAPSED_CIRCLES && (
            <button
              type="button"
              onClick={() => setBrowseAll(true)}
              className="mt-1 block w-full cursor-pointer rounded-lg py-2 text-center text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
            >
              Browse all circles →
            </button>
          )}
        </>
      )}
    </nav>
  );
}

/* ── Footer links ─────────────────────────────────────────────────── */

function FooterLinksCard() {
  return (
    <div className={CARD + " py-4"}>
      <ul className="space-y-1">
        {[
          { href: "/about", label: "About us" },
          { href: "/mentor", label: "Become a Mentor" },
          { href: "/donate", label: "Donate" },
        ].map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-lg px-2 py-1.5 text-[13px] font-semibold text-ink-600 hover:bg-canvas hover:text-blue-primary"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Rail ─────────────────────────────────────────────────────────── */

function LeftRailInner() {
  const [me, setMe] = useState<{ user: SafeUser | null } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => alive && setMe({ user: d.user ?? null }))
      .catch(() => alive && setMe({ user: null }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="sticky top-[92px] flex flex-col gap-4 self-start">
      {me === null ? (
        <ProfileSkeleton />
      ) : me.user ? (
        <ProfileCard user={me.user} />
      ) : (
        <SignedOutCard />
      )}
      <ExploreCard />
      <ChannelsCard />
      <CirclesCard />
      <FooterLinksCard />
    </div>
  );
}

export default function LeftRail() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <LeftRailInner />
    </Suspense>
  );
}
