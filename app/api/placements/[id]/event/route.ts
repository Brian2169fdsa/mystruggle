import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { PlacementEvent } from "@/app/lib/types";

const KINDS: PlacementEvent["kind"][] = [
  "impression",
  "click",
  "dismiss",
  "report",
];

/**
 * Record an interaction with a placement: impression / click / dismiss /
 * report. The viewer's memberId is stored SERVER-SIDE ONLY (frequency cap +
 * dedup) and is NEVER surfaced to advertiser reads — GET /api/placements and
 * GET /api/admin/placements return aggregate counts, never per-member rows.
 *
 * A "report" is ALSO a moderation signal: because a report is stored as a
 * PlacementEvent with kind "report", it naturally increments the placement's
 * aggregate report count, and GET /api/admin/placements surfaces any placement
 * with report > 0 in the ms_admin review queue — no separate field needed.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const placement = db().sponsoredPlacements.find((p) => p.id === id);
  if (!placement) {
    return NextResponse.json({ error: "Placement not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const kind = body?.kind as PlacementEvent["kind"];
  if (!KINDS.includes(kind)) {
    return NextResponse.json(
      { error: "kind must be impression, click, dismiss, or report." },
      { status: 400 }
    );
  }

  // memberId is optional (signed-out impressions are possible) and internal.
  const user = await getSessionUser();

  const event: PlacementEvent = {
    id: uid(),
    placementId: placement.id,
    kind,
    memberId: user?.id, // internal only — cap/dedup; never exposed to advertiser
    occurredAt: Date.now(),
  };
  db().placementEvents.push(event);
  save();

  // Aggregate-only acknowledgement — no per-member data echoed back.
  return NextResponse.json({ ok: true, kind });
}
