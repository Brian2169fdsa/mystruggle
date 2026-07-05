import { NextResponse } from "next/server";
import { getAdConfig, setAdConfig } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { AdConfig } from "@/app/lib/store";

/**
 * ms_admin content-policy + frequency config (docs/15 §C). There is no separate
 * "ms_admin" role in this codebase, so STAFF acts as ms_admin (getRoleUser()
 * with no args = staff-only). Mirrors /api/admin/placements' auth shape.
 *
 * GET  — the current config: { frequencyEveryN, blockedTerms }.
 * POST — { frequencyEveryN?, blockedTerms? }; validates + persists via the store
 *        helper. frequencyEveryN is read live by /api/placements/serve. The
 *        blockedTerms are stored for a future merge into ad-policy.ts's fixed
 *        content screen (that screen is NOT rewired this pass).
 */
export async function GET() {
  const admin = await getRoleUser();
  if (!admin) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  return NextResponse.json(getAdConfig());
}

export async function POST(req: Request) {
  const admin = await getRoleUser();
  if (!admin) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Partial<AdConfig> = {};

  if (body.frequencyEveryN !== undefined) {
    const n = Number(body.frequencyEveryN);
    if (!Number.isInteger(n) || n < 2 || n > 20) {
      return NextResponse.json(
        { error: "frequencyEveryN must be a whole number between 2 and 20." },
        { status: 400 }
      );
    }
    patch.frequencyEveryN = n;
  }

  if (body.blockedTerms !== undefined) {
    if (!Array.isArray(body.blockedTerms)) {
      return NextResponse.json(
        { error: "blockedTerms must be an array of short strings." },
        { status: 400 }
      );
    }
    const raw = body.blockedTerms as unknown[];
    const terms = raw
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x.length > 0 && x.length <= 40);
    patch.blockedTerms = Array.from(new Set(terms)).slice(0, 50);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Send frequencyEveryN and/or blockedTerms." },
      { status: 400 }
    );
  }

  return NextResponse.json(setAdConfig(patch));
}
