import { NextResponse } from "next/server";
import { getRoleUser } from "@/app/lib/auth";
import {
  db,
  save,
  uid,
  emitContinuumEvent,
  emitNotification,
  findUserById,
} from "@/app/lib/store";
import type { StaffEngagement } from "@/app/lib/types";

const MAX_NOTE = 200;

/**
 * POST /api/referrals (staff) { memberId, postingId, note? }
 *
 * Care-team job referral (docs/17): a staff member suggests an OPEN posting
 * to a member. This NEVER auto-applies and writes NO application row - the
 * client always decides. Three effects, all reusing existing write paths:
 *
 *  1. A "job" notification lands in the member's inbox, deep-linked to the
 *     posting (refType "job", refId postingId).
 *  2. The touch is logged as a staffEngagement (kind "nudge") with the same
 *     defensive `??=` guard the staff-engagements route uses, so the human
 *     contact is measured like every other touch.
 *  3. A continuum "checkin" event (weight 1, refId postingId) records the
 *     engagement input - no new continuum source is invented.
 *
 * Responds { ok: true }. POST-only by design; referrals are stateless
 * suggestions, not a tracked pipeline.
 */
export async function POST(req: Request) {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const memberId = String(payload.memberId ?? "");
  const postingId = String(payload.postingId ?? "");
  const note =
    payload.note === undefined ? undefined : String(payload.note).trim();

  const member = findUserById(memberId);
  if (!member || member.role !== "member") {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (note !== undefined && note.length > MAX_NOTE) {
    return NextResponse.json(
      { error: `Keep the note short and warm - ${MAX_NOTE} characters max.` },
      { status: 400 }
    );
  }

  // jobPosts may be absent on a stale db.json loaded before seed v10 - same
  // defensive guard the jobs route uses.
  const d = db();
  d.jobPosts ??= [];
  const posting = d.jobPosts.find((j) => j.id === postingId);
  if (!posting) {
    return NextResponse.json({ error: "Posting not found." }, { status: 404 });
  }
  if (posting.status !== "open") {
    return NextResponse.json(
      { error: "That posting is no longer open." },
      { status: 400 }
    );
  }

  // The suggestion, framed so the decision stays with the member. No
  // application is created here - the member applies (or not) on their own.
  const staffFirstName = me.name.split(" ")[0] || "Someone on your care team";
  emitNotification(
    memberId,
    "job",
    "A job your care team thought of you for",
    `${staffFirstName} thought you would be a great fit for ${posting.title} at ${posting.company}.${note ? " " + note : ""} It is always your call.`,
    "job",
    posting.id
  );

  // Log the touch as a staffEngagement (kind "nudge") so the referral counts
  // as measured human contact, with the same defensive pattern as
  // app/api/staff-engagements.
  d.staffEngagements ??= [];
  const engagement: StaffEngagement = {
    id: uid(),
    memberId,
    staffId: me.id,
    kind: "nudge",
    body: `Referred a job: ${posting.title} at ${posting.company}.`,
    occurredAt: Date.now(),
  };
  d.staffEngagements.push(engagement);
  save();

  // Human contact is a measured engagement input - reuses the existing
  // continuum source "checkin".
  emitContinuumEvent(memberId, "checkin", 1, posting.id);

  return NextResponse.json({ ok: true });
}
