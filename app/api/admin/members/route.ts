import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { SupportRequest } from "@/app/lib/types";

/** Staff roster view — members with balances, requests, streaks, mentor.
 *  `requests` stays inline per row (the dashboard detail pane reads it from
 *  this payload); lookups are pre-indexed so 500 members stays O(n).
 *  Staff-only (was demo-open; P0 gap closed). */
export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  const d = db();
  const nameById = new Map(d.users.map((u) => [u.id, u.name]));
  const requestsByMember = new Map<string, SupportRequest[]>();
  for (const r of d.requests) {
    const list = requestsByMember.get(r.memberId);
    if (list) list.push(r);
    else requestsByMember.set(r.memberId, [r]);
  }
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
      mentorName: m.mentorId ? nameById.get(m.mentorId) ?? null : null,
      requests: requestsByMember.get(m.id) ?? [],
      joinedAt: m.createdAt,
    }));
  return NextResponse.json({ members });
}
