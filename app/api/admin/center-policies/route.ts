import { NextResponse } from "next/server";
import { db, save } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { CenterPolicy } from "@/app/lib/types";

/**
 * Center policy console (staff-only, scoped to the signed-in staffer's own
 * center). A CenterPolicy is the center's communication rulebook: whether
 * residential/detox members may post in the community, quiet hours for
 * notifications, and portal-first early phases.
 *
 * GET   - { policy } for my center; creates a default all-permissive row if
 *         the center has none yet (defensive - seeds may predate policies).
 * PATCH - { communityAccessDuringResidential?, quietHoursStart?,
 *           quietHoursEnd?, portalOnlyEarlyPhase? } → { policy }.
 *         Hours are integers 0-23, or null to clear. Stamps updatedAt/updatedBy.
 */

/** Defensive accessor - the centerPolicies array is a recent store addition,
 *  so tolerate a cached db.json that predates it. */
function policyList(): CenterPolicy[] {
  const d = db() as { centerPolicies?: CenterPolicy[] };
  d.centerPolicies ??= [];
  return d.centerPolicies;
}

/** The center's policy row, creating a default all-permissive one if absent. */
function ensurePolicy(centerId: string): CenterPolicy {
  const list = policyList();
  let policy = list.find((p) => p.centerId === centerId);
  if (!policy) {
    policy = {
      centerId,
      communityAccessDuringResidential: true,
      portalOnlyEarlyPhase: false,
      updatedAt: Date.now(),
    };
    list.push(policy);
    save();
  }
  return policy;
}

export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  if (!staff.centerId) {
    return NextResponse.json(
      { error: "Your staff account isn't linked to a center yet." },
      { status: 400 }
    );
  }
  return NextResponse.json({ policy: ensurePolicy(staff.centerId) });
}

export async function PATCH(req: Request) {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  if (!staff.centerId) {
    return NextResponse.json(
      { error: "Your staff account isn't linked to a center yet." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Validate everything BEFORE touching the row - a bad hour must not leave
  // a half-applied patch behind.
  const patch: {
    communityAccessDuringResidential?: boolean;
    portalOnlyEarlyPhase?: boolean;
    quietHoursStart?: number | null;
    quietHoursEnd?: number | null;
  } = {};

  for (const key of [
    "communityAccessDuringResidential",
    "portalOnlyEarlyPhase",
  ] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "boolean") {
        return NextResponse.json(
          { error: `${key} must be true or false.` },
          { status: 400 }
        );
      }
      patch[key] = body[key];
    }
  }

  for (const key of ["quietHoursStart", "quietHoursEnd"] as const) {
    if (body[key] !== undefined) {
      if (body[key] === null) {
        patch[key] = null; // null clears the hour
        continue;
      }
      const n = Number(body[key]);
      if (!Number.isInteger(n) || n < 0 || n > 23) {
        return NextResponse.json(
          { error: `${key} must be a whole hour between 0 and 23, or null to clear.` },
          { status: 400 }
        );
      }
      patch[key] = n;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      {
        error:
          "Send at least one of communityAccessDuringResidential, quietHoursStart, quietHoursEnd, portalOnlyEarlyPhase.",
      },
      { status: 400 }
    );
  }

  const policy = ensurePolicy(staff.centerId);
  if (patch.communityAccessDuringResidential !== undefined) {
    policy.communityAccessDuringResidential = patch.communityAccessDuringResidential;
  }
  if (patch.portalOnlyEarlyPhase !== undefined) {
    policy.portalOnlyEarlyPhase = patch.portalOnlyEarlyPhase;
  }
  if (patch.quietHoursStart !== undefined) {
    if (patch.quietHoursStart === null) delete policy.quietHoursStart;
    else policy.quietHoursStart = patch.quietHoursStart;
  }
  if (patch.quietHoursEnd !== undefined) {
    if (patch.quietHoursEnd === null) delete policy.quietHoursEnd;
    else policy.quietHoursEnd = patch.quietHoursEnd;
  }
  policy.updatedAt = Date.now();
  policy.updatedBy = staff.id;
  save();

  return NextResponse.json({ policy });
}
