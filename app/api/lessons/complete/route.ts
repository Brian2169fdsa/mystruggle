import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { Enrollment } from "@/app/lib/types";

/** Level ladder (docs/07): Bronze from 0, Silver at 640, Gold at 1,000. */
function levelFor(points: number): string {
  if (points >= 1000) return "Gold";
  if (points >= 640) return "Silver";
  return "Bronze";
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const dbb = new Date(b);
  return (
    da.getFullYear() === dbb.getFullYear() &&
    da.getMonth() === dbb.getMonth() &&
    da.getDate() === dbb.getDate()
  );
}

/**
 * Complete a lesson: +10 points, level recompute, streak bump on the first
 * completion of the day. Idempotent — repeat completes never re-award.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const courseId = String(body?.courseId ?? "");
  const lesson = Number(body?.lesson);

  const d = db();
  const course = d.courses.find((c) => c.id === courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }
  if (!Number.isInteger(lesson) || lesson < 1 || lesson > course.lessonCount) {
    return NextResponse.json(
      { error: `Lesson must be 1–${course.lessonCount}.` },
      { status: 400 }
    );
  }

  const now = Date.now();
  let enrollment = d.enrollments.find(
    (e) => e.memberId === user.id && e.courseId === courseId
  );
  if (!enrollment) {
    enrollment = {
      id: uid(),
      memberId: user.id,
      courseId,
      completedLessons: [],
      updatedAt: now,
    } satisfies Enrollment;
    d.enrollments.push(enrollment);
  }

  if (enrollment.completedLessons.includes(lesson)) {
    return NextResponse.json({
      enrollment,
      points: user.points ?? 0,
      level: user.level ?? levelFor(user.points ?? 0),
      streak: user.streak ?? 0,
      awarded: false,
      alreadyDone: true,
    });
  }

  enrollment.completedLessons.push(lesson);
  enrollment.completedLessons.sort((a, b) => a - b);
  enrollment.updatedAt = now;

  user.points = (user.points ?? 0) + 10;
  user.level = levelFor(user.points);

  // Streak: +1 on the first qualifying activity of the day.
  if (!user.lastActivityAt || !sameDay(user.lastActivityAt, now)) {
    user.streak = (user.streak ?? 0) + 1;
  }
  user.lastActivityAt = now;

  save();
  return NextResponse.json({
    enrollment,
    points: user.points,
    level: user.level,
    streak: user.streak ?? 0,
    awarded: true,
  });
}
