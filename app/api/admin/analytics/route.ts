import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type {
  BarcSelfCheck,
  CircleMembership,
  RecoveryGoal,
  User,
} from "@/app/lib/types";

/** Center-level engagement + recovery-capital analytics for the dashboard
 *  Reports section (docs/13 Part F: recovery-capital rollups become an
 *  outcome signal on the dashboard). Staff-only. Read-only.
 *
 *  Recovery capital is ACTIVITY-DERIVED and strengths-based (0–100 per
 *  domain), never clinical:
 *    personal  - streaks, course progress, active goals, BARC self-checks
 *    social    - community posts/comments, circle memberships
 *    community - goals achieved, funded support requests, mentor sessions
 */

const DAY = 86_400_000;

/** Expansion arrays are seeded by a separate rollout - access defensively. */
type ExpandedDB = ReturnType<typeof db> & {
  recoveryGoals?: RecoveryGoal[];
  barcChecks?: BarcSelfCheck[];
  circleMemberships?: CircleMembership[];
};

type Capital = { personal: number; social: number; community: number };

/** Per-member activity counts pre-bucketed once so the calc stays O(n). */
type MemberActivity = {
  posts: number;
  comments: number;
  heartsGiven: number;
  circles: number;
  sessions: number;
  barcChecks: number;
  goalsActive: number;
  goalsAchieved: number;
  funded: number;
  donationsReceived: number;
  avgCoursePct: number;
};

/** Recovery-capital snapshot for one member - every input is a real recorded
 *  activity (docs/13 Part F):
 *    personal  - streak, course progress, active goals, BARC self-checks
 *    social    - posts, comments, cheers given, circles joined
 *    community - goals achieved, funded requests, mentor sessions, gifts
 *                received through the member's giving page
 *  NOTE: duplicated from the member-facing calc in /api/profile (profile
 *  rings) - keep the two in sync until the store grows a shared helper. */
function capital(m: User, a: MemberActivity): Capital {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  return {
    personal: clamp(
      (m.streak ?? 0) * 3 +
        a.avgCoursePct * 0.5 +
        a.goalsActive * 10 +
        a.barcChecks * 8
    ),
    social: clamp(
      a.posts * 10 + a.comments * 6 + a.heartsGiven * 4 + a.circles * 12
    ),
    community: clamp(
      a.goalsAchieved * 20 +
        a.funded * 25 +
        a.sessions * 8 +
        a.donationsReceived * 1.5
    ),
  };
}

export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }

  const d = db() as ExpandedDB;
  const goals = (d.recoveryGoals ??= []);
  const barcs = (d.barcChecks ??= []);
  const circleMemberships = (d.circleMemberships ??= []);

  const members = d.users.filter((u) => u.role === "member");

  // REPORTING ANCHOR - same pattern as /api/admin/reports: seed data hangs
  // off a fixed epoch, so anchor windows to the latest recorded activity.
  const latestActivity = Math.max(
    0,
    ...d.sessions.map((s) => s.createdAt),
    ...d.posts.map((p) => p.createdAt),
    ...goals.map((g) => g.achievedAt ?? g.createdAt)
  );
  const now = Math.min(Date.now(), latestActivity || Date.now());
  const cutoff30 = now - 30 * DAY;

  // ── pre-bucket everything by member id (500 members × big arrays) ─────
  const activity = new Map<string, MemberActivity>();
  const act = (id: string): MemberActivity => {
    let a = activity.get(id);
    if (!a) {
      a = {
        posts: 0,
        comments: 0,
        heartsGiven: 0,
        circles: 0,
        sessions: 0,
        barcChecks: 0,
        goalsActive: 0,
        goalsAchieved: 0,
        funded: 0,
        donationsReceived: 0,
        avgCoursePct: 0,
      };
      activity.set(id, a);
    }
    return a;
  };
  // 30-day engagement counters (posts + comments + sessions), kept separate
  // from the all-time capital inputs.
  const recent = new Map<string, number>();
  const bump30 = (id: string) => recent.set(id, (recent.get(id) ?? 0) + 1);

  for (const p of d.posts) {
    if (p.status === "removed") continue;
    act(p.authorId).posts++;
    if (p.createdAt >= cutoff30) bump30(p.authorId);
    for (const c of p.comments) {
      act(c.authorId).comments++;
      if (c.createdAt >= cutoff30) bump30(c.authorId);
    }
    for (const heartUserId of p.hearts) act(heartUserId).heartsGiven++;
  }
  for (const gift of d.donations) act(gift.memberId).donationsReceived++;
  for (const s of d.sessions) {
    act(s.memberId).sessions++;
    if (s.createdAt >= cutoff30) bump30(s.memberId);
  }
  for (const cm of circleMemberships) act(cm.memberId).circles++;
  for (const b of barcs) act(b.memberId).barcChecks++;
  for (const g of goals) {
    if (g.status === "active") act(g.memberId).goalsActive++;
    if (g.status === "achieved") act(g.memberId).goalsAchieved++;
  }
  for (const r of d.requests) {
    if (r.status === "funded") act(r.memberId).funded++;
  }
  const courseById = new Map(d.courses.map((c) => [c.id, c]));
  const coursePcts = new Map<string, number[]>();
  for (const e of d.enrollments) {
    const total = courseById.get(e.courseId)?.lessonCount ?? 0;
    if (total === 0) continue;
    const list = coursePcts.get(e.memberId) ?? [];
    list.push((e.completedLessons.length / total) * 100);
    coursePcts.set(e.memberId, list);
  }
  for (const [id, pcts] of coursePcts) {
    act(id).avgCoursePct = pcts.reduce((s, p) => s + p, 0) / pcts.length;
  }

  // ── roll a member cohort up into one analytics row ─────────────────────
  const rollup = (cohort: User[]) => {
    const n = cohort.length;
    if (n === 0) {
      return {
        members: 0,
        avgStreak: 0,
        engagement30d: 0,
        goalsActive: 0,
        goalsAchieved: 0,
        recoveryCapitalAvgs: { personal: 0, social: 0, community: 0 },
        barcParticipation: 0,
        fundedRequests: 0,
      };
    }
    let streak = 0;
    let engaged = 0;
    let goalsActive = 0;
    let goalsAchieved = 0;
    let withBarc = 0;
    let funded = 0;
    const capSum: Capital = { personal: 0, social: 0, community: 0 };
    for (const m of cohort) {
      const a = act(m.id);
      streak += m.streak ?? 0;
      engaged += recent.get(m.id) ?? 0;
      goalsActive += a.goalsActive;
      goalsAchieved += a.goalsAchieved;
      if (a.barcChecks > 0) withBarc++;
      funded += a.funded;
      const cap = capital(m, a);
      capSum.personal += cap.personal;
      capSum.social += cap.social;
      capSum.community += cap.community;
    }
    return {
      members: n,
      avgStreak: Math.round((streak / n) * 10) / 10,
      engagement30d: Math.round((engaged / n) * 10) / 10, // per member
      goalsActive,
      goalsAchieved,
      recoveryCapitalAvgs: {
        personal: Math.round(capSum.personal / n),
        social: Math.round(capSum.social / n),
        community: Math.round(capSum.community / n),
      },
      barcParticipation: Math.round((withBarc / n) * 100), // % with ≥1 check
      fundedRequests: funded,
    };
  };

  const perCenter = d.centers.map((c) => ({
    centerId: c.id,
    name: c.name,
    ...rollup(members.filter((m) => m.centerId === c.id)),
  }));

  // ── goals achieved by month, last 12 calendar months ───────────────────
  // Anchored like givingByMonth in /api/admin/reports (latest month partial).
  const nowDt = new Date(now);
  const goalsByMonth: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(nowDt.getFullYear(), nowDt.getMonth() - i, 1);
    const end = new Date(nowDt.getFullYear(), nowDt.getMonth() - i + 1, 1);
    goalsByMonth.push({
      month: start.toLocaleString("en-US", { month: "short" }),
      count: goals.filter(
        (g) =>
          g.achievedAt !== undefined &&
          g.achievedAt >= start.getTime() &&
          g.achievedAt < end.getTime()
      ).length,
    });
  }

  return NextResponse.json({
    perCenter,
    platform: { ...rollup(members), goalsByMonth },
  });
}
