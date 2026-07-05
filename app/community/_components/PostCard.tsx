"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Send, ThumbsUp, Users } from "lucide-react";
import type { Comment, SafeUser } from "@/app/lib/types";
import {
  AvatarTile,
  KindChip,
  MentorChip,
  TopicTag,
  timeAgo,
  type FeedPost,
} from "./ui";

/** Progress + Give card rendered inside a support-request post. */
function RequestCard({
  request,
  authorSlug,
}: {
  request: NonNullable<FeedPost["request"]>;
  authorSlug: string | null;
}) {
  const pct = Math.min(
    100,
    Math.round((request.raised / Math.max(1, request.weeklyTarget)) * 100)
  );
  const funded = request.status === "funded";
  return (
    <div className="mt-3.5 rounded-xl border border-sky-tint-2 bg-canvas px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[14px] font-bold text-ink-900">{request.label}</div>
        {funded && (
          <span className="inline-flex h-6 flex-none items-center gap-1 rounded-full bg-success/10 px-2.5 text-[11px] font-extrabold text-success">
            ✓ Funded
          </span>
        )}
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-sky-tint-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-brand to-blue-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="tnum text-[13px] font-semibold text-ink-600">
          <span className="font-extrabold text-ink-900">${request.raised}</span>{" "}
          of ${request.weeklyTarget}/week
        </div>
        {!funded && authorSlug && (
          <Link
            href={`/p/${authorSlug}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white transition-colors hover:bg-blue-hover"
          >
            Give <Heart size={13} fill="currentColor" />
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Desktop feed card — roomier than the phone shell. Optimistic hearts,
 * expandable comments with an inline input; warm sign-in nudges when out.
 */
export default function PostCard({
  post,
  viewer,
  onChange,
}: {
  post: FeedPost;
  viewer: SafeUser | null;
  onChange: (next: FeedPost) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [nudge, setNudge] = useState(false);
  const temp = post.id.startsWith("temp-");

  const showNudge = () => {
    setNudge(true);
    setTimeout(() => setNudge(false), 3200);
  };

  /* — heart (optimistic toggle) — */
  const toggleHeart = async () => {
    if (temp) return;
    if (!viewer) return showNudge();
    const had = post.hearts.includes(viewer.id);
    const flipped = had
      ? post.hearts.filter((h) => h !== viewer.id)
      : [...post.hearts, viewer.id];
    onChange({ ...post, hearts: flipped });
    try {
      const res = await fetch(`/api/posts/${post.id}/react`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const data: { hearts: number; hearted: boolean } = await res.json();
      // reconcile to the server's authoritative count
      const others = Math.max(0, data.hearts - (data.hearted ? 1 : 0));
      const filler = flipped.filter((h) => h !== viewer.id).slice(0, others);
      while (filler.length < others) filler.push(`other-${filler.length}`);
      onChange({
        ...post,
        hearts: data.hearted ? [...filler, viewer.id] : filler,
      });
    } catch {
      onChange({ ...post, hearts: post.hearts }); // revert
    }
  };

  /* — proud / same (docs/13 Part B shared-experience reactions) — */
  const toggleShared = async (kind: "proud" | "same") => {
    if (temp) return;
    if (!viewer) return showNudge();
    const current = (kind === "proud" ? post.proud : post.same) ?? [];
    const had = current.includes(viewer.id);
    const flipped = had
      ? current.filter((x) => x !== viewer.id)
      : [...current, viewer.id];
    onChange({ ...post, [kind]: flipped });
    try {
      const res = await fetch(`/api/posts/${post.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: {
        counts: { hearts: number; proud: number; same: number };
        mine: { heart: boolean; proud: boolean; same: boolean };
      } = await res.json();
      // reconcile to the server's authoritative count
      const on = data.mine[kind];
      const others = Math.max(0, data.counts[kind] - (on ? 1 : 0));
      const filler = flipped.filter((x) => x !== viewer.id).slice(0, others);
      while (filler.length < others) filler.push(`other-${filler.length}`);
      onChange({ ...post, [kind]: on ? [...filler, viewer.id] : filler });
    } catch {
      onChange({ ...post, [kind]: current }); // revert
    }
  };

  /* — comment — */
  const submitComment = async () => {
    const text = draft.trim();
    if (!text || temp) return;
    if (!viewer) return showNudge();
    const optimistic: Comment = {
      id: `temp-c-${Date.now()}`,
      authorId: viewer.id,
      authorName: viewer.name,
      authorRole: viewer.role,
      body: text,
      createdAt: Date.now(),
    };
    const withTemp = { ...post, comments: [...post.comments, optimistic] };
    onChange(withTemp);
    setDraft("");
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: { comment: Comment } = await res.json();
      onChange({
        ...withTemp,
        comments: withTemp.comments.map((c) =>
          c.id === optimistic.id ? data.comment : c
        ),
      });
    } catch {
      onChange({ ...post, comments: post.comments });
      setDraft(text);
    }
  };

  const hearted = !!viewer && post.hearts.includes(viewer.id);
  const proud = (post.proud ?? []).length;
  const same = (post.same ?? []).length;
  const amProud = !!viewer && (post.proud ?? []).includes(viewer.id);
  const amSame = !!viewer && (post.same ?? []).includes(viewer.id);
  const milestone = post.kind === "milestone";

  return (
    <article
      className={
        milestone
          ? "rounded-2xl border-[1.5px] border-indigo-brand/35 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(78,91,155,.12)]"
          : "rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
      }
    >
      {/* header — author links to their public profile when they have one */}
      <div className="flex items-start gap-3">
        {post.authorSlug ? (
          <Link href={`/community/u/${post.authorSlug}`} className="flex-none">
            <AvatarTile name={post.authorName} color={post.avatarColor} size={46} />
          </Link>
        ) : (
          <AvatarTile name={post.authorName} color={post.avatarColor} size={46} />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {post.authorSlug ? (
              <Link
                href={`/community/u/${post.authorSlug}`}
                className="text-[15px] font-bold text-ink-900 hover:text-blue-primary"
              >
                {post.authorName}
              </Link>
            ) : (
              <span className="text-[15px] font-bold text-ink-900">
                {post.authorName}
              </span>
            )}
            {post.authorRole === "mentor" && <MentorChip />}
            <KindChip kind={post.kind} />
            <TopicTag topic={post.topic ?? "general"} />
          </div>
          <div className="mt-0.5 text-[12px] font-medium text-ink-600">
            {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="mt-3.5 whitespace-pre-wrap text-[15px]/[1.65] font-medium text-ink-900">
        {post.body}
      </div>

      {/* support request */}
      {post.request && (
        <RequestCard request={post.request} authorSlug={post.authorSlug} />
      )}

      {/* actions */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleHeart}
          aria-pressed={hearted}
          className={
            "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition-colors " +
            (hearted
              ? "border-heart-bg bg-heart-bg text-heart-red"
              : "border-sky-tint bg-white text-ink-600 hover:border-sky-tint-2")
          }
        >
          <Heart
            size={15}
            fill={hearted ? "currentColor" : "none"}
            className={hearted ? "text-heart-red" : "text-ink-400"}
          />
          <span className="tnum">{post.hearts.length}</span>
        </button>
        {/* shared-experience pair — text pills, never emoji (house style) */}
        <button
          type="button"
          onClick={() => toggleShared("proud")}
          aria-pressed={amProud}
          aria-label={`Proud of you (${proud})`}
          className={
            "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition-colors " +
            (amProud
              ? "border-indigo-brand bg-indigo-brand/10 text-indigo-brand"
              : "border-sky-tint bg-white text-ink-600 hover:border-sky-tint-2")
          }
        >
          <ThumbsUp
            size={15}
            className={amProud ? "text-indigo-brand" : "text-ink-400"}
          />
          Proud <span className="tnum">{proud}</span>
        </button>
        <button
          type="button"
          onClick={() => toggleShared("same")}
          aria-pressed={amSame}
          aria-label={`Same here (${same})`}
          className={
            "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition-colors " +
            (amSame
              ? "border-blue-primary bg-sky-tint text-blue-primary"
              : "border-sky-tint bg-white text-ink-600 hover:border-sky-tint-2")
          }
        >
          <Users
            size={15}
            className={amSame ? "text-blue-primary" : "text-ink-400"}
          />
          Same here <span className="tnum">{same}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-2 text-[13px] font-semibold text-ink-600 hover:text-blue-primary"
        >
          {post.comments.length}{" "}
          {post.comments.length === 1 ? "comment" : "comments"}
        </button>
        {nudge && (
          <span className="text-[12px] font-semibold text-indigo-brand">
            This one needs an account —{" "}
            <Link href="/login" className="underline">
              sign in
            </Link>{" "}
            to join in.
          </span>
        )}
      </div>

      {/* comments */}
      {open && (
        <div className="mt-4 flex flex-col gap-2.5 border-t border-canvas pt-4">
          {post.comments.length === 0 && (
            <div className="text-[13px] font-medium text-ink-600">
              No comments yet — say something kind.
            </div>
          )}
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sky-tint text-[12px] font-extrabold text-indigo-brand">
                {(c.authorName.trim()[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1 rounded-xl bg-canvas px-3.5 py-2.5">
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
                <div className="mt-0.5 text-[13px]/[1.55] font-medium text-ink-900">
                  {c.body}
                </div>
              </div>
            </div>
          ))}

          {viewer ? (
            <div className="mt-1 flex items-center gap-2">
              <AvatarTile name={viewer.name} color={viewer.avatarColor} size={32} />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                maxLength={1000}
                placeholder="Add something kind…"
                className="h-11 flex-1 rounded-full border border-sky-tint bg-white px-4 text-[13px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={!draft.trim()}
                aria-label="Send comment"
                className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full bg-blue-primary text-white transition-colors hover:bg-blue-hover disabled:cursor-default disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="mt-1 inline-flex min-h-[44px] items-center text-[13px] font-semibold text-blue-primary"
            >
              Sign in to join the conversation →
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
