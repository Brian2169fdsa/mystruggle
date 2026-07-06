// Program detail + lifecycle (docs/16 Part A). Staff-only.
// GET returns the whole cockpit payload (program, curriculum, enrollments,
// sessions, attendance). PATCH handles status changes - publishing a draft
// auto-creates the program's group CareChannel (docs/14 §D) - and accepts a
// full-replace curriculum array for builder edits.

import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { CareChannel } from "@/app/lib/types";
import type {
  ProgramRow,
  CurriculumRow,
  ProgramCollections,
} from "../route";

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

const CURRICULUM_KINDS: CurriculumRow["kind"][] = [
  "course",
  "session_series",
  "task_pack",
  "milestone",
];

/** A staff user may open their own center's programs and any template. */
function findVisible(id: string, staffCenterId?: string): ProgramRow | null {
  const p = programDb().programs.find((p) => p.id === id);
  if (!p) return null;
  if (p.isTemplate || !staffCenterId || !p.centerId || p.centerId === staffCenterId)
    return p;
  return null;
}

/**
 * GET /api/programs/[id] - one program with curriculum (ordered),
 * enrollments (member name/avatar denormalized for the roster), sessions
 * (soonest first), and every attendance row for those sessions.
 */
export async function GET(
  _req: Request,
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
  const program = findVisible(id, staff.centerId);
  if (!program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  const userById = new Map(d.users.map((u) => [u.id, u]));
  const curriculum = d.programCurriculum
    .filter((c) => c.programId === program.id)
    .sort((a, b) => a.sort - b.sort);
  const enrollments = d.programEnrollments
    .filter((e) => e.programId === program.id)
    .map((e) => {
      const m = userById.get(e.memberId);
      return {
        ...e,
        memberName: m?.name ?? "Member",
        avatarColor: m?.avatarColor ?? "#4E5B9B",
        memberNumber: m?.memberNumber,
      };
    })
    .sort((a, b) => a.memberName.localeCompare(b.memberName));
  const sessions = d.programSessions
    .filter((s) => s.programId === program.id)
    .sort((a, b) => a.startsAt - b.startsAt);
  const sessionIds = new Set(sessions.map((s) => s.id));
  const attendance = d.sessionAttendance.filter((a) =>
    sessionIds.has(a.sessionId)
  );

  return NextResponse.json({
    program,
    curriculum,
    enrollments,
    sessions,
    attendance,
  });
}

/**
 * PATCH /api/programs/[id] - staff edits.
 * Body: { status? , curriculum? }
 * - status "published" on a not-yet-published program auto-creates its
 *   program_group CareChannel (named after the program) so the cohort has a
 *   home the moment the program goes live. Response includes { channel }.
 * - curriculum: full-replace array for builder edits; items keep their ids
 *   when supplied, new items get fresh ids, sort follows array order.
 */
export async function PATCH(
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
  const program = findVisible(id, staff.centerId);
  if (!program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  let body: {
    status?: string;
    curriculum?: Array<{
      id?: string;
      sort?: number;
      kind?: string;
      courseId?: string;
      label?: string;
      config?: Record<string, unknown>;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let channel: CareChannel | null = null;

  // ── status lifecycle ───────────────────────────────────────────────
  if (body.status !== undefined) {
    if (!["draft", "published", "archived"].includes(body.status)) {
      return NextResponse.json(
        { error: "Status must be draft, published, or archived." },
        { status: 400 }
      );
    }
    const publishing =
      body.status === "published" && program.status !== "published";
    program.status = body.status as ProgramRow["status"];

    // Publishing creates the cohort's group channel (docs/14 §D) - once.
    if (publishing) {
      const centerId = program.centerId ?? staff.centerId;
      if (centerId) {
        d.careChannels ??= [];
        const cohortId = `cohort-program-${program.id}`;
        const existing = d.careChannels.find(
          (c) => c.kind === "program_group" && c.cohortId === cohortId
        );
        if (existing) {
          channel = existing;
        } else {
          channel = {
            id: uid(),
            centerId,
            kind: "program_group",
            title: program.title,
            cohortId,
            createdAt: Date.now(),
          };
          d.careChannels.push(channel);
        }
      }
    }
  }

  // ── curriculum full-replace (builder save) ─────────────────────────
  if (body.curriculum !== undefined) {
    if (!Array.isArray(body.curriculum)) {
      return NextResponse.json(
        { error: "Curriculum must be a list of items." },
        { status: 400 }
      );
    }
    const next: CurriculumRow[] = [];
    for (let i = 0; i < body.curriculum.length; i++) {
      const item = body.curriculum[i];
      const kind = item.kind as CurriculumRow["kind"];
      if (!CURRICULUM_KINDS.includes(kind)) {
        return NextResponse.json(
          { error: `Curriculum item ${i + 1} needs a valid kind.` },
          { status: 400 }
        );
      }
      const label = (item.label ?? "").trim();
      if (!label) {
        return NextResponse.json(
          { error: `Curriculum item ${i + 1} needs a label.` },
          { status: 400 }
        );
      }
      next.push({
        id: item.id || uid(),
        programId: program.id,
        sort: typeof item.sort === "number" ? item.sort : i,
        kind,
        courseId: item.courseId || undefined,
        label,
        config: item.config,
      });
    }
    d.programCurriculum = [
      ...d.programCurriculum.filter((c) => c.programId !== program.id),
      ...next,
    ];
  }

  save();
  const curriculum = d.programCurriculum
    .filter((c) => c.programId === program.id)
    .sort((a, b) => a.sort - b.sort);
  return NextResponse.json({ program, curriculum, channel });
}
