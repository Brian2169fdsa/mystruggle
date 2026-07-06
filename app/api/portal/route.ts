// Client Portal aggregate - docs/16 Part D (member PWA "In Treatment" mode).
// One GET that powers the Home tab's My Program panel: enrollment + curriculum
// progress, today's sessions, open journey tasks, and the kudos inbox.
//
// Program/engagement collections are seeded by the store (seed v13+); a
// journeyTasks collection is not in the store contract yet, so tasks read it
// defensively and fall back to active recovery-goal milestones - the same
// checklist PlanView renders today. Staff user ids are NEVER exposed - kudos
// are attributed to "Your care team", sessions carry a facilitator first name
// only (User.name is first-name-only by convention).

import { NextResponse } from "next/server";
import { db, findUserById, centerPolicyFor } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { CareChannel, User } from "@/app/lib/types";

/* ── defensive extras (not in the DB contract yet) ───────────────────── */

type JourneyTaskRec = {
  id?: string;
  memberId?: string;
  label?: string;
  title?: string;
  done?: boolean;
  status?: string;
};

type PortalDB = ReturnType<typeof db> & { journeyTasks?: JourneyTaskRec[] };

/* ── helpers ─────────────────────────────────────────────────────────── */

/** Epoch ms from a number or ISO string; 0 when unparseable. */
function toMs(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

const DONE_TASK_STATUSES = new Set(["done", "completed", "complete"]);
const CLOSED_TASK_STATUSES = new Set(["archived", "dismissed", "cancelled"]);

type PortalTask = { id: string; label: string; done: boolean };

/** Open tasks first (stable), capped for the Home preview. */
function openFirst(tasks: PortalTask[]): PortalTask[] {
  return [...tasks]
    .sort((a, b) => Number(a.done) - Number(b.done))
    .slice(0, 6);
}

/** The member's journey tasks. Primary source: a journeyTasks collection
 *  (defensive - not in the store contract yet). Fallback: active
 *  recovery-goal milestones, the exact checklist PlanView sources today. */
function tasksFor(d: PortalDB, user: User): PortalTask[] {
  const raw = Array.isArray(d.journeyTasks) ? d.journeyTasks : [];
  const mine = raw.filter(
    (t) =>
      t &&
      t.memberId === user.id &&
      !CLOSED_TASK_STATUSES.has(String(t.status ?? "").toLowerCase())
  );
  if (mine.length > 0) {
    return openFirst(
      mine.map((t, i) => ({
        id: String(t.id ?? `jt-${i}`),
        label: String(t.label ?? t.title ?? "Journey task"),
        done:
          t.done === true ||
          DONE_TASK_STATUSES.has(String(t.status ?? "").toLowerCase()),
      }))
    );
  }
  const goalIds = new Set(
    d.recoveryGoals
      .filter((g) => g.memberId === user.id && g.status === "active")
      .map((g) => g.id)
  );
  return openFirst(
    d.goalMilestones
      .filter((m) => goalIds.has(m.goalId))
      .sort((a, b) => a.sort - b.sort)
      .map((m) => ({ id: m.id, label: m.title, done: m.done }))
  );
}

/** Latest 5 kudos for the member. Body + time only - no staff identity. */
function kudosFor(d: PortalDB, user: User) {
  return d.staffEngagements
    .filter((e) => e.kind === "kudos" && e.memberId === user.id)
    .map((e) => ({
      body: e.body || "Your care team celebrated a win with you.",
      occurredAt: toMs(e.occurredAt),
    }))
    .sort((a, b) => b.occurredAt - a.occurredAt)
    .slice(0, 5);
}

/** The program_group care channel for this program, when one exists.
 *  CareChannel has no programId in the current contract, so we accept a
 *  future `programId` field and fall back to the member's center group
 *  (the same affiliation grant care-channels/_lib.ts uses). */
function programChannelId(
  channels: CareChannel[],
  programId: string,
  user: User
): string | null {
  const groups = channels.filter((c) => c.kind === "program_group");
  const byProgram = groups.find(
    (c) => (c as CareChannel & { programId?: string }).programId === programId
  );
  if (byProgram) return byProgram.id;
  const byCenter = groups.find(
    (c) => !!user.centerId && c.centerId === user.centerId
  );
  return byCenter?.id ?? null;
}

/** Center-policy enforcement flags for the session member (docs/16).
 *  "Early phase" = the member's latest care episode is in_program at a
 *  residential or detox level of care. portalOnly gates community-facing
 *  affordances entirely (CenterPolicy.portalOnlyEarlyPhase); communityAllowed
 *  reflects CenterPolicy.communityAccessDuringResidential for the same window.
 *  Defensive: no policy row or no episode leaves both flags permissive. */
function policyFor(d: PortalDB, user: User) {
  const episodes = Array.isArray(d.careEpisodes) ? d.careEpisodes : [];
  const latest = episodes
    .filter((e) => e.memberId === user.id)
    .sort((a, b) => toMs(b.startedAt) - toMs(a.startedAt))[0];
  const earlyPhase =
    !!latest &&
    latest.carePhase === "in_program" &&
    (latest.levelOfCare === "residential" || latest.levelOfCare === "detox");
  const policy = centerPolicyFor(user.centerId);
  return {
    portalOnly: policy?.portalOnlyEarlyPhase === true && earlyPhase,
    communityAllowed: !(
      policy?.communityAccessDuringResidential === false && earlyPhase
    ),
  };
}

/* ── GET - the whole portal payload in one round trip ────────────────── */

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const d = db() as PortalDB;
  const tasks = tasksFor(d, user);
  const kudos = kudosFor(d, user);
  const policy = policyFor(d, user);

  // The member's active program enrollment (one active run at a time).
  const enrollment =
    d.programEnrollments.find(
      (e) => e.memberId === user.id && e.status === "active"
    ) ?? null;

  if (!enrollment) {
    return NextResponse.json({
      enrolled: false,
      program: null,
      today: { sessions: [], tasks },
      kudos,
      policy,
    });
  }

  const programRec = d.programs.find((p) => p.id === enrollment.programId);

  // Curriculum progress - completed lessons across course items vs total,
  // reusing the existing courses + enrollments data. nextUp is the first
  // curriculum course item the member hasn't finished.
  const items = [...d.programCurriculum]
    .filter((i) => i.programId === enrollment.programId)
    .sort((a, b) => a.sort - b.sort);
  let totalLessons = 0;
  let doneLessons = 0;
  let nextUp: string | null = null;
  for (const item of items) {
    if (item.kind !== "course" || !item.courseId) continue;
    const course = d.courses.find((c) => c.id === item.courseId);
    if (!course || course.lessonCount <= 0) continue;
    const en = d.enrollments.find(
      (e) => e.memberId === user.id && e.courseId === course.id
    );
    const completed = Math.min(
      en?.completedLessons?.length ?? 0,
      course.lessonCount
    );
    totalLessons += course.lessonCount;
    doneLessons += completed;
    if (nextUp === null && completed < course.lessonCount) {
      nextUp = item.label || course.title;
    }
  }
  const progressPct =
    totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  // Today's sessions - or the next 2 upcoming when today is clear.
  const now = Date.now();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dayStart = start.getTime();
  const dayEnd = dayStart + 86_400_000;
  const scheduled = d.programSessions
    .filter((s) => s.programId === enrollment.programId)
    .map((s) => ({ ...s, ts: toMs(s.startsAt) }))
    .filter((s) => s.ts > 0)
    .sort((a, b) => a.ts - b.ts);
  const todays = scheduled.filter((s) => s.ts >= dayStart && s.ts < dayEnd);
  const chosen =
    todays.length > 0
      ? todays
      : scheduled.filter((s) => s.ts >= now).slice(0, 2);
  const sessions = chosen.map((s) => {
    // First name only, never the staff id (privacy rule, docs/16 Part D).
    const facilitator = s.facilitatorId
      ? findUserById(s.facilitatorId)
      : undefined;
    return {
      title: s.title || "Program session",
      startsAt: s.ts,
      durationMin: Number(s.durationMin) || 0,
      location: s.location || undefined,
      facilitatorName: facilitator?.name || undefined,
      isToday: s.ts >= dayStart && s.ts < dayEnd,
    };
  });

  return NextResponse.json({
    enrolled: true,
    program: {
      id: enrollment.programId,
      title: programRec?.title || "My Program",
      badge: programRec?.badge || undefined,
      progressPct,
      nextUp,
      channelId: programChannelId(d.careChannels, enrollment.programId, user),
      cohortLabel: enrollment.cohortLabel || undefined,
    },
    today: { sessions, tasks },
    kudos,
    policy,
  });
}
