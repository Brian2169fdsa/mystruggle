import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { screenPlacement } from "@/app/lib/ad-policy";
import { withStats } from "@/app/api/placements/_lib";
import type { SponsoredPlacement } from "@/app/lib/types";

/**
 * /api/employer/promote - "Promote in community" (docs/17 gap closure).
 *
 * An employer hands an OPEN posting to the EXISTING sponsored-placement flow -
 * no duplicate ad path. POST creates a SponsoredPlacement (kind "job_opening",
 * orgId = the employer's user id) that enters the exact same review queue and
 * lifecycle every center placement uses: pending_review -> ms_admin approves
 * (running) or rejects. The same hard content-policy screen runs first.
 *
 * POST {postingId} -> 201 {placement}
 *   - employer session required (401), account must be VERIFIED (403 warm)
 *   - the posting must be the employer's own and status "open"
 *   - one live/pending promotion per posting (409 warm)
 * GET -> {promotions} - the employer's own job_opening placements with status
 *   + the same AGGREGATE-ONLY stats centers get (withStats; never per-member).
 */

/** A promotion is a plain SponsoredPlacement plus the posting it promotes -
 *  the extra field rides along in the JSON store and powers the dedupe gate
 *  and the dashboard's per-posting status chips. */
type PromotedPlacement = SponsoredPlacement & { postingId?: string };

/** Statuses that count as "this posting already has a promotion in flight":
 *  awaiting review, approved-but-not-flipped, live, or merely paused. Only
 *  draft/ended/rejected free the posting up for a fresh promotion. */
const ACTIVE_STATUSES: SponsoredPlacement["status"][] = [
  "pending_review",
  "approved",
  "running",
  "paused",
];

async function requireEmployer() {
  // Employer-scoped surface: the role check is direct (getRoleUser() would
  // let staff through, and staff own no postings here).
  const user = await getSessionUser();
  if (!user || user.role !== "employer") return null;
  return user;
}

function verificationStatusFor(employerId: string): string | undefined {
  const profile = db().employerProfiles.find(
    (p) => p.employerId === employerId
  );
  return profile?.verificationStatus;
}

/** Trim a posting description to a warm ~200-char placement body. */
function toPlacementBody(description: string): string {
  const clean = description.trim().replace(/\s+/g, " ");
  if (clean.length <= 200) return clean;
  const cut = clean.slice(0, 200);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export async function POST(req: Request) {
  const user = await requireEmployer();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in as an employer first." },
      { status: 401 }
    );
  }

  if (verificationStatusFor(user.id) !== "verified") {
    return NextResponse.json(
      {
        error:
          "Promotions open up once your account is verified. We review every employer so members can trust every sponsored role - hang tight, it's usually quick.",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const postingId =
    body && typeof body.postingId === "string" ? body.postingId : "";
  if (!postingId) {
    return NextResponse.json(
      { error: "Send { postingId } - the posting you want to promote." },
      { status: 400 }
    );
  }

  const d = db();
  const posting = d.jobPosts.find((j) => j.id === postingId);
  // A missing posting and someone else's posting both read as "not found" so
  // this API leaks nothing about other employers' postings.
  if (!posting || posting.employerId !== user.id) {
    return NextResponse.json({ error: "Posting not found." }, { status: 404 });
  }
  if (posting.status !== "open") {
    return NextResponse.json(
      { error: "Only an open posting can be promoted in the community." },
      { status: 400 }
    );
  }

  // Dedupe: one live/pending promotion per posting.
  const existing = (d.sponsoredPlacements as PromotedPlacement[]).find(
    (p) =>
      p.postingId === posting.id &&
      p.kind === "job_opening" &&
      ACTIVE_STATUSES.includes(p.status)
  );
  if (existing) {
    return NextResponse.json(
      {
        error:
          existing.status === "pending_review" || existing.status === "approved"
            ? "This role is already in ad review - it will appear in the community feed once approved."
            : "This role is already promoted in the community - one promotion per posting keeps the feed honest.",
      },
      { status: 409 }
    );
  }

  const title = `Now hiring - ${posting.title}`.slice(0, 120);
  const text = toPlacementBody(posting.description);
  const ctaUrl = "/jobs";

  // The SAME hard content-policy screen the center/admin path runs - off-
  // policy content never reaches the review queue from any door.
  const screen = screenPlacement(title, text, ctaUrl);
  if (!screen.ok) {
    return NextResponse.json({ error: screen.reason }, { status: 400 });
  }

  const placement: PromotedPlacement = {
    id: uid(),
    orgId: user.id, // the employer account is the buying org here
    orgName: user.company ?? user.name,
    title,
    body: text,
    ctaLabel: "See the role",
    ctaUrl,
    kind: "job_opening",
    audienceScope: "community",
    targeting: {}, // coarse-only schema; a job promo targets the whole community
    status: "pending_review", // straight into the existing ms_admin queue
    budgetCents: 0, // community promotion - no placement fee
    postingId: posting.id,
    createdAt: Date.now(),
  };
  d.sponsoredPlacements.push(placement);
  save();
  return NextResponse.json({ placement: withStats(placement) }, { status: 201 });
}

export async function GET() {
  const user = await requireEmployer();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in as an employer first." },
      { status: 401 }
    );
  }
  const promotions = (db().sponsoredPlacements as PromotedPlacement[])
    .filter((p) => p.orgId === user.id && p.kind === "job_opening")
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((p) => {
      // Aggregate counts only - the same withStats projection centers get.
      const { stats, ...rest } = withStats(p);
      return {
        id: rest.id,
        postingId: (rest as PromotedPlacement).postingId,
        title: rest.title,
        status: rest.status,
        rejectionReason: rest.rejectionReason,
        createdAt: rest.createdAt,
        stats,
      };
    });
  return NextResponse.json({ promotions });
}
