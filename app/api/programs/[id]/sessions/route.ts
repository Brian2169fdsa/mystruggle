// Program sessions (docs/16 Part A - program_sessions). Staff-only.
// GET lists the program's scheduled group sessions; POST creates one, or a
// weekly series when `weeks` > 1 (the "session series" cadence auto-generates
// one session per week from the given start).

import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { SessionRow, ProgramCollections } from "../../route";

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

const WEEK_MS = 7 * 86_400_000;

/** GET /api/programs/[id]/sessions - the program's sessions, soonest first. */
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
  if (!d.programs.some((p) => p.id === id)) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }
  const sessions = d.programSessions
    .filter((s) => s.programId === id)
    .sort((a, b) => a.startsAt - b.startsAt);
  return NextResponse.json({ sessions });
}

/**
 * POST /api/programs/[id]/sessions - staff schedules session(s).
 * Body: { title, startsAt, durationMin, location?, weeks? }
 * weeks > 1 auto-generates a weekly series ("Title · Week N"), one session
 * every 7 days from startsAt. Returns { sessions } - the created rows.
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
  const program = d.programs.find((p) => p.id === id);
  if (!program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  let body: {
    title?: string;
    startsAt?: number;
    durationMin?: number;
    location?: string;
    weeks?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { error: "Give the session a title." },
      { status: 400 }
    );
  }
  const startsAt = Number(body.startsAt);
  if (!Number.isFinite(startsAt) || startsAt <= 0) {
    return NextResponse.json(
      { error: "Pick a start date and time." },
      { status: 400 }
    );
  }
  const durationMin = Number(body.durationMin);
  if (!Number.isFinite(durationMin) || durationMin < 5 || durationMin > 600) {
    return NextResponse.json(
      { error: "Duration should be between 5 and 600 minutes." },
      { status: 400 }
    );
  }
  const location = (body.location ?? "").trim() || undefined;
  const weeks =
    Number.isFinite(Number(body.weeks)) && Number(body.weeks) > 1
      ? Math.min(Math.round(Number(body.weeks)), 52)
      : 1;

  const created: SessionRow[] = [];
  for (let w = 0; w < weeks; w++) {
    created.push({
      id: uid(),
      programId: program.id,
      title: weeks > 1 ? `${title} · Week ${w + 1}` : title,
      startsAt: startsAt + w * WEEK_MS,
      durationMin: Math.round(durationMin),
      location,
      facilitatorId: staff.id,
      createdAt: Date.now(),
    });
  }
  d.programSessions.push(...created);
  save();
  return NextResponse.json({ sessions: created }, { status: 201 });
}
