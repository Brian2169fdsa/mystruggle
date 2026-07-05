// Shared helpers for the community ad product API. AGGREGATE-ONLY analytics:
// the functions here NEVER return per-member rows — memberId on a
// PlacementEvent is internal (frequency cap + dedup) and must never reach an
// advertiser-facing read. This is the code-level guarantee behind the trust
// rule "analytics are aggregate; no per-member profile is exposed."

import { db } from "@/app/lib/store";
import type {
  SponsoredPlacement,
  PlacementEvent,
  PlacementKind,
} from "@/app/lib/types";

/** Aggregate counts for one placement — the ONLY analytics shape an advertiser
 *  (center) ever sees. No memberId, no per-event rows, no timestamps. */
export interface PlacementStats {
  impressions: number;
  clicks: number;
  ctr: number; // clicks / impressions, 0 when no impressions (0..1)
  dismiss: number;
  report: number;
}

/** Roll a placement's events up to aggregate counts. */
export function aggregate(placementId: string): PlacementStats {
  const events = db().placementEvents.filter(
    (e) => e.placementId === placementId
  );
  const count = (k: PlacementEvent["kind"]): number =>
    events.filter((e) => e.kind === k).length;
  const impressions = count("impression");
  const clicks = count("click");
  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    dismiss: count("dismiss"),
    report: count("report"),
  };
}

/** Advertiser-facing projection of a placement: the full record PLUS aggregate
 *  stats. Safe to return to the owning center — carries no per-member data. */
export function withStats(p: SponsoredPlacement): SponsoredPlacement & {
  stats: PlacementStats;
} {
  return { ...p, stats: aggregate(p.id) };
}

/** Public-safe shape shown to a member in the feed — "Sponsored by [orgName]".
 *  Deliberately drops targeting, budget, status, and every internal field. */
export interface ServedPlacement {
  id: string;
  orgName: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  kind: PlacementKind;
}

export function toServed(p: SponsoredPlacement): ServedPlacement {
  return {
    id: p.id,
    orgName: p.orgName,
    title: p.title,
    body: p.body,
    ctaLabel: p.ctaLabel,
    ctaUrl: p.ctaUrl,
    kind: p.kind,
  };
}

export const PLACEMENT_KINDS: PlacementKind[] = [
  "service",
  "alumni_event",
  "job_opening",
  "program",
  "announcement",
];
