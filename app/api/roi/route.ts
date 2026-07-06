import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";

/**
 * GET /api/roi  (staff only)
 *
 * Platform-measured ACTUALS for the ROI & Executive block (docs/16 Part F).
 * This route returns MEASUREMENTS only - never dollar figures. The dashboard
 * multiplies these by the center's own editable assumptions ("your
 * assumptions x our measurements") so the math stays transparent.
 *
 * DEFENSIVE BY DESIGN: the center-operations data expansion adds
 * `programEnrollments`, `staffEngagements`, and `sessionAttendance` to the
 * store concurrently with this route. Every access is `??=`-guarded and
 * structurally typed, so the route is correct before, during, and after that
 * seed lands - collections that do not exist yet simply read as empty.
 */

const DAY = 86_400_000;

/* Structural shapes for the concurrently-added collections (docs/16 Part A/C).
 * All fields optional - we never assume the concurrent seed's exact columns. */
type ProgramEnrollmentRow = {
  memberId?: string;
  status?: string; // 'active' | 'completed' | 'withdrawn'
  enrolledAt?: number;
  completedAt?: number | null;
};
type StaffEngagementRow = {
  staffId?: string;
  kind?: string;
  occurredAt?: number;
  at?: number;
  createdAt?: number;
};
type SessionAttendanceRow = {
  sessionId?: string;
  participantId?: string;
  status?: string;
  occurredAt?: number;
  markedAt?: number;
  at?: number;
};

/** First numeric timestamp a row carries, else 0 (= "time unknown"). */
function rowTime(
  r: StaffEngagementRow | SessionAttendanceRow
): number {
  for (const v of [
    (r as StaffEngagementRow).occurredAt,
    (r as SessionAttendanceRow).markedAt,
    (r as StaffEngagementRow).at,
    (r as StaffEngagementRow).createdAt,
  ]) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return 0;
}

export async function GET() {
  const staff = await getRoleUser(); // no roles listed -> staff only
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }

  const d = db() as ReturnType<typeof db> & {
    programEnrollments?: ProgramEnrollmentRow[];
    staffEngagements?: StaffEngagementRow[];
    sessionAttendance?: SessionAttendanceRow[];
  };
  // Defensive guards - the data expansion may not have landed yet.
  d.programEnrollments ??= [];
  d.staffEngagements ??= [];
  d.sessionAttendance ??= [];

  const cutoff = Date.now() - 30 * DAY;

  /* ── enrollment counts + completion / dropout rates ─────────────────
     Prefer program enrollments (docs/16 Part A). Until that seed lands,
     fall back to care episodes, which already carry discharge outcomes. */
  let activeEnrollments = 0;
  let completedEnrollments = 0;
  let withdrawn = 0;

  if (d.programEnrollments.length > 0) {
    for (const pe of d.programEnrollments) {
      const status = pe.status ?? "active";
      if (status === "active") activeEnrollments++;
      else if (status === "completed") completedEnrollments++;
      else if (status === "withdrawn") withdrawn++;
    }
  } else {
    for (const ep of d.careEpisodes ?? []) {
      if (ep.carePhase === "in_program") activeEnrollments++;
      if (ep.dischargeType === "completed") completedEnrollments++;
      else if (ep.dischargeType === "left_early") withdrawn++;
    }
  }

  const concluded = completedEnrollments + withdrawn;
  const completionRatePct = concluded
    ? Math.round((100 * completedEnrollments) / concluded)
    : 0;
  const dropoutRatePct = concluded
    ? Math.round((100 * withdrawn) / concluded)
    : 0;

  /* ── engagement (last 30 days) ───────────────────────────────────────
     engagedDays30 = distinct member-days with at least one continuum event. */
  const memberDays = new Set<string>();
  const activeMembers30 = new Set<string>();
  for (const ev of d.continuumEvents ?? []) {
    if (typeof ev.occurredAt !== "number" || ev.occurredAt < cutoff) continue;
    memberDays.add(ev.memberId + ":" + Math.floor(ev.occurredAt / DAY));
    activeMembers30.add(ev.memberId);
  }

  /* ── staff touches (last 30 days) ─────────────────────────────────── */
  const staffTouches30 = d.staffEngagements.filter(
    (r) => rowTime(r) >= cutoff
  ).length;

  /* ── sessions delivered (last 30 days) ──────────────────────────────
     Distinct sessions with attendance marked. Attendance rows without a
     timestamp count as current - session_attendance's schema carries no
     required timestamp, and undercounting would understate the center. */
  const sessionIds = new Set<string>();
  for (const row of d.sessionAttendance) {
    if (!row.sessionId) continue;
    const t = rowTime(row);
    if (t === 0 || t >= cutoff) sessionIds.add(row.sessionId);
  }
  const sessionsDelivered30 = sessionIds.size;

  /* ── alumni retained ─────────────────────────────────────────────────
     Post-center members (episode ended, or continuing phase) with any
     platform activity in the last 30 days. */
  const alumniIds = new Set<string>();
  for (const ep of d.careEpisodes ?? []) {
    if (ep.endedAt != null || ep.carePhase === "continuing") {
      alumniIds.add(ep.memberId);
    }
  }
  let alumniRetained = 0;
  for (const id of alumniIds) {
    if (activeMembers30.has(id)) alumniRetained++;
  }

  return NextResponse.json({
    actuals: {
      activeEnrollments,
      completedEnrollments,
      completionRatePct,
      dropoutRatePct,
      engagedDays30: memberDays.size,
      staffTouches30,
      sessionsDelivered30,
      alumniRetained,
    },
  });
}
