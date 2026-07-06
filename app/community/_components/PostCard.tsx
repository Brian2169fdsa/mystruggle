"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  ThumbsUp,
  UserRoundX,
  Users,
} from "lucide-react";
import type { SafeUser } from "@/app/lib/types";
import { setBlock } from "./BlockControls";
import CommentThread from "./CommentThread";
import ReportModal from "./ReportModal";
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

/** Short statuses read like a headline — the big-social pattern. */
function isShortStatus(body: string): boolean {
  return body.length <= 80 && !body.includes("\n");
}

/**
 * Desktop feed card — modern social anatomy: header, body (short statuses
 * render large), social-proof summary row, hairline, equal action buttons,
 * inline CommentThread. Optimistic hearts + shared-experience reactions;
 * warm sign-in nudges when out.
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
  const [focusKey, setFocusKey] = useState(0);
  const [nudge, setNudge] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const temp = post.id.startsWith("temp-");
  // Never offer "block yourself"; the whole overflow menu is hidden on own posts.
  const isOwn = !!viewer && viewer.id === post.authorId;

  const blockAuthor = async () => {
    setMenuOpen(false);
    if (blocking || !viewer) return;
    setBlocking(true);
    // setBlock broadcasts BLOCKS_CHANGED_EVENT → the feed re-filters and this
    // author's posts fall away on their own.
    await setBlock(post.authorId, "block");
    setBlocking(false);
  };

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

  /** Comment action: expand the thread and pull focus into the composer. */
  const openComposer = () => {
    setOpen(true);
    setFocusKey((k) => k + 1);
  };

  const hearted = !!viewer && post.hearts.includes(viewer.id);
  const hearts = post.hearts.length;
  const proud = (post.proud ?? []).length;
  const same = (post.same ?? []).length;
  const amProud = !!viewer && (post.proud ?? []).includes(viewer.id);
  const amSame = !!viewer && (post.same ?? []).includes(viewer.id);
  const commentCount = post.comments.length;
  const milestone = post.kind === "milestone";

  return (
    <article
      id={`post-${post.id}`}
      className={
        // scroll-mt keeps journey-rail deep links from hiding under the header
        (milestone
          ? "rounded-2xl border-[1.5px] border-indigo-brand/35 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(78,91,155,.12)]"
          : "rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]") +
        " scroll-mt-24"
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
        <div className="min-w-0 flex-1">
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

        {/* safety overflow menu — hidden on your own posts and on temp posts */}
        {!isOwn && !temp && (
          <div className="relative flex-none">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Post options"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-canvas hover:text-ink-600"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <>
                {/* click-away backdrop */}
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div
                  role="menu"
                  className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-2xl border border-sky-tint bg-white py-1 shadow-[0_10px_30px_rgba(11,37,69,.16)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-[14px] font-semibold text-ink-900 transition-colors hover:bg-canvas"
                  >
                    <Flag size={15} className="flex-none text-blue-primary" />
                    Report post
                  </button>
                  {viewer && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={blockAuthor}
                      disabled={blocking}
                      className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-[14px] font-semibold text-ink-900 transition-colors hover:bg-canvas disabled:opacity-50"
                    >
                      <UserRoundX size={15} className="flex-none text-ink-400" />
                      <span className="truncate">Block {post.authorName}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* body — short statuses read large, like a headline */}
      <div
        className={
          "mt-3.5 whitespace-pre-wrap text-ink-900 " +
          (isShortStatus(post.body)
            ? "text-[23px]/[1.35] font-semibold"
            : "text-[16px]/[1.55] font-medium")
        }
      >
        {post.body}
      </div>

      {/* support request */}
      {post.request && (
        <RequestCard request={post.request} authorSlug={post.authorSlug} />
      )}

      {/* social-proof summary — only when there's something to show */}
      {(hearts > 0 || proud > 0 || same > 0 || commentCount > 0) && (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px] font-semibold text-ink-600">
          <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
            {hearts > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-heart-red">
                  <Heart size={10} fill="white" className="text-white" />
                </span>
                <span className="tnum">{hearts}</span>
              </span>
            )}
            {proud > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-indigo-brand">
                  <ThumbsUp size={10} className="text-white" />
                </span>
                <span className="tnum">{proud}</span> proud
              </span>
            )}
            {same > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-blue-primary">
                  <Users size={10} className="text-white" />
                </span>
                <span className="tnum">{same}</span> same here
              </span>
            )}
          </div>
          {commentCount > 0 && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="cursor-pointer font-semibold text-ink-600 transition-colors hover:text-blue-primary"
            >
              <span className="tnum">{commentCount}</span>{" "}
              {commentCount === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      )}

      {/* hairline + equal action buttons */}
      <div className="mt-3 grid grid-cols-2 gap-1 border-t border-canvas pt-1.5 sm:grid-cols-4">
        <button
          type="button"
          onClick={toggleHeart}
          aria-pressed={hearted}
          aria-label={`Heart (${hearts})`}
          className={
            "inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors hover:bg-canvas " +
            (hearted ? "text-heart-red" : "text-ink-600")
          }
        >
          <Heart size={16} fill={hearted ? "currentColor" : "none"} />
          Heart
        </button>
        {/* shared-experience pair — text + icon, never emoji (house style) */}
        <button
          type="button"
          onClick={() => toggleShared("proud")}
          aria-pressed={amProud}
          aria-label={`Proud of you (${proud})`}
          className={
            "inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors hover:bg-canvas " +
            (amProud ? "text-indigo-brand" : "text-ink-600")
          }
        >
          <ThumbsUp size={16} />
          Proud
        </button>
        <button
          type="button"
          onClick={() => toggleShared("same")}
          aria-pressed={amSame}
          aria-label={`Same here (${same})`}
          className={
            "inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors hover:bg-canvas " +
            (amSame ? "text-blue-primary" : "text-ink-600")
          }
        >
          <Users size={16} />
          Same here
        </button>
        <button
          type="button"
          onClick={openComposer}
          aria-label={`Comment (${commentCount})`}
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold text-ink-600 transition-colors hover:bg-canvas"
        >
          <MessageCircle size={16} />
          Comment
        </button>
      </div>
      {nudge && (
        <div className="mt-1.5 text-[12px] font-semibold text-indigo-brand">
          This one needs an account —{" "}
          <Link href="/login" className="underline">
            sign in
          </Link>{" "}
          to join in.
        </div>
      )}

      {/* comments */}
      {open && (
        <CommentThread
          post={post}
          viewer={viewer}
          onChange={onChange}
          focusKey={focusKey}
        />
      )}

      {reportOpen && (
        <ReportModal
          postId={post.id}
          authorName={post.authorName}
          onClose={() => setReportOpen(false)}
        />
      )}
    </article>
  );
}
