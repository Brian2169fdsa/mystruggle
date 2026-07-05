"use client";

import type { Post, PostStatus } from "../../lib/types";
import { CARD, SKELETON, relTime } from "./types";
import type { ModerateAction } from "./types";

const VERDICTS: Record<
  Exclude<PostStatus, "pending">,
  { label: string; bg: string; color: string }
> = {
  approved: { label: "✓ APPROVED", bg: "#E8F8F0", color: "#12B76A" },
  flagged: {
    label: "⚑ FLAGGED — EDIT REQUESTED",
    bg: "#FFF9EC",
    color: "#A16207",
  },
  removed: { label: "REMOVED", bg: "#F1F5F9", color: "#4B5563" },
};

/** Synthesized AI-review panel per live status (no AI service yet). */
const AI_REVIEW: Record<PostStatus, { text: string; bg: string; color: string }> = {
  approved: {
    text: "Auto-approved · community-positive. No policy concerns detected.",
    bg: "#EAF2FC",
    color: "#2E7CD6",
  },
  pending: {
    text: "Needs review — held from the community feed until a staff decision.",
    bg: "#FFF9EC",
    color: "#A16207",
  },
  flagged: {
    text: "Needs review — flagged for staff attention; author asked to edit.",
    bg: "#FFF9EC",
    color: "#A16207",
  },
  removed: {
    text: "Removed from the community feed. Restoring requires a staff override.",
    bg: "#FDF0F0",
    color: "#E5484D",
  },
};

const KIND_LABEL: Record<Post["kind"], string> = {
  regular: "update",
  milestone: "milestone",
  win: "win",
};

// Queue order: needs-review first, then newest first.
const RANK: Record<PostStatus, number> = {
  pending: 0,
  flagged: 1,
  approved: 2,
  removed: 3,
};

export default function Moderation({
  posts,
  pendingCount,
  onModerate,
  goParticipants,
}: {
  posts: Post[] | null;
  pendingCount: number;
  onModerate: (postId: string, action: ModerateAction) => void;
  goParticipants: () => void;
}) {
  const queue = (posts ?? [])
    .slice()
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Moderation queue{" "}
          <span className="text-[15px] font-semibold text-ink-600">
            · {pendingCount} pending
          </span>
        </div>
        <div className="flex gap-2.5">
          <span className="inline-flex h-[38px] items-center rounded-full bg-blue-primary px-[18px] text-[13px] font-bold text-white">
            All posts
          </span>
          <button
            type="button"
            className="inline-flex h-[38px] cursor-pointer items-center rounded-full border-[1.5px] border-sky-tint bg-white px-[18px] text-[13px] font-semibold text-ink-600"
          >
            Resolved
          </button>
        </div>
      </div>

      {/* CRISIS — pinned DESIGN PREVIEW; no crisis data exists yet.
          Crisis red lives only here. */}
      <div className="rounded-2xl border-[1.5px] border-[#F5C6C8] bg-white px-[30px] py-6 shadow-[0_2px_10px_rgba(229,72,77,.12)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-[26px] items-center rounded-full bg-heart-red px-3 text-[11px] font-extrabold text-white">
            CRISIS — HELD
          </span>
          <span className="inline-flex h-[26px] items-center rounded-full border-[1.5px] border-[#E2E8F0] bg-canvas px-3 text-[11px] font-extrabold tracking-[.04em] text-ink-600">
            DEMO — crisis handling preview
          </span>
          <span className="text-[13px] font-semibold text-ink-600">
            Anonymous to feed · staff + admin alerted 12 min ago
          </span>
        </div>
        <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] font-medium text-ink-900">
          &quot;I don&apos;t see the point anymore. tired of trying&quot;
        </div>
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl bg-heart-bg px-4 py-3">
          <span className="mt-0.5 flex-none text-[11px] font-extrabold text-heart-red">
            AI REVIEW
          </span>
          <span className="text-[13px]/[1.6] font-medium text-ink-900">
            Self-harm signal detected. Post held from feed; author shown
            supportive resources. Recommend: personal follow-up today — do not
            resolve without human contact.
          </span>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={goParticipants}
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-heart-red px-6 text-[13px] font-bold text-white"
          >
            Open member · follow up
          </button>
          <button
            type="button"
            className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-[#E2E8F0] px-6 text-[13px] font-bold text-ink-600"
          >
            Assign to Sarah
          </button>
        </div>
      </div>

      {!posts &&
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={SKELETON + " h-[150px]"} />
        ))}

      {posts && queue.length === 0 && (
        <div className={CARD + " px-[30px] py-8 text-center text-[13px] font-semibold text-ink-400"}>
          No community posts yet.
        </div>
      )}

      {queue.map((p) => {
        const pending = p.status === "pending";
        const flagged = p.status === "flagged";
        const verdict = p.status === "pending" ? null : VERDICTS[p.status];
        const ai = AI_REVIEW[p.status];
        return (
          <div
            key={p.id}
            className={
              CARD +
              " px-[30px] py-6" +
              (p.status === "removed" ? " opacity-50" : "")
            }
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-extrabold text-white"
                style={{ background: p.avatarColor }}
              >
                {p.authorName[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                  {p.authorName} · {KIND_LABEL[p.kind]}
                  {p.authorRole === "mentor" && (
                    <span className="inline-flex h-[20px] items-center rounded-full bg-[#F0EDFB] px-2.5 text-[10px] font-extrabold text-indigo-brand">
                      MENTOR
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-600">
                  {relTime(p.createdAt)} · community audience · ♥{" "}
                  {p.hearts.length} · {p.comments.length} comment
                  {p.comments.length === 1 ? "" : "s"}
                </div>
              </div>
              {verdict && (
                <span
                  className="inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-extrabold"
                  style={{ background: verdict.bg, color: verdict.color }}
                >
                  {verdict.label}
                </span>
              )}
            </div>
            <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] font-medium text-ink-900">
              &quot;{p.body}&quot;
            </div>
            <div
              className="mt-3.5 flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{ background: ai.bg }}
            >
              <span
                className="mt-0.5 flex-none text-[11px] font-extrabold"
                style={{ color: ai.color }}
              >
                AI REVIEW
              </span>
              <span className="text-[13px]/[1.6] font-medium text-ink-900">
                {ai.text}
              </span>
            </div>
            {(pending || flagged) && (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => onModerate(p.id, "approve")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full bg-success px-6 text-[13px] font-bold text-white"
                >
                  ✓ Approve
                </button>
                {pending && (
                  <button
                    type="button"
                    onClick={() => onModerate(p.id, "flag")}
                    className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-gold-badge px-6 text-[13px] font-bold text-amber-ink hover:bg-amber-bg"
                  >
                    ⚑ Flag · request edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onModerate(p.id, "remove")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-[#E2E8F0] px-6 text-[13px] font-bold text-ink-600"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
