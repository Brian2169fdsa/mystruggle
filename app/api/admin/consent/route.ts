import { NextResponse } from "next/server";
import { getRoleUser } from "@/app/lib/auth";
import { db, save } from "@/app/lib/store";

/** Staff sets a member's public-giving-page consent flag.
 *
 *  docs/10-COMPLIANCE — revocation must propagate immediately: the public
 *  /p/[slug] route already reads consentPublic live on every request, so
 *  flipping the flag here takes effect on the very next page load (no cache,
 *  no delay). Staff-only — consent changes are a compliance action.
 */

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const staff = await getRoleUser();
  if (!staff) return bad(401, "Staff sign-in required.");

  let body: { memberId?: unknown; consentPublic?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON body.");
  }

  const { memberId, consentPublic } = body;
  if (typeof memberId !== "string" || !memberId) {
    return bad(400, "memberId is required.");
  }
  if (typeof consentPublic !== "boolean") {
    return bad(400, "consentPublic must be true or false.");
  }

  const member = db().users.find(
    (u) => u.id === memberId && u.role === "member"
  );
  if (!member) return bad(404, "Member not found.");

  member.consentPublic = consentPublic;
  save();

  return NextResponse.json({ ok: true, consentPublic: member.consentPublic });
}
