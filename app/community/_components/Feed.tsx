"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { TOPICS, type SafeUser, type Topic } from "@/app/lib/types";
import Composer, { type ComposerPrefill } from "./Composer";
import PostCard from "./PostCard";
import {
  CIRCLES_CHANGED_EVENT,
  CIRCLE_KIND_LABELS,
  TOPIC_LABELS,
  type CircleSummary,
  type FeedPost,
} from "./ui";

const PAGE_SIZE = 20;
const POLL_MS = 12_000;

type FeedResponse = {
  posts: FeedPost[];
  viewerId: string | null;
  nextBefore: number | null;
};

function feedUrl(topic: string, circle: string, before?: number | null): string {
  const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (circle) qs.set("circle", circle);
  else if (topic) qs.set("topic", topic);
  if (before) qs.set("before", String(before));
  return `/api/posts?${qs}`;
}

/** Warm read-along card shown to signed-out visitors above the feed. */
function JoinCard() {
  return (
    <div className="rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="text-[16px] font-bold text-ink-900">
        This community is built by people rebuilding.
      </div>
      <div className="mt-1 text-[14px]/[1.6] font-medium text-ink-600">
        Read along, or join us.
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-hover"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="inline-flex min-h-[44px] items-center rounded-full border-2 border-blue-primary px-6 text-[14px] font-bold text-blue-primary transition-colors hover:bg-sky-tint"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

function Skeletons() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-[46px] w-[46px] rounded-full bg-sky-tint" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-32 rounded bg-sky-tint" />
              <div className="h-2.5 w-20 rounded bg-canvas" />
            </div>
          </div>
          <div className="mt-4 h-3 w-full rounded bg-canvas" />
          <div className="mt-2 h-3 w-4/5 rounded bg-canvas" />
          <div className="mt-2 h-3 w-2/3 rounded bg-canvas" />
        </div>
      ))}
    </>
  );
}

/* ── Circle header (docs/13 Part B) ─────────────────────────────────── */

function CircleHeaderCard({
  circle,
  viewer,
  onToggled,
}: {
  circle: CircleSummary;
  viewer: SafeUser | null;
  onToggled: (next: CircleSummary) => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!viewer || busy) return;
    setBusy(true);
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
        // Nudge the left rail's circle list to refresh its JOINED chips.
        window.dispatchEvent(new Event(CIRCLES_CHANGED_EVENT));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[18px] font-extrabold text-ink-900">
              {circle.name}
            </h1>
            <span className="inline-flex h-5 items-center rounded-full bg-indigo-brand/10 px-2 text-[10px] font-extrabold tracking-[.04em] text-indigo-brand">
              {CIRCLE_KIND_LABELS[circle.kind].toUpperCase()}
            </span>
          </div>
          <p className="mt-1.5 text-[14px]/[1.6] font-medium text-ink-600">
            {circle.description}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-semibold text-ink-600">
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-ink-400" />
              <span className="tnum">
                {circle.members.toLocaleString("en-US")}{" "}
                {circle.members === 1 ? "member" : "members"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-blue-primary" />
              {circle.staffModerated
                ? "Staff-moderated — the care team watches over this circle"
                : "Peer-led — same community guidelines, members hold the space"}
            </span>
          </div>
        </div>
        {viewer ? (
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            aria-pressed={circle.joined}
            className={
              "inline-flex min-h-[44px] flex-none cursor-pointer items-center rounded-full px-6 text-[14px] font-bold transition-colors disabled:cursor-default disabled:opacity-50 " +
              (circle.joined
                ? "border-2 border-blue-primary bg-white text-blue-primary hover:bg-sky-tint"
                : "bg-blue-primary text-white hover:bg-blue-hover")
            }
          >
            {busy ? "One sec…" : circle.joined ? "Leave circle" : "Join circle"}
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-[44px] flex-none items-center rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-hover"
          >
            Sign in to join
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Daily Reflection ritual ────────────────────────────────────────── */

// 14 rotating prompts — deterministic prompt-of-the-day by day of year, so
// every member in a circle sees the same prompt on the same day.
const REFLECTION_PROMPTS = [
  "One thing you're grateful for today",
  "A small win from this week",
  "Something kind someone did for you lately",
  "One thing you're proud of yourself for",
  "A habit that's been helping you lately",
  "Something you're looking forward to",
  "A person who showed up for you — give them a shoutout",
  "One thing today that was harder than it looked",
  "Something you learned about yourself this week",
  "A moment of peace you found recently",
  "One thing you'd tell yourself a year ago",
  "Something small that made you smile today",
  "A goal you're moving toward, one step at a time",
  "Who inspired you this week?",
];

function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400e3);
}

export function reflectionPromptOfTheDay(): string {
  return REFLECTION_PROMPTS[dayOfYear() % REFLECTION_PROMPTS.length];
}

function ReflectionCard({
  viewer,
  onReflect,
}: {
  viewer: SafeUser | null;
  onReflect: (prompt: string) => void;
}) {
  const prompt = reflectionPromptOfTheDay();
  return (
    <div className="rounded-2xl border-[1.5px] border-indigo-brand/25 bg-white px-6 py-4 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-indigo-brand">
            <Sparkles size={13} />
            Daily reflection
          </div>
          <div className="mt-1 text-[15px] font-bold text-ink-900">
            {prompt}
          </div>
        </div>
        {viewer ? (
          <button
            type="button"
            onClick={() => onReflect(prompt)}
            className="inline-flex min-h-[44px] flex-none cursor-pointer items-center rounded-full border-2 border-indigo-brand px-6 text-[13px] font-bold text-indigo-brand transition-colors hover:bg-indigo-brand/10"
          >
            Reflect
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-[44px] flex-none items-center text-[13px] font-semibold text-blue-primary"
          >
            Sign in to reflect →
          </Link>
        )}
      </div>
    </div>
  );
}

/** Center-private alumni circle — shown instead of the feed on a 403. */
function PrivateCircleCard({ name }: { name?: string }) {
  return (
    <div className="rounded-2xl bg-white px-6 py-8 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <ShieldCheck size={22} className="mx-auto text-blue-primary" />
      <div className="mt-2 text-[15px] font-bold text-ink-900">
        {name ? `${name} is` : "This circle is"} private to its center
      </div>
      <div className="mt-1 text-[13px] font-medium text-ink-600">
        Alumni circles are only visible to people from that outreach center
        and staff.
      </div>
    </div>
  );
}

/**
 * Center column of /community — topic chip row (URL-synced via ?topic=),
 * circle view (?circle=), composer, and the paginated + 12s-polled feed.
 */
export default function Feed({
  initialViewer = null,
}: {
  /** Server-resolved session user, so the join card / composer SSRs. */
  initialViewer?: SafeUser | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const circle = searchParams.get("circle") ?? "";
  const rawTopic = searchParams.get("topic") ?? "";
  // A circle replaces the topic lens — one active filter at a time.
  const topic = !circle && TOPICS.includes(rawTopic as Topic) ? rawTopic : "";
  const filterKey = `${topic}|${circle}`;

  const [viewer, setViewer] = useState<SafeUser | null>(initialViewer);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [blocked, setBlocked] = useState(false); // 403 — private alumni circle
  const [circleInfo, setCircleInfo] = useState<CircleSummary | null>(null);
  const [prefill, setPrefill] = useState<ComposerPrefill | null>(null);
  // Guards stale async responses after a filter switch.
  const filterRef = useRef(filterKey);
  filterRef.current = filterKey;

  /* — re-sync auth on the client (covers a stale cached shell) — */
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: SafeUser | null }) => {
        if (alive) setViewer(d.user ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* — circle header info (from the /api/circles directory) — */
  useEffect(() => {
    setCircleInfo(null);
    setPrefill(null);
    if (!circle) return;
    let alive = true;
    fetch("/api/circles", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { circles: [] }))
      .then((d: { circles: CircleSummary[] }) => {
        if (!alive) return;
        setCircleInfo(d.circles?.find((c) => c.id === circle) ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [circle]);

  /* — first page (per filter) — */
  useEffect(() => {
    let alive = true;
    setPosts(null);
    setNextBefore(null);
    setLoadError(false);
    setBlocked(false);
    fetch(feedUrl(topic, circle))
      .then((r) => {
        if (r.status === 403) throw new Error("blocked");
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<FeedResponse>;
      })
      .then((data) => {
        if (!alive || filterRef.current !== filterKey) return;
        setPosts(data.posts);
        setNextBefore(data.nextBefore);
      })
      .catch((e: Error) => {
        if (!alive || filterRef.current !== filterKey) return;
        setPosts([]);
        if (e.message === "blocked") setBlocked(true);
        else setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, [topic, circle, filterKey]);

  /* — 12s polling: refresh page one, merge by id, keep paginated tail — */
  useEffect(() => {
    if (blocked) return; // a private circle never opens up mid-visit
    const id = setInterval(async () => {
      try {
        const res = await fetch(feedUrl(topic, circle));
        if (!res.ok) return;
        const data: FeedResponse = await res.json();
        if (filterRef.current !== filterKey) return;
        setPosts((prev) => {
          if (prev === null) return data.posts;
          const freshIds = new Set(data.posts.map((p) => p.id));
          // Anything already loaded past page one (or optimistic) survives.
          const tail = prev.filter((p) => !freshIds.has(p.id));
          const temps = tail.filter((p) => p.id.startsWith("temp-"));
          const older = tail.filter((p) => !p.id.startsWith("temp-"));
          return [...temps, ...data.posts, ...older];
        });
        setLoadError(false);
      } catch {
        /* next poll will retry */
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [topic, circle, filterKey, blocked]);

  /* — load more (cursor) — */
  const loadMore = useCallback(async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(feedUrl(topic, circle, nextBefore));
      if (!res.ok) throw new Error(String(res.status));
      const data: FeedResponse = await res.json();
      if (filterRef.current !== filterKey) return;
      setPosts((prev) => {
        const have = new Set((prev ?? []).map((p) => p.id));
        return [...(prev ?? []), ...data.posts.filter((p) => !have.has(p.id))];
      });
      setNextBefore(data.nextBefore);
    } catch {
      /* leave the pill for a retry */
    } finally {
      setLoadingMore(false);
    }
  }, [topic, circle, filterKey, nextBefore, loadingMore]);

  const selectTopic = (t: string) => {
    // Also exits any circle — the chip row is the topic lens.
    router.replace(t ? `/community?topic=${t}` : "/community", {
      scroll: false,
    });
  };

  const replacePost = (next: FeedPost) => {
    setPosts((prev) =>
      (prev ?? []).map((p) => (p.id === next.id ? next : p))
    );
  };

  const chips: { value: string; label: string }[] = [
    { value: "", label: "All" },
    ...TOPICS.map((t) => ({ value: t, label: TOPIC_LABELS[t] })),
  ];

  const inPrivateCircle = blocked || (!!circleInfo && circleInfo.locked);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* ── topic chip row (the mobile stand-in for LeftRail's topic nav) ── */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Topics"
      >
        {chips.map((c) => {
          const active = !circle && topic === c.value;
          return (
            <button
              key={c.value || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTopic(c.value)}
              className={
                "inline-flex h-11 flex-none cursor-pointer items-center rounded-full border-2 px-5 text-[14px] transition-colors " +
                (active
                  ? "border-blue-primary bg-sky-tint font-bold text-blue-primary"
                  : "border-sky-tint bg-white font-semibold text-ink-600 hover:border-sky-tint-2")
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── circle header + daily reflection ritual ── */}
      {circle && circleInfo && (
        <CircleHeaderCard
          circle={circleInfo}
          viewer={viewer}
          onToggled={setCircleInfo}
        />
      )}
      {circle && !inPrivateCircle && (
        <ReflectionCard
          viewer={viewer}
          onReflect={(prompt) =>
            setPrefill({ text: `${prompt} — `, nonce: Date.now() })
          }
        />
      )}

      {/* ── composer / join card ── */}
      {inPrivateCircle ? null : viewer ? (
        <Composer
          viewer={viewer}
          topic={topic}
          circleId={circle || undefined}
          circleName={circleInfo?.name}
          prefill={prefill}
          onPosted={(p) => {
            // Only surface it here if it belongs in the current filter.
            if (circle || !topic || (p.topic ?? "general") === topic) {
              setPosts((prev) => [p, ...(prev ?? [])]);
            } else {
              selectTopic(p.topic ?? "general");
            }
          }}
        />
      ) : (
        <JoinCard />
      )}

      {/* ── the feed ── */}
      {inPrivateCircle ? (
        <PrivateCircleCard name={circleInfo?.name} />
      ) : posts === null ? (
        <Skeletons />
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-8 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-[15px] font-bold text-ink-900">
            {loadError
              ? "The feed is catching its breath"
              : circle
                ? `It's quiet in ${circleInfo?.name ?? "this circle"} — start it.`
                : topic
                  ? `Nothing in ${TOPIC_LABELS[topic as Topic]} yet — start it.`
                  : "It's quiet in here"}
          </div>
          <div className="mt-1 text-[13px] font-medium text-ink-600">
            {loadError
              ? "We'll keep trying — hang tight."
              : circle
                ? "Today's reflection prompt is a good place to begin."
                : "Be the first to share something with the community."}
          </div>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewer={viewer}
              onChange={replacePost}
            />
          ))}
          {nextBefore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mx-auto inline-flex min-h-[44px] cursor-pointer items-center rounded-full border-2 border-sky-tint-2 bg-white px-8 text-[14px] font-bold text-blue-primary transition-colors hover:border-blue-primary disabled:cursor-default disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
