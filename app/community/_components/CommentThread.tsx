"use client";

// Inline comment thread for a feed post — big-social reading pattern,
// recovery voice. Collapsed to the latest two comments by default; the full
// list is already on the posts payload (GET /api/posts ships each post's
// comments array), so "View more" is a local expand, not a fetch.
//
// No comment-heart button on purpose: there is no per-comment reaction API
// today, and a dead control would be worse than none.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import type { Comment, SafeUser } from "@/app/lib/types";
import { AvatarTile, timeAgo, type FeedPost } from "./ui";

/** How many of the latest comments show before "View more". */
const PREVIEW_COUNT = 2;

function CommentRow({ comment }: { comment: Comment }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sky-tint text-[12px] font-extrabold text-indigo-brand">
        {(comment.authorName.trim()[0] ?? "?").toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="inline-block max-w-full rounded-2xl bg-canvas px-3 py-2">
          <div className="text-[13px] font-bold text-ink-900">
            {comment.authorName}
            {comment.authorRole === "mentor" && (
              <span className="ml-1.5 text-[10px] font-extrabold tracking-[.06em] text-indigo-brand">
                MENTOR
              </span>
            )}
          </div>
          <div className="mt-0.5 whitespace-pre-wrap text-[14px]/[1.5] font-medium text-ink-900">
            {comment.body}
          </div>
        </div>
        <div className="mt-1 px-3 text-[11px] font-semibold text-ink-400">
          {timeAgo(comment.createdAt)}
        </div>
      </div>
    </div>
  );
}

/**
 * Comments + composer under a PostCard. Optimistic append on send; a 401
 * (session gone) gets the warm sign-in nudge instead of a cold error.
 */
export default function CommentThread({
  post,
  viewer,
  onChange,
  focusKey,
}: {
  post: FeedPost;
  viewer: SafeUser | null;
  onChange: (next: FeedPost) => void;
  /** Bump to pull focus into the composer input (Comment action button). */
  focusKey: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const [nudge, setNudge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const temp = post.id.startsWith("temp-");

  useEffect(() => {
    if (focusKey > 0) inputRef.current?.focus();
  }, [focusKey]);

  const showNudge = () => {
    setNudge(true);
    setTimeout(() => setNudge(false), 3200);
  };

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
      if (res.status === 401) {
        // Session expired mid-write — roll back, keep their words, ask warmly.
        onChange({ ...post, comments: post.comments });
        setDraft(text);
        showNudge();
        return;
      }
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

  const comments = post.comments;
  const visible = showAll ? comments : comments.slice(-PREVIEW_COUNT);
  const hiddenCount = comments.length - visible.length;

  return (
    <div className="mt-3 flex flex-col gap-2.5 border-t border-canvas pt-3.5">
      {comments.length === 0 && (
        <div className="text-[13px] font-medium text-ink-600">
          No comments yet — say something kind.
        </div>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-start cursor-pointer text-[13px] font-bold text-ink-600 transition-colors hover:text-blue-primary"
        >
          View {hiddenCount} more {hiddenCount === 1 ? "comment" : "comments"}
        </button>
      )}

      {visible.map((c) => (
        <CommentRow key={c.id} comment={c} />
      ))}

      {viewer ? (
        <div className="mt-1 flex items-center gap-2">
          <AvatarTile name={viewer.name} color={viewer.avatarColor} size={32} />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitComment();
              }
            }}
            maxLength={1000}
            placeholder="Write something kind…"
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
  );
}
