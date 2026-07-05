"use client";

import { useCallback, useEffect, useState } from "react";
import { CARD, SKELETON } from "./types";

/**
 * Center subscription / billing view (docs/15 §C, requirements/12 §C).
 * A PREVIEW STUB — billing is handled by the My Struggle team, so there is no
 * real payment here. It mirrors the marketing /centers pricing tiers, shows the
 * center's current plan + add-ons, and attributes the center's demo leads by
 * source (read live from GET /api/leads). "Contact us to change plan" is a
 * mailto — the same convention the /centers page uses.
 */

const CONTACT = "mailto:info@themystruggles.com";

/** Mirrors the three /centers pricing tiers (app/centers/page.tsx). */
const TIERS = [
  {
    name: "Platform",
    tagline: "Deliver your programming and run your center.",
    current: false,
  },
  {
    name: "Platform + Continuum",
    tagline: "Stay connected before, during, and long after care.",
    current: true,
  },
  {
    name: "Enterprise + Outcomes Licensing",
    tagline: "Prove what works to funders and partners.",
    current: false,
  },
];

/** Add-ons available on any tier. */
const ADDONS = [
  {
    name: "Community Ad Product",
    note: "Sponsored placements in the recovery community feed.",
    active: true,
  },
  {
    name: "Outcomes Licensing",
    note: "De-identified outcomes data + grant-ready reports.",
    active: false,
  },
];

type Lead = { source?: string };

export default function Billing() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [leadsError, setLeadsError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { leads: Lead[] };
      setLeads(data.leads ?? []);
      setLeadsError(false);
    } catch {
      setLeadsError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group the center's demo leads by their capture source, highest first.
  const bySource = (() => {
    const counts = new Map<string, number>();
    for (const l of leads ?? []) {
      const key = (l.source ?? "unknown").trim() || "unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const totalLeads = leads?.length ?? 0;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Billing{" "}
        <span className="text-[15px] font-semibold text-ink-600">
          · subscription &amp; add-ons
        </span>
      </div>
      <p className="-mt-2 text-[13px] font-medium text-ink-400">
        Billing is managed by our team — this is a preview. No payment is
        processed here.
      </p>

      {/* ── CURRENT PLAN ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border-[1.5px] border-blue-primary bg-sky-tint px-[30px] py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
            Current plan
          </div>
          <span className="inline-flex h-[24px] items-center rounded-full bg-success px-3 text-[11px] font-extrabold text-white">
            ACTIVE
          </span>
        </div>
        <div className="mt-2 text-[22px] font-extrabold tracking-[-0.01em] text-ink-900">
          Platform + Continuum
        </div>
        <div className="mt-1 text-[14px]/[1.6] font-medium text-ink-600">
          Deliver your programming and stay connected across the continuum —
          before, during, and long after care.
        </div>
        <a
          href={CONTACT}
          className="mt-4 inline-flex h-11 items-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white hover:bg-blue-hover"
        >
          Contact us to change plan
        </a>
      </div>

      {/* ── PLAN TIERS (mirrored from the /centers page) ─────────────── */}
      <div className="text-[15px] font-extrabold text-ink-900">Plans</div>
      <div className="grid gap-[18px] lg:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={
              (t.current
                ? "border-[1.5px] border-blue-primary "
                : "border-[1.5px] border-transparent ") +
              CARD +
              " flex flex-col px-6 py-6"
            }
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[16px] font-extrabold text-ink-900">
                {t.name}
              </div>
              {t.current && (
                <span className="inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[11px] font-bold text-blue-primary">
                  Current
                </span>
              )}
            </div>
            <div className="mt-2 flex-1 text-[13px]/[1.6] font-medium text-ink-600">
              {t.tagline}
            </div>
            {t.current ? (
              <div className="mt-4 text-[13px] font-bold text-ink-400">
                Your active plan
              </div>
            ) : (
              <a
                href={CONTACT}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full border-[1.5px] border-blue-primary px-6 text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
              >
                Contact us to change plan
              </a>
            )}
          </div>
        ))}
      </div>

      {/* ── ADD-ONS ──────────────────────────────────────────────────── */}
      <div className="text-[15px] font-extrabold text-ink-900">Add-ons</div>
      <div className={CARD + " px-[30px] py-2"}>
        {ADDONS.map((a, i) => (
          <div
            key={a.name}
            className={
              "flex flex-wrap items-center gap-3 py-4 " +
              (i > 0 ? "border-t border-sky-tint-2" : "")
            }
          >
            <div className="flex-1">
              <div className="text-[14px] font-bold text-ink-900">{a.name}</div>
              <div className="text-[12.5px]/[1.6] font-medium text-ink-600">
                {a.note}
              </div>
            </div>
            {a.active ? (
              <span className="inline-flex h-[26px] items-center rounded-full bg-success px-3 text-[11px] font-extrabold text-white">
                ACTIVE
              </span>
            ) : (
              <a
                href={CONTACT}
                className="inline-flex h-9 items-center rounded-full border-[1.5px] border-blue-primary px-5 text-[12px] font-bold text-blue-primary hover:bg-sky-tint"
              >
                Add
              </a>
            )}
          </div>
        ))}
      </div>

      {/* ── LEAD SOURCE ATTRIBUTION ──────────────────────────────────── */}
      <div className="text-[15px] font-extrabold text-ink-900">
        Lead source attribution
      </div>
      <div className={CARD + " px-[30px] py-6"}>
        <div className="text-[13px]/[1.6] font-medium text-ink-600">
          Where this center&apos;s demo requests came from
          {totalLeads > 0 && (
            <>
              {" "}
              · {totalLeads} total
            </>
          )}
          .
        </div>

        {!leads && !leadsError && (
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={SKELETON + " h-[34px]"} />
            ))}
          </div>
        )}

        {leadsError && (
          <div className="mt-4 text-[13px] font-semibold text-ink-600">
            Couldn&apos;t load lead sources.
          </div>
        )}

        {leads && leads.length === 0 && (
          <div className="mt-4 text-[13px] font-semibold text-ink-400">
            No demo requests captured yet.
          </div>
        )}

        {leads && leads.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {bySource.map(([source, count]) => {
              const pct = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
              return (
                <div key={source} className="flex items-center gap-3">
                  <div className="w-[160px] flex-none truncate text-[13px] font-bold text-ink-900">
                    {source}
                  </div>
                  <div className="h-[10px] flex-1 overflow-hidden rounded-full bg-sky-tint">
                    <div
                      className="h-full rounded-full bg-blue-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-[64px] flex-none text-right text-[12.5px] font-semibold text-ink-600">
                    {count} · {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
