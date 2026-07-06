// Session attendance (docs/16 Part A - session_attendance). Staff-only.
// POST upserts one member's status for one session (present/remote/excused/
// absent); a NEW mark emits a "session" continuum event so showing up counts
// on the member's engagement heartbeat (corrections don't double-count).
// GET ?sessionId= returns the enrolled roster with each member's status.

import { NextResponse } from "next/server";
import { db, save, uid, emitContinuumEvent } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { AttendanceRow, ProgramCollections } from "../../route";

/** Defensive store accessor (same guard as the collection route). */
function programDb(): ReturnType<typeof db> & ProgramCollections {
  const d = db() as unknown as ReturnType<typeof db> &
    Partial<ProgramCollections>;
  d.programs ??= [];
  d.programCurriculum ??= [];
  d.programEnrollments ??= [];
  d.programSessions ??= [];
  d.sessionAttendance ??= [];
  return d as ReturnType<typeof db> & ProgramCollections;
}

const STATUSES: AttendanceRow["status"][] = [
  "present",
  "remote",
  "excused",
  "absent",
];

/**
 * GET /api/programs/[id]/attendance?sessionId=...
 * The session's roster: every enrolled member with their marked status
 * (or null when unmarked). Shape:
 * { roster: [{ memberId, name, avatarColor, memberNumber, status, markedAt }] }
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  const { id } = await params;
  const d = programDb();
  if (!d.programs.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }
  const sessionId = new URL(req.url).searchParams.get("sessionId") ?? "";
  const session = d.programSessions.find(
    (s) => s.id === sessionId && s.programId === id
  );
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const userById = new Map(d.users.map((u) => [u.id, u]));
  const marks = new Map(
    d.sessionAttendance
      .filter((a) => a.sessionId === session.id)
      .map((a) => [a.memberId, a])
  );
  const roster = d.programEnrollments
    .filter((e) => e.programId === id && e.status !== "withdrawn")
    .map((e) => {
      const m = userById.get(e.memberId);
      const mark = marks.get(e.memberId);
      return {
        memberId: e.memberId,
        name: m?.name ?? "Member",
        avatarColor: m?.avatarColor ?? "#4E5B9B",
        memberNumber: m?.memberNumber,
        status: mark?.status ?? null,
        markedAt: mark?.markedAt ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ session, roster });
}

/**
 * POST /api/programs/[id]/attendance - staff marks (or corrects) attendance.
 * Body: { sessionId, memberId, status } - upsert on (sessionId, memberId).
 * Returns { attendance }. First mark emits emitContinuumEvent(memberId,
 * "session", 3, sessionId); corrections update in place without re-emitting.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  const { id } = await params;
  const d = programDb();
  if (!d.programs.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  let body: { sessionId?: string; memberId?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const session = d.programSessions.find(
    (s) => s.id === body.sessionId && s.programId === id
  );
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  const memberId = body.memberId ?? "";
  const isEnrolled = d.programEnrollments.some(
    (e) =>
      e.programId === id &&
      e.memberId === memberId &&
      e.status !== "withdrawn"
  );
  if (!isEnrolled) {
    return NextResponse.json(
      { error: "That member isn't enrolled in this program." },
      { status: 400 }
    );
  }
  const status = body.status as AttendanceRow["status"];
  if (!STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Status must be present, remote, excused, or absent." },
      { status: 400 }
    );
  }

  let attendance = d.sessionAttendance.find(
    (a) => a.sessionId === session.id && a.memberId === memberId
  );
  if (attendance) {
    attendance.status = status;
    attendance.markedBy = staff.id;
    attendance.markedAt = Date.now();
    save();
  } else {
    attendance = {
      id: uid(),
      sessionId: session.id,
      memberId,
      status,
      markedBy: staff.id,
      markedAt: Date.now(),
    };
    d.sessionAttendance.push(attendance);
    save();
    // Being marked (any status) is a touchpoint on the heartbeat - once.
    emitContinuumEvent(memberId, "session", 3, session.id);
  }

  return NextResponse.json({ attendance });
}
