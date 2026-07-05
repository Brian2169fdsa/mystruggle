"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Send } from "lucide-react";
import type { Comment, Post, PostKind, SafeUser } from "@/app/lib/types";

/* ── helpers ─────────────────────────────────────────────────────────── */

/** "Just now" → "5m ago" → "2h ago" → "2d ago" → "Jul 4". */
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function initialOf(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/** Fired by the celebration flow (and anyone else) to refresh immediately. */
export const FEED_REFRESH_EVENT = "mystruggle:feed-refresh";

/* ── small pieces ────────────────────────────────────────────────────── */

/** Initial tile on the author's color. */
function AvatarTile({
  name,
  color,
  size = 42,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: color || "#4e5b9b",
      }}
    >
      {initialOf(name)}
    </div>
  );
}

function MentorChip() {
  return (
    <span className="ml-1 inline-flex h-5 items-center rounded-full bg-indigo-brand px-2 text-[10px] font-extrabold tracking-[.04em] text-white">
      MENTOR
    </span>
  );
}

function KindChip({ kind }: { kind: PostKind }) {
  if (kind === "milestone")
    return (
      <span className="ml-1 inline-flex h-5 items-center rounded-full bg-gold-bg px-2 text-[10px] font-extrabold text-gold-ink">
        ◆ MILESTONE
      </span>
    );
  if (kind === "win")
    return (
      <span className="ml-1 inline-flex h-5 items-center rounded-full bg-sky-tint px-2 text-[10px] font-extrabold text-blue-primary">
        WIN
      </span>
    );
  return null;
}

/* ── the feed ────────────────────────────────────────────────────────── */

const COMPOSER_KINDS: { value: PostKind; label: string; gold?: boolean }[] = [
  { value: "regular", label: "Post" },
  { value: "milestone", label: "Milestone", gold: true },
  { value: "win", label: "Win" },
];

/**
 * Facebook-style community feed — fully self-contained.
 * Fetches its own auth + posts, polls every 10s, optimistic everywhere.
 */
export default function CommunityFeed({ compact = false }: { compact?: boolean }) {
  const [viewer, setViewer] = useState<SafeUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // composer
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<PostKind>("regular");
  const [posting, setPosting] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // per-post UI
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [signInNote, setSignInNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error("feed fetch failed");
      const data: { posts: Post[] } = await res.json();
      // Keep optimistic (temp-) entries at the top until the server confirms.
      setPosts((prev) => {
        const temps = (prev ?? []).filter((p) => p.id.startsWith("temp-"));
        return [...temps, ...data.posts];
      });
      setLoadError(false);
    } catch {
      setPosts((prev) => (prev === null ? [] : prev));
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: SafeUser | null }) => {
        if (!alive) return;
        setViewer(d.user ?? null);
        setAuthChecked(true);
      })
      .catch(() => alive && setAuthChecked(true));
    refresh();

    const id = setInterval(refresh, 10_000);
    const onPoke = () => refresh();
    window.addEventListener(FEED_REFRESH_EVENT, onPoke);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener(FEED_REFRESH_EVENT, onPoke);
      if (noteTimer.current) clearTimeout(noteTimer.current);
    };
  }, [refresh]);

  const flashSignInNote = (postId: string) => {
    setSignInNote(postId);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setSignInNote(null), 2600);
  };

  /* — share a post — */
  const submitPost = async () => {
    const text = draft.trim();
    if (!text || posting || !viewer) return;
    setPosting(true);
    setComposerError(null);

    const temp: Post = {
      id: `temp-${Date.now()}`,
      authorId: viewer.id,
      authorName: viewer.name,
      authorRole: viewer.role,
      avatarColor: viewer.avatarColor,
      body: text,
      kind,
      status: "approved",
      hearts: [],
      comments: [],
      createdAt: Date.now(),
    };
    setPosts((prev) => [temp, ...(prev ?? [])]);
    setDraft("");
    setKind("regular");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, kind: temp.kind }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: { post: Post } = await res.json();
      setPosts((prev) =>
        (prev ?? []).map((p) => (p.id === temp.id ? data.post : p))
      );
    } catch {
      setPosts((prev) => (prev ?? []).filter((p) => p.id !== temp.id));
      setDraft(text);
      setComposerError("That didn't go through — mind trying again?");
    } finally {
      setPosting(false);
    }
  };

  /* — heart toggle — */
  const toggleHeart = async (post: Post) => {
    if (post.id.startsWith("temp-")) return;
    if (!viewer) {
      flashSignInNote(post.id);
      return;
    }
    const vid = viewer.id;
    const had = post.hearts.includes(vid);
    // optimistic flip
    setPosts((prev) =>
      (prev ?? []).map((p) =>
        p.id === post.id
          ? {
              ...p,
              hearts: had
                ? p.hearts.filter((h) => h !== vid)
                : [...p.hearts, vid],
            }
          : p
      )
    );
    try {
      const res = await fetch(`/api/posts/${post.id}/react`, { method: "POST" });
      if (res.status === 401) {
        setViewer(null);
        throw new Error("401");
      }
      if (!res.ok) throw new Error(String(res.status));
      const data: { hearts: number; hearted: boolean } = await res.json();
      // reconcile with the server's authoritative count
      setPosts((prev) =>
        (prev ?? []).map((p) => {
          if (p.id !== post.id) return p;
          const others = Math.max(0, data.hearts - (data.hearted ? 1 : 0));
          const filler = p.hearts.filter((h) => h !== vid).slice(0, others);
          while (filler.length < others) filler.push(`other-${filler.length}`);
          return { ...p, hearts: data.hearted ? [...filler, vid] : filler };
        })
      );
    } catch (e) {
      // revert
      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id
            ? {
                ...p,
                hearts: had
                  ? [...p.hearts.filter((h) => h !== vid), vid]
                  : p.hearts.filter((h) => h !== vid),
              }
            : p
        )
      );
      if ((e as Error).message === "401") flashSignInNote(post.id);
    }
  };

  /* — comments — */
  const submitComment = async (post: Post) => {
    const text = (commentDrafts[post.id] ?? "").trim();
    if (!text || post.id.startsWith("temp-")) return;
    if (!viewer) {
      flashSignInNote(post.id);
      return;
    }
    const temp: Comment = {
      id: `temp-c-${Date.now()}`,
      authorId: viewer.id,
      authorName: viewer.name,
      authorRole: viewer.role,
      body: text,
      createdAt: Date.now(),
    };
    setPosts((prev) =>
      (prev ?? []).map((p) =>
        p.id === post.id ? { ...p, comments: [...p.comments, temp] } : p
      )
    );
    setCommentDrafts((d) => ({ ...d, [post.id]: "" }));
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.status === 401) {
        setViewer(null);
        throw new Error("401");
      }
      if (!res.ok) throw new Error(String(res.status));
      const data: { comment: Comment } = await res.json();
      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === temp.id ? data.comment : c
                ),
              }
            : p
        )
      );
    } catch (e) {
      setPosts((prev) =>
        (prev ?? []).map((p) =>
          p.id === post.id
            ? { ...p, comments: p.comments.filter((c) => c.id !== temp.id) }
            : p
        )
      );
      setCommentDrafts((d) => ({ ...d, [post.id]: text }));
      if ((e as Error).message === "401") flashSignInNote(post.id);
    }
  };

  /* — card chrome (matches the existing member-app feed pixel-for-pixel) — */
  const cardPad = compact ? "px-5 py-[18px]" : "px-6 py-5";
  const cardBase = (p: Post) =>
    p.kind === "milestone"
      ? `rounded-2xl border-[1.5px] border-gold-border bg-white ${cardPad} shadow-[0_2px_8px_rgba(234,179,8,.15)]`
      : `rounded-2xl bg-white ${cardPad} shadow-[0_1px_3px_rgba(11,37,69,.06)]`;

  return (
    <div className={`flex flex-col ${compact ? "gap-4" : "gap-5"}`}>
      {/* ── composer ── */}
      {!authChecked ? null : viewer ? (
        <div
          className={`rounded-2xl bg-white ${cardPad} shadow-[0_1px_3px_rgba(11,37,69,.06)]`}
        >
          <div className="flex items-start gap-3">
            <AvatarTile name={viewer.name} color={viewer.avatarColor} size={42} />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={compact ? 2 : 3}
              maxLength={2000}
              placeholder="Share a win, a thought, or a thank-you…"
              className="min-h-[64px] flex-1 resize-none rounded-xl border border-sky-tint bg-canvas px-3.5 py-2.5 text-[14px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {COMPOSER_KINDS.map((k) => {
                const active = kind === k.value;
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={
                      "inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border-[1.5px] px-3 text-[12px] font-bold " +
                      (active
                        ? k.value === "milestone"
                          ? "border-gold-border bg-gold-bg text-gold-ink"
                          : "border-sky-tint-2 bg-sky-tint text-blue-primary"
                        : "border-sky-tint bg-white text-ink-600")
                    }
                  >
                    {k.gold && (
                      <span className={active ? "text-gold-ink" : "text-gold-badge"}>
                        ◆
                      </span>
                    )}
                    {k.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={submitPost}
              disabled={!draft.trim() || posting}
              className="inline-flex h-9 cursor-pointer items-center rounded-full bg-blue-primary px-5 text-[13px] font-bold text-white transition-colors hover:bg-blue-hover disabled:cursor-default disabled:opacity-40"
            >
              {posting ? "Sharing…" : "Share"}
            </button>
          </div>
          {composerError && (
            <div className="mt-2 text-[12px] font-semibold text-heart-red">
              {composerError}
            </div>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className={`block rounded-2xl border border-sky-tint bg-white ${cardPad} shadow-[0_1px_3px_rgba(11,37,69,.06)]`}
        >
          <div className="text-[14px] font-bold text-ink-900">
            Sign in to share with the community
          </div>
          <div className="mt-0.5 text-[13px] font-medium text-ink-600">
            Your wins, thoughts, and thank-yous belong here. →
          </div>
        </Link>
      )}

      {/* ── posts ── */}
      {posts === null ? (
        <>
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`animate-pulse rounded-2xl bg-white ${cardPad} shadow-[0_1px_3px_rgba(11,37,69,.06)]`}
            >
              <div className="flex items-center gap-3">
                <div className="h-[42px] w-[42px] rounded-full bg-sky-tint" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3 w-28 rounded bg-sky-tint" />
                  <div className="h-2.5 w-20 rounded bg-canvas" />
                </div>
              </div>
              <div className="mt-4 h-3 w-full rounded bg-canvas" />
              <div className="mt-2 h-3 w-2/3 rounded bg-canvas" />
            </div>
          ))}
        </>
      ) : posts.length === 0 ? (
        <div
          className={`rounded-2xl bg-white ${cardPad} text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]`}
        >
          <div className="text-[14px] font-bold text-ink-900">
            {loadError ? "The feed is catching its breath" : "It's quiet in here"}
          </div>
          <div className="mt-1 text-[13px] font-medium text-ink-600">
            {loadError
              ? "We'll keep trying — hang tight."
              : "Be the first to share something with the community."}
          </div>
        </div>
      ) : (
        posts.map((post) => {
          const hearted = !!viewer && post.hearts.includes(viewer.id);
          const isOpen = !!expanded[post.id];
          return (
            <div key={post.id} className={cardBase(post)}>
              {/* header */}
              <div className="flex items-center gap-3">
                <AvatarTile name={post.authorName} color={post.avatarColor} />
                <div>
                  <div className="text-[14px] font-bold text-ink-900">
                    {post.authorName}
                    {post.authorRole === "mentor" && <MentorChip />}
                    <KindChip kind={post.kind} />
                  </div>
                  <div className="text-[12px] text-ink-600">
                    {timeAgo(post.createdAt)} · community
                  </div>
                </div>
              </div>

              {/* body */}
              <div className="mt-3 whitespace-pre-wrap text-[15px]/[1.6] font-medium text-ink-900">
                {post.body}
              </div>

              {/* actions */}
              <div className="mt-3.5 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => toggleHeart(post)}
                  aria-pressed={hearted}
                  className={
                    "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-[13px] font-bold " +
                    (hearted
                      ? "border-heart-bg bg-heart-bg text-heart-red"
                      : "border-sky-tint bg-white text-ink-600")
                  }
                >
                  <Heart
                    size={14}
                    fill={hearted ? "currentColor" : "none"}
                    className={hearted ? "text-heart-red" : "text-ink-400"}
                  />
                  <span className="tnum">{post.hearts.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((e) => ({ ...e, [post.id]: !e[post.id] }))
                  }
                  className="cursor-pointer text-[13px] font-semibold text-ink-600"
                >
                  {post.comments.length}{" "}
                  {post.comments.length === 1 ? "comment" : "comments"}
                </button>
                {signInNote === post.id && (
                  <span className="text-[12px] font-semibold text-indigo-brand">
                    Sign in to react
                  </span>
                )}
              </div>

              {/* comments */}
              {isOpen && (
                <div className="mt-3.5 flex flex-col gap-2.5 border-t border-canvas pt-3.5">
                  {post.comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sky-tint text-[11px] font-extrabold text-indigo-brand">
                        {initialOf(c.authorName)}
                      </div>
                      <div className="flex-1 rounded-xl bg-canvas px-3 py-2">
                        <div className="text-[12px] font-bold text-ink-900">
                          {c.authorName}
                          {c.authorRole === "mentor" && (
                            <span className="ml-1.5 text-[10px] font-extrabold tracking-[.06em] text-indigo-brand">
                              MENTOR
                            </span>
                          )}
                          <span className="ml-1.5 text-[11px] font-medium text-ink-400">
                            {timeAgo(c.createdAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[13px]/[1.5] font-medium text-ink-900">
                          {c.body}
                        </div>
                      </div>
                    </div>
                  ))}

                  {viewer ? (
                    <div className="mt-1 flex items-center gap-2">
                      <AvatarTile
                        name={viewer.name}
                        color={viewer.avatarColor}
                        size={28}
                      />
                      <input
                        value={commentDrafts[post.id] ?? ""}
                        onChange={(e) =>
                          setCommentDrafts((d) => ({
                            ...d,
                            [post.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            submitComment(post);
                          }
                        }}
                        maxLength={1000}
                        placeholder="Add something kind…"
                        className="h-11 flex-1 rounded-full border border-sky-tint bg-white px-4 text-[13px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => submitComment(post)}
                        disabled={!(commentDrafts[post.id] ?? "").trim()}
                        aria-label="Send comment"
                        className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-blue-primary text-white transition-colors hover:bg-blue-hover disabled:cursor-default disabled:opacity-40"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="mt-1 text-[13px] font-semibold text-blue-primary"
                    >
                      Sign in to join the conversation →
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
