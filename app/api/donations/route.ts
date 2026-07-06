import { NextResponse } from "next/server";
import { db, save, uid, findMemberBySlug, emitContinuumEvent, emitNotification } from "@/app/lib/store";

/** Record a donation to a member: splits 50/50 cash / Reentry Fund and
 *  advances the targeted support request's weekly progress. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const slug = String(body?.slug ?? "");
  const amount = Math.floor(Number(body?.amount ?? 0));
  const weekly = Boolean(body?.weekly);
  const requestId = body?.requestId ? String(body.requestId) : undefined;

  if (amount < 1 || amount > 10_000) {
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
  }
  const member = findMemberBySlug(slug);
  if (!member || !member.consentPublic) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const half = amount / 2;
  member.balances = member.balances ?? { cash: 0, credits: 0, savings: 0 };
  member.balances.cash += half;
  member.balances.credits += half;

  const request =
    db().requests.find((r) => r.id === requestId && r.memberId === member.id) ??
    db().requests.find((r) => r.memberId === member.id && r.status === "active");
  if (request) {
    request.raised += amount;
    if (request.raised >= request.weeklyTarget) request.status = "funded";
  }

  db().donations.push({
    id: uid(),
    memberId: member.id,
    requestId: request?.id,
    amount,
    weekly,
    createdAt: Date.now(),
  });
  save();

  // Continuum: a gift received is an engagement/support signal on the member.
  emitContinuumEvent(member.id, "giving", 2);

  // Notify the member who received the gift. Donations are anonymous — never
  // name the donor.
  emitNotification(
    member.id,
    "system",
    "You received a gift",
    "A supporter gave to your journey. 50% is available now; 50% is held in your Reentry Fund.",
    "donation",
    request?.id
  );

  return NextResponse.json({
    ok: true,
    split: { cash: half, credits: half },
    request: request ?? null,
  });
}
