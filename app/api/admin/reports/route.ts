import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";

/** Center-dashboard Reports data computed from live store data. Read-only.
 *  Demo-open like the other admin routes (no staff role in the data model
 *  yet); lock behind staff auth before production.
 *
 *  RETENTION PROXY — there is no real activity/attendance log yet, so
 *  "retained at N months" is a documented stand-in:
 *    - A member counts as "still active" when streak > 0 OR points > 200
 *      (an idle account has neither a live check-in streak nor meaningful
 *      accumulated points).
 *    - A member is only *eligible* for the N-month horizon once they have
 *      been enrolled at least N months (now - createdAt >= N months).
 *    - Cohort pct = active eligible members / eligible members. If nobody
 *      in a cohort has reached a horizon yet, that horizon is null and the
 *      UI renders it as "—".
 *  Replace with real session/check-in history once an activity log exists.
 */

const DAY = 86_400_000;
const MONTH = 30.44 * DAY; // average month, good enough for a proxy horizon

type Horizon = { pct: number | null; eligible: number };

function isActive(m: { streak?: number; points?: number }): boolean {
  return (m.streak ?? 0) > 0 || (m.points ?? 0) > 200;
}

export async function GET() {
  const d = db();
  const members = d.users.filter((u) => u.role === "member");

  // REPORTING ANCHOR — seeded demo data can be anchored earlier than the
  // wall clock (it was generated relative to its own "now"). Anchor the
  // 12-month giving window and the retention horizons to the latest
  // recorded activity so the report stays meaningful across reseeds; with
  // fresh data this is effectively Date.now().
  const latestActivity = Math.max(
    0,
    ...d.donations.map((x) => x.createdAt),
    ...members.map((m) => m.createdAt)
  );
  const now = Math.min(Date.now(), latestActivity || Date.now());

  // ── retention cohorts by signup quarter ──────────────────────────────
  const byQuarter = new Map<string, typeof members>();
  for (const m of members) {
    const dt = new Date(m.createdAt);
    const key = `${dt.getFullYear()}-Q${Math.floor(dt.getMonth() / 3) + 1}`;
    const list = byQuarter.get(key) ?? [];
    list.push(m);
    byQuarter.set(key, list);
  }

  const horizon = (cohort: typeof members, months: number): Horizon => {
    const eligible = cohort.filter((m) => now - m.createdAt >= months * MONTH);
    if (eligible.length === 0) return { pct: null, eligible: 0 };
    const retained = eligible.filter(isActive).length;
    return {
      pct: Math.round((retained / eligible.length) * 100),
      eligible: eligible.length,
    };
  };

  const retention = [...byQuarter.entries()]
    .sort(([a], [b]) => a.localeCompare(b)) // chronological: 2025-Q3 … 2026-Q3
    .map(([key, cohort]) => {
      const [year, q] = key.split("-");
      return {
        label: `${q} ${year}`, // "Q3 2025"
        size: cohort.length,
        m3: horizon(cohort, 3),
        m6: horizon(cohort, 6),
        m12: horizon(cohort, 12),
      };
    });

  // ── giving by month, last 12 calendar months (current month partial) ──
  const nowDt = new Date(now);
  const givingByMonth: { month: string; total: number; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(nowDt.getFullYear(), nowDt.getMonth() - i, 1);
    const end = new Date(nowDt.getFullYear(), nowDt.getMonth() - i + 1, 1);
    const inMonth = d.donations.filter(
      (x) => x.createdAt >= start.getTime() && x.createdAt < end.getTime()
    );
    givingByMonth.push({
      month: start.toLocaleString("en-US", { month: "short" }), // "Aug"
      total: inMonth.reduce((s, x) => s + x.amount, 0),
      count: inMonth.length,
    });
  }

  // ── summary ───────────────────────────────────────────────────────────
  // stageAdvances: no stage-transition log yet, so members at 640+ points
  // (Silver threshold and above) proxy for "advanced a stage this year".
  // reachedIndependent: Gold level is the top of the journey ladder here.
  const summary = {
    stageAdvances: members.filter((m) => (m.points ?? 0) >= 640).length,
    reachedIndependent: members.filter((m) => m.level === "Gold").length,
    savingsHeld: members.reduce((s, m) => s + (m.balances?.savings ?? 0), 0),
  };

  return NextResponse.json({
    members: members.length,
    retention,
    givingByMonth,
    summary,
  });
}
