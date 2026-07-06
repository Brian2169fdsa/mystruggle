// Cohort enrollment (docs/16 Part A - "enroll cohort: multi-select from
// roster"). Staff-only. Skips members who are already in the program, links
// each new enrollment to the member's active care episode when one exists,
// and emits an "lms" continuum event per enrollment (the existing source for
// learning signals - programs are the LMS grown a level).

import { NextResponse } from "next/server";
import {
  db,
  save,
  uid,
  emitContinuumEvent,
  emitNotification,
} from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type {
  ProgramRow,
  EnrollmentRow,
  ProgramCollections,
} from "../../route";

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
 * POST /api/programs/[id]/enroll - staff enrolls a cohort.
 * Body: { memberIds?: string[], identifiers?: string[], cohortLabel? }
 * `identifiers` (CSV cohort import) are resolved against the member roster
 * by exact member number OR email (case-insensitive); at least one of
 * memberIds / identifiers must be non-empty.
 * Returns { enrollments, skipped, resolved, unmatched } - `enrollments` is
 * only the NEWLY created rows (already-enrolled members are skipped quietly,
 * alongside a `skipped` count for the UI), `resolved` maps each matched
 * identifier to { identifier, memberId, name }, and `unmatched` lists the
 * identifiers no member matched.
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

  let body: { memberIds?: unknown; identifiers?: unknown; cohortLabel?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const memberIds = Array.isArray(body.memberIds)
    ? body.memberIds.filter((m): m is string => typeof m === "string")
    : [];
  // CSV cohort import: raw identifiers (member numbers or emails), capped to
  // match the client-side 200-row limit.
  const identifiers = Array.isArray(body.identifiers)
    ? body.identifiers
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 200)
    : [];
  if (memberIds.length === 0 && identifiers.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one member to enroll." },
      { status: 400 }
    );
  }
  const cohortLabel =
    typeof body.cohortLabel === "string" && body.cohortLabel.trim()
      ? body.cohortLabel.trim()
      : undefined;

  // Resolve identifiers -> members by exact member number OR email
  // (case-insensitive). Unmatched identifiers come back verbatim so the
  // importer can show exactly which rows found nobody.
  const resolved: { identifier: string; memberId: string; name: string }[] = [];
  const unmatched: string[] = [];
  for (const identifier of new Set(identifiers)) {
    const needle = identifier.toLowerCase();
    const member = d.users.find(
      (u) =>
        u.role === "member" &&
        (u.memberNumber === identifier || u.email.toLowerCase() === needle)
    );
    if (member) {
      resolved.push({ identifier, memberId: member.id, name: member.name });
    } else {
      unmatched.push(identifier);
    }
  }

  const enrolled = new Set(
    d.programEnrollments
      .filter((e) => e.programId === program.id && e.status !== "withdrawn")
      .map((e) => e.memberId)
  );

  const created: EnrollmentRow[] = [];
  let skipped = 0;
  for (const memberId of new Set([
    ...memberIds,
    ...resolved.map((r) => r.memberId),
  ])) {
    const member = d.users.find(
      (u) => u.id === memberId && u.role === "member"
    );
    if (!member) {
      skipped++;
      continue;
    }
    if (enrolled.has(memberId)) {
      skipped++;
      continue;
    }
    // Link to the member's current (open) care episode when one exists.
    const episode = (d.careEpisodes ?? []).find(
      (ep) => ep.memberId === memberId && !ep.endedAt
    );
    const enrollment: EnrollmentRow = {
      id: uid(),
      programId: program.id,
      memberId,
      careEpisodeId: episode?.id,
      cohortLabel,
      enrolledAt: Date.now(),
      status: "active",
    };
    d.programEnrollments.push(enrollment);
    enrolled.add(memberId);
    created.push(enrollment);

    // One learning-signal heartbeat per enrollment (existing "lms" source).
    emitContinuumEvent(memberId, "lms", 3, program.id);
    // A warm welcome in the member's inbox - never about, always to.
    emitNotification(
      memberId,
      "system",
      "You're enrolled",
      `Welcome to ${program.title}. Your journey here starts now - we're glad you're in.`,
      "program",
      program.id
    );
  }

  save();
  return NextResponse.json(
    { enrollments: created, skipped, resolved, unmatched },
    { status: created.length > 0 ? 201 : 200 }
  );
}
