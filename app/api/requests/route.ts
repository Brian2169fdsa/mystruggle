import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";

/** The signed-in member's support requests. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({
    requests: db().requests.filter((r) => r.memberId === user.id),
  });
}

/** Create a support request ("request online") shown on the giving page. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json({ error: "Sign in as a member first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const label = String(body?.label ?? "").trim();
  const weeklyTarget = Math.floor(Number(body?.weeklyTarget ?? 0));
  if (!label || weeklyTarget < 1 || weeklyTarget > 10_000) {
    return NextResponse.json(
      { error: "A label and a weekly target between $1 and $10,000 are required." },
      { status: 400 }
    );
  }
  const request = {
    id: uid(),
    memberId: user.id,
    label,
    weeklyTarget,
    raised: 0,
    status: "active" as const,
    createdAt: Date.now(),
  };
  db().requests.push(request);
  save();
  return NextResponse.json({ request });
}
