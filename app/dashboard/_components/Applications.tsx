"use client";

import { useCallback, useEffect, useState } from "react";
import type { MentorApplication } from "../../lib/types";
import { CARD, SKELETON, relTime } from "./types";

const STATUS_CHIP: Record<
  MentorApplication["status"],
  { label: string; bg: string; color: string }
> = {
  new: { label: "NEW", bg: "#EAF2FC", color: "#2E7CD6" },
  contacted: { label: "CONTACTED", bg: "#FFF9EC", color: "#A16207" },
  approved: { label: "✓ APPROVED", bg: "#E8F8F0", color: "#12B76A" },
};

/**
 * Mentor application queue - website intake awaiting staff review.
 * Self-fetching (GET /api/mentor-applications, staff cookie), polls every
 * 15s, advances status new → contacted → approved via PUT.
 */
export default function Applications() {
  const [apps, setApps] = useState<MentorApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mentor-applications");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { applications: MentorApplication[] };
      setApps(data.applications);
      setError(null);
    } catch {
      setError("Couldn't load applications.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  async function advance(id: string, status: "contacted" | "approved") {
    // Optimistic flip; the next poll reconciles with the server.
    setApps((prev) =>
      prev ? prev.map((a) => (a.id === id ? { ...a, status } : a)) : prev
    );
    try {
      const res = await fetch("/api/mentor-applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      load(); // roll back to server truth
    }
  }

  const newCount = (apps ?? []).filter((a) => a.status === "new").length;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Mentor applications{" "}
        <span className="text-[15px] font-semibold text-ink-600">
          · {newCount} new
        </span>
      </div>

      {!apps &&
        !error &&
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={SKELETON + " h-[150px]"} />
        ))}

      {error && (
        <div className={CARD + " px-[30px] py-8 text-center"}>
          <div className="text-[13px] font-semibold text-ink-600">{error}</div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              load();
            }}
            className="mt-3 inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-6 text-[13px] font-bold text-blue-primary"
          >
            Retry
          </button>
        </div>
      )}

      {apps && !error && apps.length === 0 && (
        <div className={CARD + " px-[30px] py-8 text-center text-[13px] font-semibold text-ink-400"}>
          No applications yet - share the Become a Mentor page.
        </div>
      )}

      {!error &&
        (apps ?? []).map((a) => {
          const chip = STATUS_CHIP[a.status];
          return (
            <div key={a.id} className={CARD + " px-[30px] py-6"}>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                    {a.name}
                    <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[11px] font-bold text-ink-600">
                      {a.availability}
                    </span>
                  </div>
                  <div className="text-xs text-ink-600">
                    applied {relTime(a.createdAt)} ·{" "}
                    <a
                      href={`tel:${a.phone}`}
                      className="font-semibold text-blue-primary hover:underline"
                    >
                      {a.phone}
                    </a>{" "}
                    ·{" "}
                    <a
                      href={`mailto:${a.email}`}
                      className="font-semibold text-blue-primary hover:underline"
                    >
                      {a.email}
                    </a>
                  </div>
                </div>
                <span
                  className="inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-extrabold"
                  style={{ background: chip.bg, color: chip.color }}
                >
                  {chip.label}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {a.areas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[12px] font-bold text-blue-primary"
                  >
                    {area}
                  </span>
                ))}
              </div>

              {a.story && (
                <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] font-medium text-ink-900">
                  &quot;{a.story}&quot;
                </div>
              )}

              {a.status !== "approved" && (
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  {a.status === "new" && (
                    <button
                      type="button"
                      onClick={() => advance(a.id, "contacted")}
                      className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white hover:bg-blue-hover"
                    >
                      Mark contacted
                    </button>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => advance(a.id, "approved")}
                      className="inline-flex h-11 cursor-pointer items-center rounded-full bg-success px-6 text-[13px] font-bold text-white"
                    >
                      ✓ Approve
                    </button>
                    <div className="mt-1.5 text-[11px] text-ink-400">
                      Approval creates their mentor account during onboarding -
                      manual for now
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
