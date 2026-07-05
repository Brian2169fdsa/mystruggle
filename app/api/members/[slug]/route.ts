import { NextResponse } from "next/server";
import { db, findMemberBySlug } from "@/app/lib/store";
import type { PublicMember } from "@/app/lib/types";

/** Public giving-page data. Never exposes last name, email, balances
 *  beyond savings, or anything the member hasn't consented to. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const member = findMemberBySlug(slug);
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (!member.consentPublic) {
    // Generic org-giving state — page exists but shows no personal info.
    return NextResponse.json({ member: null, generic: true });
  }
  const pub: PublicMember = {
    slug: member.slug!,
    name: member.name,
    memberNumber: member.memberNumber!,
    story: member.story ?? "",
    consentPublic: true,
    requests: db().requests.filter(
      (r) => r.memberId === member.id && r.status === "active"
    ),
    savings: member.balances?.savings ?? 0,
  };
  return NextResponse.json({ member: pub });
}
