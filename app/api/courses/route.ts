import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";

/** Learn tab data - all published courses + the signed-in member's enrollments. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const d = db();
  const enrollments = d.enrollments.filter((e) => e.memberId === user.id);
  return NextResponse.json({ courses: d.courses, enrollments });
}
