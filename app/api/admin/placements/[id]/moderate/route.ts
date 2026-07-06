import { NextResponse } from "next/server";
import { db, save } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import { withStats } from "@/app/api/placements/_lib";

/**
 * ms_admin (= staff) moderation decision on a placement.
 * {action: "approve" | "reject", reason?}
 *   • approve → status "running" + approvedBy = the deciding staff id.
 *   • reject  → status "rejected" + rejectionReason (from `reason`).
 *
 * Audit trail: rather than console.log, the decision is captured in a returned
 * `note` field (and persisted on the record via approvedBy / rejectionReason),
 * so the console stays clean and the audit is queryable data.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRoleUser();
  if (!admin) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  const { id } = await params;
  const placement = db().sponsoredPlacements.find((p) => p.id === id);
  if (!placement) {
    return NextResponse.json({ error: "Placement not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const reason =
    typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";

  let note: string;
  if (action === "approve") {
    placement.status = "running";
    placement.approvedBy = admin.id;
    placement.rejectionReason = undefined;
    note = `Approved by ${admin.name} - placement now running.`;
  } else if (action === "reject") {
    placement.status = "rejected";
    placement.rejectionReason = reason || "Rejected: does not meet the community content policy.";
    note = `Rejected by ${admin.name}: ${placement.rejectionReason}`;
  } else {
    return NextResponse.json(
      { error: "action must be approve or reject." },
      { status: 400 }
    );
  }
  save();
  return NextResponse.json({ placement: withStats(placement), note });
}
