import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { findCircle } from "../_lib";

/** Mark a circle as seen for the session viewer - upserts their CircleSeen
 *  marker to now, zeroing the circle's "N new posts" badge on the next
 *  GET /api/circles. Fired (fire-and-forget) when a joined circle is opened. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const circleId = String(body?.circleId ?? "");
  if (!circleId || !findCircle(circleId)) {
    return NextResponse.json({ error: "Circle not found." }, { status: 404 });
  }

  const rows = db().circleSeen;
  const existing = rows.find(
    (s) => s.circleId === circleId && s.userId === user.id
  );
  if (existing) {
    existing.seenAt = Date.now();
  } else {
    rows.push({ id: uid(), circleId, userId: user.id, seenAt: Date.now() });
  }
  save();

  return NextResponse.json({ ok: true });
}
