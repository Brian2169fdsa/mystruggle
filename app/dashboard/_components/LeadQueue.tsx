"use client";

import { useCallback, useEffect, useState } from "react";
import { CARD, SKELETON, relTime } from "./types";

/** A demo request captured on the marketing "For Recovery Centers" page. */
type Lead = {
  id: string;
  orgName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  message?: string;
  source?: string;
  status: string;
  createdAt?: number | string;
};

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  new: { label: "NEW", bg: "#EAF2FC", color: "#2E7CD6" },
  contacted: { label: "CONTACTED", bg: "#FFF9EC", color: "#A16207" },
  closed: { label: "CLOSED", bg: "#F1F5F9", color: "#4B5563" },
};

function chipFor(status: string) {
  return STATUS_CHIP[status.toLowerCase()] ?? STATUS_CHIP.new;
}

function toTs(v: number | string | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(n) ? n : null;
}

export default function LeadQueue() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [apiPending, setApiPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.status === 404) {
        setApiPending(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { leads: Lead[] };
      setLeads(data.leads ?? []);
      setApiPending(false);
      setError(null);
    } catch {
      setError("Couldn't load demo requests.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, apiPending ? 8_000 : 20_000);
    return () => clearInterval(t);
  }, [load, apiPending]);

  async function advance(id: string, status: "contacted" | "closed") {
    // Optimistic flip; the next poll reconciles with the server.
    setLeads((prev) =>
      prev ? prev.map((l) => (l.id === id ? { ...l, status } : l)) : prev
    );
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.status === 404) {
        setApiPending(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      load(); // roll back to server truth
    }
  }

  const newCount = (leads ?? []).filter((l) => l.status.toLowerCase() === "new")
    .length;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Demo Leads{" "}
        <span className="text-[15px] font-semibold text-ink-600">
          · {newCount} new
        </span>
      </div>
      <p className="-mt-2 text-[13px] font-medium text-ink-400">
        Resend email notifications are a future upgrade.
      </p>

      {apiPending && !leads && (
        <div className={CARD + " px-[30px] py-6"}>
          <div className="text-[13px] font-semibold text-blue-primary">
            Lead capture is coming online…
          </div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className={SKELETON + " h-[90px]"} />
            ))}
          </div>
        </div>
      )}

      {!leads && !apiPending && !error &&
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={SKELETON + " h-[110px]"} />
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

      {leads && leads.length === 0 && (
        <div className={CARD + " px-[30px] py-8 text-center text-[13px] font-semibold text-ink-400"}>
          No demo requests yet.
        </div>
      )}

      {(leads ?? []).map((l) => {
        const chip = chipFor(l.status);
        const ts = toTs(l.createdAt);
        const status = l.status.toLowerCase();
        return (
          <div key={l.id} className={CARD + " px-[30px] py-6"}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                  {l.orgName ?? "Recovery center"}
                  {l.source && (
                    <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[11px] font-bold text-ink-600">
                      {l.source}
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-600">
                  {l.contactName ? l.contactName + " · " : ""}
                  {l.email && (
                    <a
                      href={`mailto:${l.email}`}
                      className="font-semibold text-blue-primary hover:underline"
                    >
                      {l.email}
                    </a>
                  )}
                  {l.phone && (
                    <>
                      {" · "}
                      <a
                        href={`tel:${l.phone}`}
                        className="font-semibold text-blue-primary hover:underline"
                      >
                        {l.phone}
                      </a>
                    </>
                  )}
                  {ts && <> · {relTime(ts)}</>}
                </div>
              </div>
              <span
                className="inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-extrabold"
                style={{ background: chip.bg, color: chip.color }}
              >
                {chip.label}
              </span>
            </div>

            {l.message && (
              <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] font-medium text-ink-900">
                &quot;{l.message}&quot;
              </div>
            )}

            {status !== "closed" && (
              <div className="mt-4 flex flex-wrap gap-3">
                {status === "new" && (
                  <button
                    type="button"
                    onClick={() => advance(l.id, "contacted")}
                    className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white hover:bg-blue-hover"
                  >
                    Mark contacted
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => advance(l.id, "closed")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-[#E2E8F0] px-6 text-[13px] font-bold text-ink-600"
                >
                  Mark closed
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
