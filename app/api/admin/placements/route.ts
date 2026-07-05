import { NextResponse } from "next/server";
import { db, isAdKillSwitchOn, setAdKillSwitch } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import { withStats } from "@/app/api/placements/_lib";

/**
 * ms_admin placement console. There is no separate "ms_admin" role in this
 * codebase, so STAFF acts as ms_admin (getRoleUser() with no args = staff-only;
 * staff supervise every surface).
 *
 * GET  — the review queue: every placement that is pending_review OR has been
 *        reported (aggregate report count > 0), newest first, with aggregate
 *        stats. Plus the current kill-switch state.
 * POST — {killSwitch: boolean} toggles the platform-wide ad kill switch that
 *        makes /api/placements/serve return [] for everyone.
 */
export async function GET() {
  const admin = await getRoleUser();
  if (!admin) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  const queue = db()
    .sponsoredPlacements.map(withStats)
    .filter((p) => p.status === "pending_review" || p.stats.report > 0)
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ placements: queue, killSwitch: isAdKillSwitchOn() });
}

export async function POST(req: Request) {
  const admin = await getRoleUser();
  if (!admin) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.killSwitch !== "boolean") {
    return NextResponse.json(
      { error: "Send { killSwitch: boolean }." },
      { status: 400 }
    );
  }
  setAdKillSwitch(body.killSwitch);
  return NextResponse.json({ ok: true, killSwitch: isAdKillSwitchOn() });
}
