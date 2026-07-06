// Program completion (docs/16 Part A - the graduation moment). Staff-only.
// Marks a member's active enrollment "completed", stamps completedAt, emits
// the "lms" continuum heartbeat (weight 4 - a completion outweighs an
// enrollment's 3), and drops a warm certificate notification in the member's
// inbox. Idempotent: completing an already-completed member returns the
// existing row with a 200 instead of erroring.

import { NextResponse } from "next/server";
import { db, save, emitContinuumEvent, emitNotification } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { ProgramRow, ProgramCollections } from "../../route";

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

/**
 * POST /api/programs/[id]/complete - staff marks a member's run complete.
 * Body: { memberId }
 * Returns { enrollment } - the completed row. 200 with the existing row when
 * the member already completed this program (idempotent); 404 when the member
 * has no active enrollment to complete.
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
  const program: ProgramRow | undefined = d.programs.find((p) => p.id === id);
  if (!program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  let body: { memberId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) {
    return NextResponse.json(
      { error: "Pick a member to celebrate." },
      { status: 400 }
    );
  }

  // Idempotent: an existing completion is the answer, not an error.
  const already = d.programEnrollments.find(
    (e) =>
      e.programId === program.id &&
      e.memberId === memberId &&
      e.status === "completed"
  );
  if (already) {
    return NextResponse.json({ enrollment: already, alreadyCompleted: true });
  }

  const enrollment = d.programEnrollments.find(
    (e) =>
      e.programId === program.id &&
      e.memberId === memberId &&
      e.status === "active"
  );
  if (!enrollment) {
    return NextResponse.json(
      { error: "No active enrollment for this member in this program." },
      { status: 404 }
    );
  }

  enrollment.status = "completed";
  enrollment.completedAt = Date.now();

  // The graduation heartbeat (existing "lms" learning source, weight 4).
  emitContinuumEvent(memberId, "lms", 4, program.id);
  // The moment itself lands in the member's inbox - warm, theirs, printable.
  emitNotification(
    memberId,
    "system",
    `You completed ${program.title}! 🎓`,
    "Your certificate is ready - and your community is proud of you.",
    "certificate",
    enrollment.id
  );

  save();
  return NextResponse.json({ enrollment });
}
