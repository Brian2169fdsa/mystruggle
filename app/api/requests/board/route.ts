import { NextResponse } from "next/server";
import { db, findUserById } from "@/app/lib/store";

/** Public support-request board — active goals of consenting members only.
 *  First names + slugs only (privacy rules per docs/10-COMPLIANCE). */
export async function GET() {
  const d = db();
  const board = d.requests
    .filter((r) => r.status === "active")
    .map((r) => {
      const member = findUserById(r.memberId);
      if (!member?.consentPublic || !member.slug) return null;
      return {
        id: r.id,
        label: r.label,
        weeklyTarget: r.weeklyTarget,
        raised: r.raised,
        memberName: member.name,
        slug: member.slug,
        avatarColor: member.avatarColor,
        createdAt: r.createdAt,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.createdAt - a!.createdAt)
    .slice(0, 12);
  return NextResponse.json({ board });
}
