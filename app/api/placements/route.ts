import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import { screenPlacement } from "@/app/lib/ad-policy";
import { withStats, PLACEMENT_KINDS } from "../placements/_lib";
import type {
  SponsoredPlacement,
  PlacementKind,
  AudienceScope,
  PlacementTargeting,
} from "@/app/lib/types";

const SCOPES: AudienceScope[] = ["community", "geo", "circle", "phase"];

/** Build a coarse, NON-CLINICAL targeting object from request input. Only
 *  metro/phase/interestTags/circleId are ever read — there is no code path
 *  and no schema field for health/diagnosis/substance targeting, so a center
 *  cannot express it even if they tried. */
function sanitizeTargeting(raw: unknown): PlacementTargeting {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: PlacementTargeting = {};
  if (typeof t.metro === "string" && t.metro.trim())
    out.metro = t.metro.trim().slice(0, 80);
  if (typeof t.phase === "string")
    out.phase = t.phase as PlacementTargeting["phase"];
  if (typeof t.circleId === "string" && t.circleId.trim())
    out.circleId = t.circleId.trim().slice(0, 80);
  if (Array.isArray(t.interestTags))
    out.interestTags = t.interestTags
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim().slice(0, 40))
      .slice(0, 8);
  return out;
}

/**
 * Center staff placement API (staff acts as the center's ad manager).
 * POST — two modes:
 *   • create: body without `action` → validate + screenPlacement → new
 *     pending_review (or draft) placement for the staff's own centerId.
 *   • lifecycle (PATCH-style): body {id, action:"submit"|"pause"|"resume"} →
 *     move an owned placement through its lifecycle.
 * GET — the staff's own center's placements + AGGREGATE event counts only.
 */
export async function POST(req: Request) {
  const staff = await getRoleUser(); // no-arg = staff-only (staff = the center)
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  if (!staff.centerId) {
    return NextResponse.json(
      { error: "Your staff account isn't linked to a center." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ── lifecycle branch ────────────────────────────────────────────────
  if (typeof body.action === "string") {
    const id = typeof body.id === "string" ? body.id : "";
    const placement = db().sponsoredPlacements.find((p) => p.id === id);
    if (!placement) {
      return NextResponse.json({ error: "Placement not found." }, { status: 404 });
    }
    if (placement.orgId !== staff.centerId) {
      return NextResponse.json(
        { error: "That placement belongs to another center." },
        { status: 403 }
      );
    }
    switch (body.action) {
      case "submit":
        if (placement.status !== "draft") {
          return NextResponse.json(
            { error: "Only a draft can be submitted for review." },
            { status: 400 }
          );
        }
        placement.status = "pending_review";
        break;
      case "pause":
        if (placement.status !== "running") {
          return NextResponse.json(
            { error: "Only a running placement can be paused." },
            { status: 400 }
          );
        }
        placement.status = "paused";
        break;
      case "resume":
        if (placement.status !== "paused") {
          return NextResponse.json(
            { error: "Only a paused placement can be resumed." },
            { status: 400 }
          );
        }
        placement.status = "running";
        break;
      default:
        return NextResponse.json(
          { error: "action must be submit, pause, or resume." },
          { status: 400 }
        );
    }
    save();
    return NextResponse.json({ placement: withStats(placement) });
  }

  // ── create branch ───────────────────────────────────────────────────
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 1000) : "";
  const ctaLabel =
    typeof body.ctaLabel === "string" ? body.ctaLabel.trim().slice(0, 40) : "";
  const ctaUrl = typeof body.ctaUrl === "string" ? body.ctaUrl.trim().slice(0, 500) : "";
  const kind: PlacementKind = PLACEMENT_KINDS.includes(body.kind)
    ? body.kind
    : "service";
  const audienceScope: AudienceScope = SCOPES.includes(body.audienceScope)
    ? body.audienceScope
    : "community";
  const targeting = sanitizeTargeting(body.targeting);

  const errors: Record<string, string> = {};
  if (!title) errors.title = "Give your placement a title.";
  if (!text) errors.body = "Write the placement body.";
  if (!ctaLabel) errors.ctaLabel = "Add a call-to-action label.";
  if (!/^https?:\/\/.+/.test(ctaUrl)) errors.ctaUrl = "Add a valid http(s) link.";
  if (Object.keys(errors).length) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", errors },
      { status: 400 }
    );
  }

  // HARD CONTENT POLICY — the stopgap keyword screen (a Claude review gate is
  // the future upgrade). Off-policy content (gambling/alcohol/predatory/MLM/
  // scam) is rejected before the placement ever enters the review queue.
  const screen = screenPlacement(title, text, ctaUrl);
  if (!screen.ok) {
    return NextResponse.json({ error: screen.reason }, { status: 400 });
  }

  // Draft when explicitly asked; otherwise straight into the review queue.
  const asDraft = body.status === "draft";
  const now = Date.now();
  const placement: SponsoredPlacement = {
    id: uid(),
    orgId: staff.centerId,
    orgName: db().centers.find((c) => c.id === staff.centerId)?.name ?? staff.name,
    title,
    body: text,
    ctaLabel,
    ctaUrl,
    kind,
    audienceScope,
    targeting,
    status: asDraft ? "draft" : "pending_review",
    startsAt: typeof body.startsAt === "number" ? body.startsAt : undefined,
    endsAt: typeof body.endsAt === "number" ? body.endsAt : undefined,
    budgetCents: typeof body.budgetCents === "number" ? body.budgetCents : undefined,
    createdAt: now,
  };
  db().sponsoredPlacements.push(placement);
  save();
  return NextResponse.json({ placement: withStats(placement) }, { status: 201 });
}

/** The staff's own center's placements + aggregate analytics. Never returns
 *  another center's placements, and never per-member event rows. */
export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  const placements = db()
    .sponsoredPlacements.filter((p) => p.orgId === staff.centerId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(withStats);
  return NextResponse.json({ placements });
}
