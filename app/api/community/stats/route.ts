import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";

const WEEK = 7 * 86400e3;
const MONTH = 30 * 86400e3;

/** Public community stats - aggregate counts only, no PII. */
export async function GET() {
  const d = db();
  // Anchor windows to the latest recorded activity (capped at the clock) -
  // the deterministic seed's EPOCH sits behind real time, and live activity
  // naturally moves the anchor forward. Same approach as /api/admin/reports.
  const latest = Math.max(
    0,
    ...d.posts.map((p) => p.createdAt),
    ...d.donations.map((x) => x.createdAt)
  );
  const now = Math.min(Date.now(), latest) || Date.now();
  return NextResponse.json({
    members: d.users.filter((u) => u.role === "member").length,
    postsThisWeek: d.posts.filter(
      (p) => p.status === "approved" && now - p.createdAt < WEEK
    ).length,
    activeRequests: d.requests.filter((r) => r.status === "active").length,
    fundedRequests: d.requests.filter((r) => r.status === "funded").length,
    givenThisMonth: d.donations
      .filter((x) => now - x.createdAt < MONTH)
      .reduce((s, x) => s + x.amount, 0),
  });
}
