import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";

/** Center-dashboard KPIs computed from live data. Demo-open (no staff role
 *  in the data model yet); lock behind staff auth before production. */
export async function GET() {
  const d = db();
  const members = d.users.filter((u) => u.role === "member");
  const donations = d.donations;

  const totalGiven = donations.reduce((s, x) => s + x.amount, 0);
  const cashHeld = members.reduce((s, m) => s + (m.balances?.cash ?? 0), 0);
  const creditsHeld = members.reduce((s, m) => s + (m.balances?.credits ?? 0), 0);
  const savingsHeld = members.reduce((s, m) => s + (m.balances?.savings ?? 0), 0);
  const avgStreak = members.length
    ? members.reduce((s, m) => s + (m.streak ?? 0), 0) / members.length
    : 0;

  return NextResponse.json({
    members: members.length,
    mentors: d.users.filter((u) => u.role === "mentor").length,
    activeRequests: d.requests.filter((r) => r.status === "active").length,
    fundedRequests: d.requests.filter((r) => r.status === "funded").length,
    donations: donations.length,
    weeklyRecurring: donations.filter((x) => x.weekly).length,
    totalGiven,
    cashHeld,
    creditsHeld,
    savingsHeld,
    avgStreak: Math.round(avgStreak * 10) / 10,
    pendingModeration: d.posts.filter(
      (p) => p.status === "pending" || p.status === "flagged"
    ).length,
  });
}
