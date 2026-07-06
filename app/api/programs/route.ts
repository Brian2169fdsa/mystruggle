// Center Operations - Program Builder API (docs/16 Part A).
// Programs sit ABOVE courses: a packaged, runnable offering (curriculum +
// schedule + cohort) targeted at a level of care. Staff-only surface.
//
// The program collections are being added to the store's seed concurrently;
// every access here is defensive (`d.programs ??= []`) and the types are
// declared structurally so this module stands on its own either way.

import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";

// ── structural types (mirror app/lib/types.ts program additions) ────────

export type ProgramLevelOfCare =
  | "detox"
  | "residential"
  | "php"
  | "iop"
  | "op"
  | "recovery_maintenance"
  | "custom";

export type ProgramDelivery = "in_facility" | "remote" | "hybrid";

export interface ProgramRow {
  id: string;
  centerId?: string;
  title: string;
  description: string;
  levelOfCare: ProgramLevelOfCare;
  category?: string;
  durationWeeks?: number;
  delivery: ProgramDelivery;
  isTemplate: boolean;
  status: "draft" | "published" | "archived";
  badge?: string;
  createdAt: number;
}

export interface CurriculumRow {
  id: string;
  programId: string;
  sort: number;
  kind: "course" | "session_series" | "task_pack" | "milestone";
  courseId?: string;
  label: string;
  config?: Record<string, unknown>;
}

export interface EnrollmentRow {
  id: string;
  programId: string;
  memberId: string;
  careEpisodeId?: string;
  cohortLabel?: string;
  enrolledAt: number;
  completedAt?: number;
  status: "active" | "completed" | "withdrawn";
}

export interface SessionRow {
  id: string;
  programId: string;
  title: string;
  startsAt: number;
  durationMin: number;
  location?: string;
  facilitatorId?: string;
  createdAt: number;
}

export interface AttendanceRow {
  id: string;
  sessionId: string;
  memberId: string;
  status: "present" | "remote" | "excused" | "absent";
  markedBy: string;
  markedAt: number;
}

export type ProgramCollections = {
  programs: ProgramRow[];
  programCurriculum: CurriculumRow[];
  programEnrollments: EnrollmentRow[];
  programSessions: SessionRow[];
  sessionAttendance: AttendanceRow[];
};

/** Defensive store accessor - guarantees the five program collections exist
 *  even when the seed that populates them hasn't landed yet. (Not exported:
 *  route modules may only value-export HTTP handlers; the sibling routes
 *  carry their own copy and share the exported types above.) */
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

const LEVELS_OF_CARE: ProgramLevelOfCare[] = [
  "detox",
  "residential",
  "php",
  "iop",
  "op",
  "recovery_maintenance",
  "custom",
];

const DELIVERIES: ProgramDelivery[] = ["in_facility", "remote", "hybrid"];

/** Programs a staff user may see: their own center's + every template. */
function visiblePrograms(staffCenterId?: string): ProgramRow[] {
  return programDb().programs.filter(
    (p) =>
      p.isTemplate || !staffCenterId || !p.centerId || p.centerId === staffCenterId
  );
}

/**
 * GET /api/programs - staff only.
 * Own-center programs + all My Struggle templates, each decorated with
 * enrolledCount, sessionCount, and its ordered curriculum.
 */
export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  const d = programDb();
  const programs = visiblePrograms(staff.centerId).map((p) => ({
    ...p,
    enrolledCount: d.programEnrollments.filter(
      (e) => e.programId === p.id && e.status !== "withdrawn"
    ).length,
    sessionCount: d.programSessions.filter((s) => s.programId === p.id).length,
    curriculum: d.programCurriculum
      .filter((c) => c.programId === p.id)
      .sort((a, b) => a.sort - b.sort),
  }));
  // Own drafts/published first (newest first), templates last.
  programs.sort((a, b) => {
    if (a.isTemplate !== b.isTemplate) return a.isTemplate ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
  return NextResponse.json({ programs });
}

/**
 * POST /api/programs - staff creates a program (always starts as a draft).
 * Body: { title, description, levelOfCare, delivery, durationWeeks?,
 *         category?, cloneFromId? }.
 * cloneFromId copies a template's curriculum items (new ids, new programId)
 * so a center can start from a My Struggle starter and make it their own.
 */
export async function POST(req: Request) {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }

  let body: {
    title?: string;
    description?: string;
    levelOfCare?: string;
    delivery?: string;
    durationWeeks?: number;
    category?: string;
    cloneFromId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const d = programDb();
  const source = body.cloneFromId
    ? d.programs.find((p) => p.id === body.cloneFromId)
    : undefined;
  if (body.cloneFromId && !source) {
    return NextResponse.json(
      { error: "That template isn't available." },
      { status: 404 }
    );
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { error: "Give the program a title." },
      { status: 400 }
    );
  }
  const levelOfCare = (body.levelOfCare ??
    source?.levelOfCare) as ProgramLevelOfCare;
  if (!LEVELS_OF_CARE.includes(levelOfCare)) {
    return NextResponse.json(
      { error: "Pick a level of care." },
      { status: 400 }
    );
  }
  const delivery = (body.delivery ?? source?.delivery) as ProgramDelivery;
  if (!DELIVERIES.includes(delivery)) {
    return NextResponse.json(
      { error: "Pick a delivery mode." },
      { status: 400 }
    );
  }
  const durationWeeks =
    typeof body.durationWeeks === "number" &&
    Number.isFinite(body.durationWeeks) &&
    body.durationWeeks > 0
      ? Math.min(Math.round(body.durationWeeks), 104)
      : source?.durationWeeks;

  const program: ProgramRow = {
    id: uid(),
    centerId: staff.centerId,
    title,
    description: (body.description ?? "").trim() || source?.description || "",
    levelOfCare,
    category: (body.category ?? "").trim() || source?.category || undefined,
    durationWeeks,
    delivery,
    isTemplate: false,
    status: "draft",
    badge: source?.badge,
    createdAt: Date.now(),
  };
  d.programs.push(program);

  // Clone the template's curriculum - new ids, same order and config.
  if (source) {
    const items = d.programCurriculum
      .filter((c) => c.programId === source.id)
      .sort((a, b) => a.sort - b.sort);
    for (const item of items) {
      d.programCurriculum.push({
        ...item,
        id: uid(),
        programId: program.id,
      });
    }
  }

  save();
  return NextResponse.json({ program }, { status: 201 });
}
