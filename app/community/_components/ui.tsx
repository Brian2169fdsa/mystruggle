// Shared building blocks for the desktop /community surface.
// Website surface: indigo ◆ for milestones (gold is app-gamification only).

import type { Circle, CircleKind, Post, PostKind, Topic } from "@/app/lib/types";

/** A feed post as decorated by GET /api/posts. */
export type FeedPost = Post & {
  authorSlug: string | null;
  circleId?: string; // present on posts that live inside a circle
  request: {
    id: string;
    label: string;
    weeklyTarget: number;
    raised: number;
    status: "active" | "funded";
  } | null;
};

/** A circle as decorated by GET /api/circles. */
export type CircleSummary = Circle & {
  members: number;
  joined: boolean;
  locked: boolean; // alumni circle of another center - feed is private
};

export const CIRCLE_KIND_LABELS: Record<CircleKind, string> = {
  topic: "Topic circle",
  cohort: "Cohort",
  alumni: "Alumni circle",
};

/** Fired after a join/leave so the rail's circle list stays in sync. */
export const CIRCLES_CHANGED_EVENT = "ms:circles-changed";

export const TOPIC_LABELS: Record<Topic, string> = {
  general: "General",
  jobs: "Jobs",
  housing: "Housing",
  recovery: "Recovery",
  gratitude: "Gratitude",
};

/** "Just now" → "5m" → "2h" → "2d" → "Jul 4". */
export function timeAgo(ts: number): string {
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

/** Initial tile on the author's color. */
export function AvatarTile({
  name,
  color,
  size = 46,
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

export function MentorChip() {
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-indigo-brand px-2 text-[10px] font-extrabold tracking-[.04em] text-white">
      MENTOR
    </span>
  );
}

/** Small sky-tint topic chip shown on each post. */
export function TopicTag({ topic }: { topic: Topic }) {
  return (
    <span className="inline-flex h-5 items-center rounded-full bg-sky-tint px-2 text-[10px] font-extrabold tracking-[.03em] text-blue-primary">
      {TOPIC_LABELS[topic].toUpperCase()}
    </span>
  );
}

/** Kind accent chip - indigo ◆ milestone on the website (never gold here). */
export function KindChip({ kind }: { kind: PostKind }) {
  if (kind === "milestone")
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-indigo-brand/10 px-2 text-[10px] font-extrabold text-indigo-brand">
        ◆ MILESTONE
      </span>
    );
  if (kind === "win")
    return (
      <span className="inline-flex h-5 items-center rounded-full bg-sky-tint px-2 text-[10px] font-extrabold text-blue-primary">
        WIN
      </span>
    );
  return null;
}
