import { NextResponse } from "next/server";
import { db, isAdKillSwitchOn, getAdConfig } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { isCrisisText } from "@/app/lib/crisis";
import { toServed } from "../_lib";
import type { SponsoredPlacement, CarePhase } from "@/app/lib/types";

/**
 * Serve sponsored placements into a viewer's feed. Public-safe shape only:
 * {id, orgName, title, body, ctaLabel, ctaUrl, kind}. Works signed-out
 * (returns []). THREE TRUST RULES ARE ENFORCED HERE, IN CODE - they are the
 * product, not policy prose:
 *
 *   (a) CRISIS / AT-RISK EXCLUSION - a member who has recently posted crisis
 *       content (any of their posts is status "flagged" AND isCrisisText) is
 *       in a support state, never an ad state. They get [] - support
 *       resources are surfaced elsewhere, sponsored content never.
 *   (b) FREQUENCY CAP - we return `everyN`, the spacing the feed must honor
 *       (≤ 1 sponsored item per everyN organic posts).
 *   (c) COARSE TARGETING MATCH ONLY - a placement is eligible only if its
 *       coarse, non-clinical targeting (metro / phase / circle / community)
 *       matches the viewer. There is no health/diagnosis targeting to match on.
 *
 * Plus a platform-wide KILL SWITCH: when engaged, /serve returns [] for
 * everyone, immediately.
 */
export async function GET() {
  // Frequency cap: the feed shows AT MOST one sponsored item per this many
  // organic posts, so the community stays a recovery space first (docs/15 §B/C).
  // ms_admin configures it via /api/admin/ad-config; the default is 5.
  const everyN = getAdConfig().frequencyEveryN;
  const empty = NextResponse.json({ placements: [], everyN });

  // KILL SWITCH - platform-wide off switch beats everything else.
  if (isAdKillSwitchOn()) return empty;

  // Signed-out viewers see no sponsored content (and no targeting exists).
  const user = await getSessionUser();
  if (!user) return empty;

  const d = db();

  // ── RULE (a): crisis / at-risk exclusion ────────────────────────────
  // If ANY of the viewer's own posts is held as "flagged" AND actually reads
  // as crisis language, they are in a support state. Return no ads at all.
  const inCrisis = d.posts.some(
    (p) =>
      p.authorId === user.id &&
      p.status === "flagged" &&
      isCrisisText(p.body)
  );
  if (inCrisis) return empty;

  // ── viewer context for RULE (c): coarse, non-clinical attributes only ─
  const viewerCity =
    d.centers.find((c) => c.id === user.centerId)?.city ?? "";
  // Latest care phase from the continuum (coarse care stage - NOT a diagnosis).
  const viewerPhase: CarePhase | undefined = d.careEpisodes
    .filter((e) => e.memberId === user.id)
    .sort((a, b) => b.phaseChangedAt - a.phaseChangedAt)[0]?.carePhase;
  const viewerCircles = new Set(
    d.circleMemberships
      .filter((m) => m.memberId === user.id)
      .map((m) => m.circleId)
  );

  // Coarse geo match: same region (state) is enough - metro-level, never finer.
  const region = (s: string): string =>
    s.split(",").pop()?.trim().toLowerCase() ?? "";
  const sameRegion = (a: string, b: string): boolean =>
    !!a && !!b && region(a) === region(b);

  const matches = (p: SponsoredPlacement): boolean => {
    const t = p.targeting;
    switch (p.audienceScope) {
      case "community":
        return true; // whole community
      case "circle":
        return !!t.circleId && viewerCircles.has(t.circleId);
      case "phase":
        return !!t.phase && !!viewerPhase && t.phase === viewerPhase;
      case "geo":
        return !!t.metro && sameRegion(t.metro, viewerCity);
      default:
        return false;
    }
  };

  // Status "running" is the source of truth for "live" - an ms_admin approval
  // moved it there and a pause/end moves it out. We deliberately do NOT gate on
  // startsAt/endsAt here: the deterministic seed is anchored to a fixed EPOCH,
  // so wall-clock window math would drift; scheduling is display metadata, the
  // lifecycle status is the real switch.
  const placements = d.sponsoredPlacements
    .filter((p) => p.status === "running" && matches(p))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(toServed);

  return NextResponse.json({ placements, everyN });
}
