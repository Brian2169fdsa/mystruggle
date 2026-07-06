import { NextResponse } from "next/server";
import { getRoleUser } from "@/app/lib/auth";
import { buildCenter, buildFrame, buildLicensed, type Plane } from "./compute";

/**
 * GET /api/outcomes?plane=center|licensed  (staff only)
 *
 * The licensed OUTCOMES DATA PRODUCT (docs/14 § data product; requirements/11
 * §H). Three computed "materialized views" over the continuum stream:
 *   • mvContinuumScore — 0–100 rolling engagement index → DISTRIBUTION
 *   • mvCareOutcomes   — phase-transition rates, completion by LOC,
 *                        retention-in-recovery 30/60/90/180/365d,
 *                        recovery-capital pre→during→post delta
 *   • mvEfficacy       — engagement-quartile → outcome (engagement = efficacy)
 *
 * TWO DATA PLANES — the P0 trust boundary, enforced in code (see compute.ts):
 *   • plane=center   — identified, consented, single-center. Staff see
 *                      identifiable member rows for THEIR OWN center only.
 *   • plane=licensed — de-identified, aggregated. ONLY aggregate counters; k≥11
 *                      minimum cohort; no name/id/memberNumber/slug can appear.
 *
 * GOVERNANCE (docs/10 §6): licensing outcomes to a third party is BLOCKED until
 * the counsel items are checked. This route SURFACES that gate in the payload;
 * it does not bypass it.
 */
export async function GET(req: Request) {
  const staff = await getRoleUser(); // no roles → staff only
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const planeParam = new URL(req.url).searchParams.get("plane") ?? "center";
  if (planeParam !== "center" && planeParam !== "licensed") {
    return NextResponse.json(
      { error: 'plane must be "center" or "licensed".' },
      { status: 400 }
    );
  }
  const plane: Plane = planeParam;

  const frame = buildFrame();
  const payload =
    plane === "licensed"
      ? buildLicensed(frame)
      : buildCenter(frame, staff.centerId);

  return NextResponse.json(payload);
}
