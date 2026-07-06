"use client";

// A sponsored placement rendered as a feed card - deliberately distinct from
// peer posts (docs/15 §"The Community Ad Product"): sky-tint background, indigo
// hairline border, a bold SPONSORED chip and a "Sponsored by …" line up top, so
// it is never disguised as a member post. Member controls (dismiss / report)
// and coarse, best-effort event beacons live here; no per-member data leaves.

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Flag, X } from "lucide-react";

/** One placement as served by GET /api/placements/serve. */
export type Placement = {
  id: string;
  orgName: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  kind: string; // service | alumni_event | job_opening | program | announcement
};

export type PlacementEventKind = "impression" | "click" | "dismiss" | "report";

/** Recovery-relevant categories, labeled for members (never raw enum values). */
const KIND_LABELS: Record<string, string> = {
  alumni_event: "Alumni event",
  job_opening: "Job opening",
  program: "Program",
  service: "Service",
  announcement: "Announcement",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? "Announcement";
}

// Dedupe impression beacons per placement id for the life of the page, so the
// same card scrolling in and out (or remounting during interleave) fires once.
const impressed = new Set<string>();

/** Best-effort analytics beacon. Silent on failure - never blocks the member. */
async function postEvent(id: string, kind: PlacementEventKind): Promise<void> {
  try {
    await fetch(`/api/placements/${id}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
      keepalive: true, // survive the tab navigating away on a click
    });
  } catch {
    /* analytics are non-critical - swallow */
  }
}

export default function SponsoredCard({
  placement,
  onDismiss,
}: {
  placement: Placement;
  /** Notifies the feed so a dismissed placement is never reinserted. */
  onDismiss: (id: string) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [reported, setReported] = useState(false);

  /* - impression: fire once when the card first scrolls into view - */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (impressed.has(placement.id)) return;

    const fire = () => {
      if (impressed.has(placement.id)) return;
      impressed.add(placement.id);
      postEvent(placement.id, "impression");
    };

    if (typeof IntersectionObserver === "undefined") {
      fire(); // very old client - count it on mount
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            fire();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [placement.id]);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    postEvent(placement.id, "dismiss");
    onDismiss(placement.id);
  };

  const report = () => {
    setReported(true);
    postEvent(placement.id, "report"); // routes to moderation server-side
  };

  const onCtaClick = () => {
    postEvent(placement.id, "click");
  };

  return (
    <article
      ref={ref}
      aria-label={`Sponsored by ${placement.orgName}`}
      className="rounded-2xl border border-indigo-brand/30 bg-sky-tint px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
    >
      {/* label row - always visible, never disguised as a peer post */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-5 items-center rounded-full bg-indigo-brand px-2 text-[10px] font-extrabold uppercase tracking-[.08em] text-white">
          Sponsored
        </span>
        <span className="text-[12px] font-bold text-ink-600">
          Sponsored by {placement.orgName}
        </span>
      </div>

      {/* title + kind chip */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h3 className="text-[16px] font-extrabold text-ink-900">
          {placement.title}
        </h3>
        <span className="inline-flex h-5 items-center rounded-full bg-white px-2 text-[10px] font-extrabold uppercase tracking-[.03em] text-indigo-brand">
          {kindLabel(placement.kind)}
        </span>
      </div>

      {/* body */}
      <div className="mt-2 whitespace-pre-wrap text-[14px]/[1.6] font-medium text-ink-900">
        {placement.body}
      </div>

      {/* CTA */}
      {placement.ctaUrl && placement.ctaLabel && (
        <div className="mt-4">
          <a
            href={placement.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCtaClick}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-hover"
          >
            {placement.ctaLabel}
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* member controls - dismiss + report */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-sky-tint-2 pt-3">
        {reported ? (
          <span className="text-[13px] font-semibold text-indigo-brand">
            Thanks - we&apos;ll review this.
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-600 transition-colors hover:text-ink-900"
            >
              <X size={14} />
              Dismiss
            </button>
            <button
              type="button"
              onClick={report}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-600 transition-colors hover:text-ink-900"
            >
              <Flag size={14} />
              Report
            </button>
          </>
        )}
      </div>
    </article>
  );
}
