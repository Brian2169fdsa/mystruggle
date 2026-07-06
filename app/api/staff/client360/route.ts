// /api/staff/client360 - the Client 360 read model (docs/16 Part B): ONE
// staff-only GET that assembles a member's whole-person view - engagement,
// learning, community, goals and reentry, giving, care and support - from the
// store, so the dashboard's participant detail renders it in a single fetch.
//
// GET ?memberId=…  staff-only, same gate pattern as /api/staff/participant:
//   401 signed-out · 403 non-staff · 400 missing memberId · 404 unknown member.
//
// NEGATIVE GUARANTEES (privacy is P0 - each is verifiable by reading the
// projections below; none of the named stores is ever touched here):
//   • NO journal entries - no journal store is read anywhere in this file.
//   • NO chat messages and NO mentor DMs - `threads` and `careMessages` are
//     never read; nothing message-shaped appears in the payload.
//   • NO BARC raw scores and NO BARC totals - BARC stays behind the
//     ConsentGrant gate on /api/staff/participant; this payload has no BARC
//     field at all.
//   • Community shows ONLY feed-visible posts: status === "approved" AND not
//     hidden. Pending, flagged, removed, moderation-hidden (crisis-held) posts
//     never appear - the same visibility a member's peers already have.
//   • Résumé CONTENT is not included - only a resumeExists boolean. The full
//     résumé remains behind the ConsentGrant gate on /api/staff/participant.
//
// Concurrency note: careTeamAssignments / staffEngagements / programs /
// programEnrollments / programSessions / sessionAttendance are being added to
// the store by a concurrent pass - they are typed locally and read with `??=`
// defaults so both orders of arrival work (same pattern as outcomes/compute).

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { db } from "@/app/lib/store";
import { SCORE_K } from "@/app/api/outcomes/compute";

const DAY = 86_400_000;

/* ── concurrent-module rows (typed locally, read defensively) ──────────── */

/** A logged staff touch (docs/16 Part C). Engagement comms only - never
 *  PHI/clinical notes; the write path enforces that boundary. */
interface StaffEngagement {
  id: string;
  memberId: string;
  staffId: string;
  kind: "kudos" | "nudge" | "checkin" | "session_note" | "call" | "hallway";
  body?: string;
  mood?: number;
  occurredAt: number;
}

interface CareTeamAssignment {
  id: string;
  memberId: string;
  staffId: string;
  role: string;
  isPrimary: boolean;
  assignedAt: number;
  endedAt?: number;
}

interface OpsProgram {
  id: string;
  title?: string;
  status?: string;
}

interface OpsProgramEnrollment {
  id?: string;
  programId?: string;
  memberId?: string;
  participantId?: string; // schema drift guard - docs/16 uses participant_id
  status?: string; // active | completed | withdrawn
  progressPct?: number;
}

interface OpsProgramSession {
  id: string;
  programId?: string;
  startsAt?: number;
}

interface OpsSessionAttendance {
  sessionId?: string;
  memberId?: string;
  participantId?: string;
  status?: string; // present | remote | excused | absent
}

type OpsStore = ReturnType<typeof db> & {
  careTeamAssignments?: CareTeamAssignment[];
  staffEngagements?: StaffEngagement[];
  programs?: OpsProgram[];
  programEnrollments?: OpsProgramEnrollment[];
  programSessions?: OpsProgramSession[];
  sessionAttendance?: OpsSessionAttendance[];
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export async function GET(req: Request) {
  // 401 signed-out vs 403 non-staff - the /api/staff/participant pattern.
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  if (me.role !== "staff") {
    return NextResponse.json(
      { error: "This view is for center staff." },
      { status: 403 }
    );
  }

  const memberId = new URL(req.url).searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json(
      { error: "memberId is required." },
      { status: 400 }
    );
  }

  const d = db() as OpsStore;
  // Defensive init - these arrays land with a concurrent pass.
  const careTeamAssignments = (d.careTeamAssignments ??= []);
  const staffEngagements = (d.staffEngagements ??= []);
  const programs = (d.programs ??= []);
  const programEnrollments = (d.programEnrollments ??= []);
  const programSessions = (d.programSessions ??= []);
  const sessionAttendance = (d.sessionAttendance ??= []);

  const member = d.users.find((u) => u.id === memberId && u.role === "member");
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  /* ── header: phase + score + trend + risk ────────────────────────────── */

  // Reporting anchor - seed data hangs off a fixed epoch, so window from the
  // latest recorded event, not the wall clock (same as outcomes/compute).
  const latest = d.continuumEvents.reduce(
    (mx, e) => (e.occurredAt > mx ? e.occurredAt : mx),
    0
  );
  const refNow = latest > 0 ? latest : Date.now();

  const events = d.continuumEvents
    .filter((e) => e.memberId === memberId)
    .sort((a, b) => a.occurredAt - b.occurredAt);

  // Score: same saturating normalizer as the continuum ribbon and the
  // outcomes data product (imported SCORE_K, trailing 90 days), so the header
  // number means the same thing everywhere. Trend compares the raw weighted
  // sum of the last 30 days against the prior 30 days.
  const w30 = refNow - 30 * DAY;
  const w60 = refNow - 60 * DAY;
  const w90 = refNow - 90 * DAY;
  let raw90 = 0;
  let cur30 = 0;
  let prev30 = 0;
  for (const e of events) {
    if (e.occurredAt > refNow) continue;
    if (e.occurredAt >= w90) raw90 += e.weight;
    if (e.occurredAt >= w30) cur30 += e.weight;
    else if (e.occurredAt >= w60) prev30 += e.weight;
  }
  const continuumScore = Math.round((100 * raw90) / (raw90 + SCORE_K));
  const trend: "rising" | "steady" | "dipping" =
    cur30 === 0 && prev30 === 0
      ? "steady"
      : prev30 === 0
      ? "rising"
      : cur30 >= prev30 * 1.15
      ? "rising"
      : cur30 <= prev30 * 0.85
      ? "dipping"
      : "steady";
  // Risk is a nudge to look, not a verdict - "ok" | "watch" only (the UI
  // renders watch in amber, never red).
  const risk: "ok" | "watch" =
    trend === "dipping" || continuumScore < 25 ? "watch" : "ok";

  // Latest care episode → phase + level-of-care chips.
  const episode = d.careEpisodes
    .filter((ep) => ep.memberId === memberId)
    .reduce<(typeof d.careEpisodes)[number] | null>(
      (best, ep) => (!best || ep.startedAt > best.startedAt ? ep : best),
      null
    );

  const header = {
    name: member.name,
    memberNumber: member.memberNumber ?? "",
    avatarColor: member.avatarColor,
    phase: episode?.carePhase ?? null,
    loc: episode?.levelOfCare ?? null,
    continuumScore,
    trend,
    risk,
  };

  /* ── engagement: by-source counts, 28-day daily strip, streak ─────────── */

  const bySource: Record<string, number> = {};
  for (const e of events) {
    if (e.occurredAt >= w30 && e.occurredAt <= refNow) {
      bySource[e.source] = (bySource[e.source] ?? 0) + 1;
    }
  }
  const daily: { day: string; count: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const end = refNow - i * DAY;
    const start = end - DAY;
    daily.push({
      day: new Date(end).toISOString().slice(0, 10),
      count: events.filter((e) => e.occurredAt > start && e.occurredAt <= end)
        .length,
    });
  }
  const engagement = { bySource, daily, streak: member.streak ?? 0 };

  /* ── learning: programs, session attendance, courses ─────────────────── */

  const isMine = (row: { memberId?: string; participantId?: string }) =>
    (row.memberId ?? row.participantId) === memberId;

  // Sessions this member attended (present/remote/excused count as showing up).
  const attendedSessionIds = new Set(
    sessionAttendance
      .filter(
        (a) =>
          isMine(a) &&
          (a.status === "present" ||
            a.status === "remote" ||
            a.status === "excused")
      )
      .map((a) => a.sessionId)
  );

  const learningPrograms = programEnrollments.filter(isMine).map((enr) => {
    const p = programs.find((pp) => pp.id === enr.programId);
    const status = enr.status ?? "active";
    let progressPct: number;
    if (typeof enr.progressPct === "number") {
      progressPct = clampPct(enr.progressPct);
    } else if (status === "completed") {
      progressPct = 100;
    } else {
      // Approximate from attendance: sessions held so far vs attended.
      const past = programSessions.filter(
        (s) => s.programId === enr.programId && (s.startsAt ?? 0) <= refNow
      );
      const attended = past.filter((s) => attendedSessionIds.has(s.id)).length;
      progressPct = past.length ? clampPct((100 * attended) / past.length) : 0;
    }
    return { title: p?.title ?? "Program", status, progressPct };
  });

  const attendance = { present: 0, absent: 0, excused: 0, remote: 0 };
  for (const a of sessionAttendance) {
    if (!isMine(a)) continue;
    if (a.status === "present") attendance.present++;
    else if (a.status === "absent") attendance.absent++;
    else if (a.status === "excused") attendance.excused++;
    else if (a.status === "remote") attendance.remote++;
  }

  const courses = d.enrollments
    .filter((en) => en.memberId === memberId)
    .flatMap((en) => {
      const c = d.courses.find((cc) => cc.id === en.courseId);
      if (!c) return [];
      return [
        {
          title: c.title,
          pct: c.lessonCount
            ? clampPct((100 * en.completedLessons.length) / c.lessonCount)
            : 0,
        },
      ];
    });

  const learning = { programs: learningPrograms, attendance, courses };

  /* ── community: FEED-VISIBLE ONLY ─────────────────────────────────────── */
  // The one and only post filter: status "approved" AND not hidden - exactly
  // what the community feed shows peers. Pending / flagged / removed /
  // moderation-hidden (crisis-held) posts are structurally excluded, and no
  // journal, chat, or DM store is read here (see negative guarantees, top).

  const visiblePosts = d.posts.filter(
    (p) =>
      p.authorId === memberId && p.status === "approved" && p.hidden !== true
  );
  const community = {
    postCount: visiblePosts.length,
    circleCount: d.circleMemberships.filter((m) => m.memberId === memberId)
      .length,
    recentPublicPosts: [...visiblePosts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        excerpt:
          p.body.length > 140 ? p.body.slice(0, 140).trimEnd() + "…" : p.body,
        createdAt: p.createdAt,
      })),
  };

  /* ── goals & reentry ──────────────────────────────────────────────────── */
  // resumeExists is a boolean ONLY - résumé content stays consent-gated on
  // /api/staff/participant.

  const goals = d.recoveryGoals
    .filter((g) => g.memberId === memberId && g.status !== "archived")
    .map((g) => {
      const ms = d.goalMilestones.filter((m) => m.goalId === g.id);
      return {
        title: g.title,
        domain: g.domain,
        milestonesDone: ms.filter((m) => m.done).length,
        milestonesTotal: ms.length,
      };
    });
  const goalsReentry = {
    goals,
    jobApps: d.jobApplications.filter((j) => j.memberId === memberId).length,
    resumeExists: d.resumes.some((r) => r.memberId === memberId),
  };

  /* ── giving ───────────────────────────────────────────────────────────── */

  const bal = member.balances ?? { cash: 0, credits: 0, savings: 0 };
  const activeRequests = d.requests.filter(
    (r) => r.memberId === memberId && r.status === "active"
  );
  const raised = activeRequests.reduce((s, r) => s + r.raised, 0);
  const target = activeRequests.reduce((s, r) => s + r.weeklyTarget, 0);
  const giving = {
    cash: bal.cash,
    credits: bal.credits, // rendered as "Reentry Fund" on the dashboard
    weeklyProgress: {
      raised,
      target,
      pct: target > 0 ? clampPct((100 * raised) / target) : 0,
    },
  };

  /* ── care & support ───────────────────────────────────────────────────── */

  const staffName = (id: string) =>
    d.users.find((u) => u.id === id)?.name ?? "Staff";

  const care = {
    team: careTeamAssignments
      .filter((a) => a.memberId === memberId && a.endedAt == null)
      .map((a) => ({
        staffName: staffName(a.staffId),
        role: a.role,
        isPrimary: a.isPrimary === true,
      })),
    engagements: [...staffEngagements]
      .filter((e) => e.memberId === memberId)
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, 15)
      .map((e) => ({
        kind: e.kind,
        body: e.body,
        mood: e.mood,
        occurredAt: e.occurredAt,
        staffName: staffName(e.staffId),
      })),
    sessionsCount: d.sessions.filter((s) => s.memberId === memberId).length,
    followUps: [...d.followUps]
      .filter((f) => f.memberId === memberId)
      .sort((a, b) => a.dueDay - b.dueDay)
      .map((f) => ({ dueDay: f.dueDay, status: f.status })),
  };

  return NextResponse.json({
    header,
    engagement,
    learning,
    community,
    goalsReentry,
    giving,
    care,
  });
}
