"use client";

/**
 * RailAdCard - a compact sponsored placement for the community rails.
 *
 * Slots pick from the SAME trust-gated inventory the feed uses
 * (/api/placements/serve - crisis exclusion, kill switch, and coarse
 * targeting all apply, so a member in a support state sees nothing here
 * either). Three instances share one fetch via a module-level cache.
 *
 *   slot="residential" - a residential recovery-center service ad
 *   slot="iop"         - an IOP recovery-center service ad
 *   slot="job"         - a second-chance employer hiring ad
 *
 * The CTA is an external link to the advertiser's own site (new tab).
 * Impression fires once per placement per page; clicks beacon the same
 * /api/placements/[id]/event endpoint the feed cards use.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2, Briefcase, HeartPulse } from "lucide-react";

interface ServedPlacement {
  id: string;
  orgName: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  kind: string;
}

export type RailAdSlot = "residential" | "iop" | "job";

/* Shared fetch - all rail slots on the page reuse one request. */
let servedCache: Promise<ServedPlacement[]> | null = null;
function fetchServed(): Promise<ServedPlacement[]> {
  servedCache ??= fetch("/api/placements/serve")
    .then((r) => (r.ok ? r.json() : { placements: [] }))
    .then((j) => (Array.isArray(j.placements) ? j.placements : []))
    .catch(() => []);
  return servedCache;
}

function pickForSlot(
  slot: RailAdSlot,
  placements: ServedPlacement[]
): ServedPlacement | null {
  if (slot === "job") {
    return placements.find((p) => p.kind === "job_opening") ?? null;
  }
  const programs = placements.filter((p) => p.kind === "program");
  const isIop = (p: ServedPlacement) =>
    /\bIOP\b|intensive outpatient/i.test(`${p.title} ${p.body} ${p.orgName}`);
  const isResidential = (p: ServedPlacement) =>
    /residential/i.test(`${p.title} ${p.body} ${p.orgName}`);
  if (slot === "iop") return programs.find(isIop) ?? null;
  return programs.find((p) => isResidential(p) && !isIop(p)) ?? null;
}

const sentImpressions = new Set<string>();
function beacon(id: string, kind: "impression" | "click") {
  if (kind === "impression") {
    if (sentImpressions.has(id)) return;
    sentImpressions.add(id);
  }
  fetch(`/api/placements/${id}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
    keepalive: true,
  }).catch(() => {});
}

const SLOT_ICON = {
  residential: HeartPulse,
  iop: Building2,
  job: Briefcase,
} as const;

/** Advertiser creative per slot - user-provided images in /public. */
const SLOT_IMAGE: Record<RailAdSlot, string> = {
  residential: "/ad-desert-bloom.png",
  iop: "/ad-south-phoenix.png",
  job: "/ad-sunvalley.png",
};

export default function RailAdCard({ slot }: { slot: RailAdSlot }) {
  const [ad, setAd] = useState<ServedPlacement | null>(null);
  const seenRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchServed().then((placements) => {
      if (alive) setAd(pickForSlot(slot, placements));
    });
    return () => {
      alive = false;
    };
  }, [slot]);

  useEffect(() => {
    if (ad && !seenRef.current) {
      seenRef.current = true;
      beacon(ad.id, "impression");
    }
  }, [ad]);

  // Nothing served (signed out, crisis exclusion, kill switch, or no match):
  // the rail simply tightens up - never an empty ad shell.
  if (!ad) return null;

  const Icon = SLOT_ICON[slot];
  const external = /^https?:\/\//i.test(ad.ctaUrl);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-ink-400">
          Sponsored
        </span>
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-sky-tint px-2 text-[10.5px] font-bold text-blue-primary">
          <Icon size={11} />
          {slot === "job" ? "Hiring" : "Recovery care"}
        </span>
      </div>

      <div className="mt-2 text-[11.5px] font-bold uppercase tracking-[.08em] text-indigo-brand">
        {ad.orgName}
      </div>
      <h3 className="mt-1 text-[14.5px]/[1.35] font-extrabold text-ink-900">
        {ad.title}
      </h3>
      <p className="mt-1.5 line-clamp-3 text-[12.5px]/[1.55] text-ink-600">
        {ad.body}
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SLOT_IMAGE[slot]}
        alt={`${ad.orgName} - sponsored`}
        className="mt-3 aspect-[16/10] w-full rounded-xl object-cover"
        loading="lazy"
      />

      <a
        href={ad.ctaUrl}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={() => beacon(ad.id, "click")}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-blue-primary text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
      >
        {ad.ctaLabel}
        {external && <ArrowUpRight size={14} />}
      </a>
    </section>
  );
}
