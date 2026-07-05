"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TOPICS, type SafeUser, type Topic } from "@/app/lib/types";
import Composer from "./Composer";
import PostCard from "./PostCard";
import { TOPIC_LABELS, type FeedPost } from "./ui";

const PAGE_SIZE = 20;
const POLL_MS = 12_000;

type FeedResponse = {
  posts: FeedPost[];
  viewerId: string | null;
  nextBefore: number | null;
};

function feedUrl(topic: string, before?: number | null): string {
  const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (topic) qs.set("topic", topic);
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

/**
 * Center column of /community — topic chip row (URL-synced via ?topic=),
 * composer, and the paginated + 12s-polled desktop feed.
 */
export default function Feed({
  initialViewer = null,
}: {
  /** Server-resolved session user, so the join card / composer SSRs. */
  initialViewer?: SafeUser | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTopic = searchParams.get("topic") ?? "";
  const topic = TOPICS.includes(rawTopic as Topic) ? rawTopic : "";

  const [viewer, setViewer] = useState<SafeUser | null>(initialViewer);
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Guards stale async responses after a topic switch.
  const topicRef = useRef(topic);
  topicRef.current = topic;

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

  /* — first page (per topic) — */
  useEffect(() => {
    let alive = true;
    setPosts(null);
    setNextBefore(null);
    setLoadError(false);
    fetch(feedUrl(topic))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<FeedResponse>;
      })
      .then((data) => {
        if (!alive || topicRef.current !== topic) return;
        setPosts(data.posts);
        setNextBefore(data.nextBefore);
      })
      .catch(() => {
        if (!alive || topicRef.current !== topic) return;
        setPosts([]);
        setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, [topic]);

  /* — 12s polling: refresh page one, merge by id, keep paginated tail — */
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(feedUrl(topic));
        if (!res.ok) return;
        const data: FeedResponse = await res.json();
        if (topicRef.current !== topic) return;
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
  }, [topic]);

  /* — load more (cursor) — */
  const loadMore = useCallback(async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(feedUrl(topic, nextBefore));
      if (!res.ok) throw new Error(String(res.status));
      const data: FeedResponse = await res.json();
      if (topicRef.current !== topic) return;
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
  }, [topic, nextBefore, loadingMore]);

  const selectTopic = (t: string) => {
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

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* ── topic chip row (the mobile stand-in for LeftRail's topic nav) ── */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Topics"
      >
        {chips.map((c) => {
          const active = topic === c.value;
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

      {/* ── composer / join card ── */}
      {viewer ? (
        <Composer viewer={viewer} topic={topic} onPosted={(p) => setPosts((prev) => [p, ...(prev ?? [])])} />
      ) : (
        <JoinCard />
      )}

      {/* ── the feed ── */}
      {posts === null ? (
        <Skeletons />
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-8 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-[15px] font-bold text-ink-900">
            {loadError
              ? "The feed is catching its breath"
              : topic
                ? `Nothing in ${TOPIC_LABELS[topic as Topic]} yet — start it.`
                : "It's quiet in here"}
          </div>
          <div className="mt-1 text-[13px] font-medium text-ink-600">
            {loadError
              ? "We'll keep trying — hang tight."
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
