"use client";

// Journey moments - a horizontally-scrolling rail at the top of the feed
// column (the big-social "stories" pattern translated to recovery). Cards are
// derived from data the community already has:
//   1. "Share a moment" - the viewer's own card; opens the composer by
//      dispatching COMPOSER_OPEN_EVENT ("ms:composer:open"), which Composer
//      listens for (expand + focus). Signed-out visitors get a /login link.
//   2. Win/milestone posts from GET /api/posts (kind === "win" | "milestone"),
//      topped up with the most-hearted recent regular posts when wins are
//      scarce. Cards deep-link to /community#post-{id} and smooth-scroll to
//      the post when that anchor exists in the DOM.
//   3. Up to two upcoming events from GET /api/events → /community/events.
// Cap: 8 moment cards (+ the share card). Skeleton while loading; renders
// nothing when there's no viewer and no moments to show.

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import type { CommunityEvent, SafeUser } from "@/app/lib/types";
import { COMPOSER_OPEN_EVENT } from "./Composer";
import { useBlockedIds } from "./BlockControls";
import { AvatarTile, type FeedPost } from "./ui";

const MAX_MOMENTS = 8; // moment cards, excluding the leading share card
const MAX_EVENTS = 2;

/* card geometry - ~118px wide, story-height, rounded-2xl */
const CARD = "h-[150px] w-[118px] flex-none snap-start overflow-hidden rounded-2xl";

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

function excerptOf(body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length > 64 ? `${clean.slice(0, 64)}…` : clean;
}

/** Smooth-scroll to the post when its anchor is on the page (falls back to
 *  the href - /community#post-{id} - when it isn't). */
function jumpToPost(id: string) {
  return (e: MouseEvent) => {
    const el = document.getElementById(`post-${id}`);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
}

function RailSkeleton() {
  return (
    <div className="flex gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`${CARD} animate-pulse bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]`}>
          <div className="h-[86px] bg-sky-tint" />
          <div className="px-3 pt-4">
            <div className="h-2.5 w-16 rounded bg-canvas" />
            <div className="mt-2 h-2.5 w-20 rounded bg-canvas" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Leading card - viewer color up top, blue + at the seam, warm label. */
function ShareCard({ viewer }: { viewer: SafeUser | null }) {
  const inner = (
    <>
      <div
        className="flex h-[86px] items-center justify-center text-[30px] font-extrabold text-white"
        style={{ background: viewer?.avatarColor || "#4e5b9b" }}
      >
        {(viewer?.name.trim()[0] ?? "+").toUpperCase()}
      </div>
      <div className="absolute left-1/2 top-[86px] flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-blue-primary">
        <Plus size={16} strokeWidth={3} className="text-white" />
      </div>
      <div className="px-2 pt-6 text-center text-[12px]/[1.3] font-bold text-ink-900">
        {viewer ? "Share a moment" : "Join to share"}
      </div>
    </>
  );
  const cls = `${CARD} relative cursor-pointer bg-white text-left shadow-[0_1px_3px_rgba(11,37,69,.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(11,37,69,.12)]`;

  if (!viewer) {
    return (
      <Link href="/login" className={cls} aria-label="Sign in to share a moment">
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(COMPOSER_OPEN_EVENT))}
      className={cls}
      aria-label="Share a moment - open the composer"
    >
      {inner}
    </button>
  );
}

function MomentCard({ post }: { post: FeedPost }) {
  return (
    <Link
      href={`/community#post-${post.id}`}
      onClick={jumpToPost(post.id)}
      className={`${CARD} flex flex-col justify-between bg-gradient-to-br from-blue-primary to-indigo-brand p-3 text-white transition-opacity hover:opacity-90`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full ring-2 ring-white/80">
          <AvatarTile name={post.authorName} color={post.avatarColor} size={30} />
        </span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-extrabold tracking-[.05em]">
          {post.kind === "milestone"
            ? "◆ MILESTONE"
            : post.kind === "win"
              ? "WIN"
              : `♥ ${post.hearts.length}`}
        </span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[12px] font-extrabold">
          {firstNameOf(post.authorName)}
        </div>
        <div className="mt-0.5 line-clamp-3 text-[10.5px]/[1.4] font-medium text-white/85">
          {excerptOf(post.body)}
        </div>
      </div>
    </Link>
  );
}

function EventCard({ event }: { event: CommunityEvent }) {
  const date = new Date(event.startsAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return (
    <Link
      href="/community/events"
      className={`${CARD} flex flex-col border-[1.5px] border-sky-tint-2 bg-white p-3 transition-colors hover:border-blue-primary`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-tint">
        <CalendarDays size={17} className="text-blue-primary" />
      </div>
      <div className="mt-auto min-w-0">
        <div className="text-[9.5px] font-extrabold uppercase tracking-[.08em] text-blue-primary">
          {date}
        </div>
        <div className="mt-1 line-clamp-3 text-[12px]/[1.35] font-bold text-ink-900">
          {event.title}
        </div>
      </div>
    </Link>
  );
}

export default function JourneyRail() {
  const [viewer, setViewer] = useState<SafeUser | null>(null);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const blockedIds = useBlockedIds();

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      fetch("/api/posts?limit=30").then((r) =>
        r.ok ? (r.json() as Promise<{ posts: FeedPost[] }>) : null
      ),
      fetch("/api/events").then((r) =>
        r.ok ? (r.json() as Promise<{ events: CommunityEvent[] }>) : null
      ),
      fetch("/api/auth/me").then((r) =>
        r.ok ? (r.json() as Promise<{ user: SafeUser | null }>) : null
      ),
    ]).then(([p, e, me]) => {
      if (!alive) return;
      if (p.status === "fulfilled" && p.value) {
        setPosts(Array.isArray(p.value.posts) ? p.value.posts : []);
      }
      if (e.status === "fulfilled" && e.value) {
        const now = Date.now();
        setEvents(
          (Array.isArray(e.value.events) ? e.value.events : [])
            .filter((ev) => ev.startsAt >= now)
            .sort((a, b) => a.startsAt - b.startsAt)
            .slice(0, MAX_EVENTS)
        );
      }
      if (me.status === "fulfilled" && me.value) {
        setViewer(me.value.user ?? null);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* - moment derivation: wins & milestones first (newest first, as served),
       then the most-hearted recent regular posts to fill the rail - */
  const moments = useMemo(() => {
    const pool = (posts ?? []).filter(
      (p) => !blockedIds.has(p.authorId) && !p.hidden
    );
    const wins = pool.filter((p) => p.kind === "win" || p.kind === "milestone");
    const loved = pool
      .filter((p) => p.kind === "regular" && p.hearts.length > 0)
      .sort((a, b) => b.hearts.length - a.hearts.length);
    return [...wins, ...loved].slice(0, Math.max(0, MAX_MOMENTS - events.length));
  }, [posts, events.length, blockedIds]);

  // Quiet start / signed-out fetch failure - take up no space at all.
  if (!loading && !viewer && moments.length === 0 && events.length === 0) {
    return null;
  }

  return (
    <section aria-label="Journey moments">
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
        Journey moments
      </div>
      {loading ? (
        <RailSkeleton />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ShareCard viewer={viewer} />
          {moments.map((p) => (
            <MomentCard key={p.id} post={p} />
          ))}
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </section>
  );
}
