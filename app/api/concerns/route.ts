import { NextResponse } from "next/server";
import { db, findUserById, save, uid } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { Concern } from "@/app/lib/types";

/** Open concerns queue — staff only. Open first, then newest, with the
 *  mentor's and member's first names (and member number) resolved. */
export async function GET() {
  const me = await getRoleUser(); // staff only
  if (!me) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const concerns = [...db().concerns]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return b.createdAt - a.createdAt;
    })
    .map((c) => {
      const member = findUserById(c.memberId);
      return {
        ...c,
        mentorName: findUserById(c.mentorId)?.name ?? null,
        memberName: member?.name ?? null,
        memberNumber: member?.memberNumber ?? null,
      };
    });

  return NextResponse.json({ concerns });
}

/** Raise a concern (mentor or staff) — or, with {id, status:"resolved"},
 *  resolve one (staff only). Quiet by design: never surfaces on the member. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // ── resolve path — staff only ──────────────────────────────────────
  if (typeof body?.id === "string") {
    const staff = await getRoleUser();
    if (!staff) {
      return NextResponse.json(
        { error: "Staff sign-in required." },
        { status: 401 }
      );
    }
    if (body?.status !== "resolved") {
      return NextResponse.json(
        { error: 'Only status "resolved" is supported.' },
        { status: 400 }
      );
    }
    const concern = db().concerns.find((c) => c.id === body.id);
    if (!concern) {
      return NextResponse.json({ error: "Concern not found." }, { status: 404 });
    }
    concern.status = "resolved";
    save();
    return NextResponse.json({ concern });
  }

  // ── create path — mentor (or staff) only ───────────────────────────
  const me = await getRoleUser("mentor");
  if (!me) {
    return NextResponse.json(
      { error: "Sign in as a mentor first." },
      { status: 401 }
    );
  }

  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  const note =
    typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";

  const member = findUserById(memberId);
  if (!member || member.role !== "member") {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const duplicate = db().concerns.find(
    (c) =>
      c.mentorId === me.id && c.memberId === memberId && c.status === "open"
  );
  if (duplicate) {
    return NextResponse.json(
      { error: "You already raised this — the care team is on it." },
      { status: 409 }
    );
  }

  const concern: Concern = {
    id: uid(),
    mentorId: me.id,
    memberId,
    ...(note ? { note } : {}),
    status: "open",
    createdAt: Date.now(),
  };
  db().concerns.push(concern);
  save();

  return NextResponse.json({ concern });
}
