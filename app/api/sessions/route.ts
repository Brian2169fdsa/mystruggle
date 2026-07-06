import { NextResponse } from "next/server";
import { db, findUserById, save, uid, emitContinuumEvent } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { Session, SessionMode } from "@/app/lib/types";

const MODES: SessionMode[] = ["in-person", "phone", "video"];
const MINUTES = [15, 30, 45, 60];

/** Defensive access - works whether or not the seeded sessions array
 *  landed yet (store reseed is rolling out separately). */
function sessionStore(): Session[] {
  const d = db() as ReturnType<typeof db> & { sessions?: Session[] };
  d.sessions ??= [];
  return d.sessions;
}

/** Sessions for one member, newest first (capped at 20), with the mentor's
 *  first name resolved for display. Mentor- or staff-only (was demo-open;
 *  P0 gap closed). */
export async function GET(req: Request) {
  const me = await getRoleUser("mentor");
  if (!me) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  const memberId = new URL(req.url).searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json(
      { error: "memberId is required." },
      { status: 400 }
    );
  }

  const all = sessionStore()
    .filter((s) => s.memberId === memberId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const sessions = all.slice(0, 20).map((s) => ({
    ...s,
    mentorName: findUserById(s.mentorId)?.name ?? null,
  }));

  return NextResponse.json({ sessions, count: all.length });
}

/** Log a session - signed-in mentors (staff passes every role check). */
export async function POST(req: Request) {
  const me = await getRoleUser("mentor");
  if (!me) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  const mode = body?.mode as SessionMode;
  const minutes = body?.minutes;
  const note =
    typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";

  if (!MODES.includes(mode)) {
    return NextResponse.json(
      { error: "mode must be in-person, phone, or video." },
      { status: 400 }
    );
  }
  if (!MINUTES.includes(minutes)) {
    return NextResponse.json(
      { error: "minutes must be 15, 30, 45, or 60." },
      { status: 400 }
    );
  }
  const member = findUserById(memberId);
  if (!member || member.role !== "member") {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const session: Session = {
    id: uid(),
    mentorId: me.id,
    memberId,
    mode,
    minutes,
    ...(note ? { note } : {}),
    createdAt: Date.now(),
  };
  sessionStore().push(session);
  save();

  // Continuum: a logged mentor session is a strong engagement signal.
  emitContinuumEvent(memberId, "session", 4, session.id);

  return NextResponse.json({ session });
}
