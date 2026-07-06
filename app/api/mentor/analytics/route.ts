import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type {
  BarcSelfCheck,
  RecoveryGoal,
  Session,
} from "@/app/lib/types";

/** Mentor analytics - per-mentee journey signals + a roster rollup for the
 *  mentor app's "My mentoring" tab. Read-only.
 *
 *  SCOPE: a mentor sees ONLY their own mentees (users whose mentorId is the
 *  signed-in mentor). Staff may pass ?mentorId= to view any mentor's roster
 *  (staff supervise all surfaces); a mentor's own id always wins otherwise -
 *  the query param is ignored for non-staff so no mentor can ever read
 *  another mentor's mentees.
 *
 *  PRIVACY (docs/13): BARC self-check totals/trends are visible to assigned
 *  support only - the assigned mentor and staff. Because this route is
 *  scoped to the mentor's own mentees, including the BARC trend here honors
 *  that rule. Only the total and direction are shared, never the 10 domain
 *  scores; trend is shown with warm arrows, never red on a person.
 */

const DAY = 86_400_000;

/** Expansion arrays are seeded by a separate rollout - access defensively. */
type ExpandedDB = ReturnType<typeof db> & {
  recoveryGoals?: RecoveryGoal[];
  barcChecks?: BarcSelfCheck[];
};

export type BarcTrend = "up" | "flat" | "down";

export async function GET(req: Request) {
  const me = await getRoleUser("mentor");
  if (!me) {
    return NextResponse.json(
      { error: "Mentor sign-in required." },
      { status: 401 }
    );
  }

  const requested = new URL(req.url).searchParams.get("mentorId");
  const mentorId = me.role === "staff" && requested ? requested : me.id;

  const d = db() as ExpandedDB;
  const goals = (d.recoveryGoals ??= []);
  const barcs = (d.barcChecks ??= []);

  // Own mentees only - the strict scoping line for this whole route.
  const mentees = d.users.filter(
    (u) => u.role === "member" && u.mentorId === mentorId
  );
  const menteeIds = new Set(mentees.map((m) => m.id));

  // REPORTING ANCHOR - same pattern as /api/admin/reports: seeded demo data
  // hangs off its own fixed epoch, so anchor "now" to the latest recorded
  // activity (fresh data makes this effectively Date.now()).
  const latestActivity = Math.max(
    0,
    ...d.sessions.map((s) => s.createdAt),
    ...d.posts.map((p) => p.createdAt),
    ...goals.map((g) => g.achievedAt ?? g.createdAt)
  );
  const now = Math.min(Date.now(), latestActivity || Date.now());
  // Rolling windows (not calendar-boundary) so the numbers stay meaningful
  // regardless of where in a month/quarter the anchor lands.
  const quarterStart = now - 90 * DAY;
  const monthStart = now - 30 * DAY;

  // Pre-bucket the big arrays once (500 members / 340 sessions scale).
  const sessionsByMember = new Map<string, Session[]>();
  for (const s of d.sessions) {
    if (!menteeIds.has(s.memberId)) continue;
    const list = sessionsByMember.get(s.memberId) ?? [];
    list.push(s);
    sessionsByMember.set(s.memberId, list);
  }
  const courseById = new Map(d.courses.map((c) => [c.id, c]));

  const perMentee = mentees.map((m) => {
    const sessions = (sessionsByMember.get(m.id) ?? []).sort(
      (a, b) => b.createdAt - a.createdAt
    );
    const lastSession = sessions[0]?.createdAt ?? null;
    const sessionsThisQuarter = sessions.filter(
      (s) => s.createdAt >= quarterStart
    ).length;

    // Course progress - avg % complete across the mentee's enrollments.
    const enrollments = d.enrollments.filter((e) => e.memberId === m.id);
    const pcts = enrollments.map((e) => {
      const total = courseById.get(e.courseId)?.lessonCount ?? 0;
      return total > 0 ? (e.completedLessons.length / total) * 100 : 0;
    });
    const courseProgress = pcts.length
      ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length)
      : null;

    const myGoals = goals.filter((g) => g.memberId === m.id);
    const goalsActive = myGoals.filter((g) => g.status === "active").length;
    const goalsAchieved = myGoals.filter(
      (g) => g.status === "achieved"
    ).length;

    // BARC trend from the last two self-checks. ±1 point on a 0–50 scale is
    // noise, not a signal - treat it as flat.
    const checks = barcs
      .filter((b) => b.memberId === m.id)
      .sort((a, b) => a.takenAt - b.takenAt);
    const lastBarcTotal = checks.length
      ? checks[checks.length - 1].total
      : null;
    let barcTrend: BarcTrend | null = null;
    if (checks.length === 1) barcTrend = "flat";
    else if (checks.length >= 2) {
      const diff =
        checks[checks.length - 1].total - checks[checks.length - 2].total;
      barcTrend = diff > 1 ? "up" : diff < -1 ? "down" : "flat";
    }

    const openConcern = d.concerns.some(
      (c) => c.memberId === m.id && c.status === "open"
    );
    const communityPosts30d = d.posts.filter(
      (p) =>
        p.authorId === m.id &&
        p.status !== "removed" &&
        now - p.createdAt <= 30 * DAY
    ).length;

    // "Needs attention" - a quiet amber signal, never an alarm: paused
    // streak, a stale next action (sessions were happening but stopped -
    // none in 30 days), a dipping BARC trend, or an open concern. A mentee
    // with no logged sessions yet isn't flagged on that basis alone: absent
    // data is not a concern signal.
    const staleNextAction =
      lastSession !== null && now - lastSession > 30 * DAY;
    const needsAttention =
      (m.streak ?? 0) === 0 ||
      staleNextAction ||
      barcTrend === "down" ||
      openConcern;

    return {
      id: m.id,
      name: m.name,
      avatarColor: m.avatarColor,
      memberNumber: m.memberNumber ?? null,
      streak: m.streak ?? 0,
      points: m.points ?? 0,
      level: m.level ?? "Bronze",
      lastSession,
      sessionsThisQuarter,
      courseProgress,
      goalsActive,
      goalsAchieved,
      lastBarcTotal,
      barcTrend,
      openConcern,
      communityPosts30d,
      needsAttention,
    };
  });

  // Attention first, then most-recent session, so the roster reads like a
  // triage list without ever looking like one.
  perMentee.sort((a, b) => {
    if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
    return (b.lastSession ?? 0) - (a.lastSession ?? 0);
  });

  const sessionsThisMonth = d.sessions.filter(
    (s) => s.mentorId === mentorId && s.createdAt >= monthStart
  ).length;

  const rollup = {
    mentees: perMentee.length,
    avgStreak: perMentee.length
      ? Math.round(
          (perMentee.reduce((s, m) => s + m.streak, 0) / perMentee.length) * 10
        ) / 10
      : 0,
    sessionsThisMonth,
    goalsAchievedTotal: perMentee.reduce((s, m) => s + m.goalsAchieved, 0),
    menteesNeedingAttention: perMentee.filter((m) => m.needsAttention).length,
  };

  return NextResponse.json({ mentees: perMentee, rollup });
}
