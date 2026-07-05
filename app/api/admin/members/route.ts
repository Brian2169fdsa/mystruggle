import { NextResponse } from "next/server";
import { db, findUserById } from "@/app/lib/store";

/** Staff roster view — members with balances, requests, streaks, mentor.
 *  Demo-open; lock behind staff auth before production. */
export async function GET() {
  const d = db();
  const members = d.users
    .filter((u) => u.role === "member")
    .map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      memberNumber: m.memberNumber,
      avatarColor: m.avatarColor,
      consentPublic: m.consentPublic ?? false,
      balances: m.balances ?? { cash: 0, credits: 0, savings: 0 },
      streak: m.streak ?? 0,
      points: m.points ?? 0,
      level: m.level ?? "Bronze",
      mentorName: m.mentorId ? findUserById(m.mentorId)?.name ?? null : null,
      requests: d.requests.filter((r) => r.memberId === m.id),
      joinedAt: m.createdAt,
    }));
  return NextResponse.json({ members });
}
