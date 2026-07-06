import type { SupportRequest } from "../../lib/types";

export type Section =
  | "overview"
  | "participants"
  | "detail"
  | "giving"
  | "moderation"
  | "reports";

export type GivingStep = "amount" | "pin" | "done";

export type Verdict = "pending" | "approved" | "flagged" | "removed";

export type ModerateAction = "approve" | "flag" | "remove";

/** Shape of GET /api/admin/overview. */
export type OverviewData = {
  members: number;
  mentors: number;
  activeRequests: number;
  fundedRequests: number;
  donations: number;
  weeklyRecurring: number;
  totalGiven: number;
  cashHeld: number;
  creditsHeld: number;
  savingsHeld: number;
  avgStreak: number;
  pendingModeration: number;
};

/** One row of GET /api/admin/members. */
export type AdminMember = {
  id: string;
  name: string;
  slug: string;
  memberNumber: string;
  avatarColor: string;
  consentPublic: boolean;
  balances: { cash: number; credits: number; savings: number };
  streak: number;
  points: number;
  level: string;
  mentorName: string | null;
  requests: SupportRequest[];
  joinedAt: number;
};

/** White card shell used across every dashboard section. */
export const CARD = "rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]";

/** Skeleton block - soft sky-tint pulse used while live data loads. */
export const SKELETON = "animate-pulse rounded-2xl bg-sky-tint";

/** $1,240 / $123.50 - cents only when they exist. */
export function fmtMoney(n: number): string {
  const opts =
    Math.round(n * 100) % 100 === 0
      ? { maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return "$" + n.toLocaleString("en-US", opts);
}

/** "joined 3mo ago" style relative date for joinedAt. */
export function relJoined(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days < 1) return "joined today";
  if (days < 7) return `joined ${days}d ago`;
  if (days < 30) return `joined ${Math.floor(days / 7)}w ago`;
  if (days < 365) return `joined ${Math.floor(days / 30)}mo ago`;
  return `joined ${Math.floor(days / 365)}y ago`;
}

/** "40 min ago" style relative time for post timestamps. */
export function relTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
