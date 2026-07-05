import { NextResponse } from "next/server";
import { save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { Circle, User } from "@/app/lib/types";
import {
  canReadCircle,
  circleDb,
  circleMemberCount,
  findCircle,
  isCircleMember,
} from "./_lib";

/** Public-safe circle projection with viewer-relative fields. */
function decorateCircle(circle: Circle, user: User | null) {
  return {
    ...circle,
    members: circleMemberCount(circle.id),
    joined: user ? isCircleMember(circle.id, user.id) : false,
    // Alumni circles of another center are visible in the directory but
    // their feed is private — the UI shows them locked.
    locked: !canReadCircle(circle, user),
  };
}

/** Circle directory — every circle with member count + viewer's joined flag. */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({
    circles: circleDb().circles.map((c) => decorateCircle(c, user)),
  });
}

/** Join or leave a circle — members, mentors, and staff alike. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const circleId = String(body?.circleId ?? "");
  const action = body?.action;
  if (!circleId || (action !== "join" && action !== "leave")) {
    return NextResponse.json(
      { error: "Send a circleId and an action of join or leave." },
      { status: 400 }
    );
  }

  const circle = findCircle(circleId);
  if (!circle) {
    return NextResponse.json({ error: "Circle not found." }, { status: 404 });
  }

  const d = circleDb();
  if (action === "join") {
    // Alumni circles stay center-private — you can't join across centers.
    if (!canReadCircle(circle, user)) {
      return NextResponse.json(
        { error: "This alumni circle is private to its center." },
        { status: 403 }
      );
    }
    if (!isCircleMember(circle.id, user.id)) {
      d.circleMemberships.push({
        id: uid(),
        circleId: circle.id,
        memberId: user.id,
        joinedAt: Date.now(),
      });
      save();
    }
  } else {
    const i = d.circleMemberships.findIndex(
      (m) => m.circleId === circle.id && m.memberId === user.id
    );
    if (i >= 0) {
      d.circleMemberships.splice(i, 1);
      save();
    }
  }

  return NextResponse.json({ circle: decorateCircle(circle, user) });
}
