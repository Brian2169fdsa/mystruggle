"use client";

import { useCallback, useEffect, useState } from "react";
import { CARD, SKELETON } from "./types";

/** A placement awaiting ms_admin review (pending) or flagged by a member report. */
type ReviewItem = {
  id: string;
  orgName?: string;
  title: string;
  body: string;
  kind?: string;
  status?: string;
  targeting?: Record<string, string | string[] | undefined | null> | null;
  reported?: boolean;
  reportCount?: number;
  metrics?: { reports?: number; report?: number } | null;
  stats?: { reports?: number; report?: number } | null;
};

const KIND_LABEL: Record<string, string> = {
  service: "Service",
  alumni_event: "Alumni event",
  job_opening: "Job opening",
  program: "Program",
  announcement: "Announcement",
};

/** How many member reports a placement has drawn (live field is stats.report). */
function reportCount(it: ReviewItem): number {
  if (typeof it.reportCount === "number") return it.reportCount;
  const m = it.metrics ?? it.stats ?? {};
  return m.reports ?? m.report ?? 0;
}

/** A card is "reported" if a member flagged it or its status says so. */
function isReported(it: ReviewItem): boolean {
  if (it.reported) return true;
  if (reportCount(it) > 0) return true;
  return (it.status ?? "").toLowerCase().includes("report");
}

/** Does this placement still need ms_admin eyes? (pending review, or reported.) */
function needsReview(it: ReviewItem): boolean {
  const s = (it.status ?? "").toLowerCase();
  return s.includes("pend") || s.includes("review") || isReported(it);
}

/** Flatten any targeting jsonb shape into display chips; never surface raw keys. */
function targetChipsOf(
  t: Record<string, string | string[] | undefined | null> | null | undefined
): string[] {
  if (!t) return [];
  const out: string[] = [];
  const push = (v: string | string[] | undefined | null) => {
    if (Array.isArray(v)) out.push(...v.map(String));
    else if (v != null && v !== "") out.push(String(v));
  };
  push(t.metros);
  push(t.metro);
  push(t.phases);
  push(t.phase);
  push(t.interests);
  push(t.interestTags);
  push(t.circles);
  push(t.circle);
  push(t.circleId);
  return out;
}

export default function AdApproval({
  onQueueLength,
}: {
  onQueueLength?: (n: number) => void;
}) {
  const [queue, setQueue] = useState<ReviewItem[] | null>(null);
  const [killSwitch, setKillSwitch] = useState(false);
  const [apiPending, setApiPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  // ── content policy & frequency config (docs/15 §C) ────────────────────
  const [everyN, setEveryN] = useState(5);
  const [blockedText, setBlockedText] = useState("");
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgSaved, setCfgSaved] = useState(false);
  const [cfgError, setCfgError] = useState<string | null>(null);

  // Load the current config once (kept separate from the polling queue load).
  useEffect(() => {
    fetch("/api/admin/ad-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (typeof d.frequencyEveryN === "number") setEveryN(d.frequencyEveryN);
        if (Array.isArray(d.blockedTerms))
          setBlockedText((d.blockedTerms as string[]).join(", "));
      })
      .catch(() => {});
  }, []);

  async function saveConfig() {
    setSavingCfg(true);
    setCfgSaved(false);
    setCfgError(null);
    const blockedTerms = blockedText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/admin/ad-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequencyEveryN: everyN, blockedTerms }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setCfgError(d?.error ?? "Couldn't save. Check the frequency value.");
        return;
      }
      if (d && typeof d.frequencyEveryN === "number") setEveryN(d.frequencyEveryN);
      if (d && Array.isArray(d.blockedTerms))
        setBlockedText((d.blockedTerms as string[]).join(", "));
      setCfgSaved(true);
      setTimeout(() => setCfgSaved(false), 2500);
    } catch {
      setCfgError("Couldn't save. Try again.");
    } finally {
      setSavingCfg(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/placements");
      if (res.status === 404) {
        setApiPending(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        queue?: ReviewItem[];
        placements?: ReviewItem[];
        killSwitch?: boolean;
      };
      // Contract says `queue`; the live API returns all `placements` - either way,
      // narrow to what still needs review (pending, or member-reported).
      const all = data.queue ?? data.placements ?? [];
      const q = all.filter(needsReview);
      setQueue(q);
      setKillSwitch(Boolean(data.killSwitch));
      setApiPending(false);
      setError(null);
      onQueueLength?.(q.length);
    } catch {
      setError("Couldn't load the review queue.");
    }
  }, [onQueueLength]);

  useEffect(() => {
    load();
    const t = setInterval(load, apiPending ? 8_000 : 15_000);
    return () => clearInterval(t);
  }, [load, apiPending]);

  async function moderate(id: string, action: "approve" | "reject") {
    const reason = reasons[id]?.trim() || undefined;
    if (action === "reject" && !reason) {
      // A rejection needs a reason the center can act on.
      setReasons((r) => ({ ...r, [id]: r[id] ?? "" }));
      return;
    }
    // Optimistic removal; the next poll reconciles with the server.
    setQueue((prev) => (prev ? prev.filter((q) => q.id !== id) : prev));
    try {
      const res = await fetch(`/api/admin/placements/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (res.status === 404) setApiPending(true);
    } catch {
      /* next poll reconciles */
    }
    await load();
  }

  async function toggleKill() {
    const next = !killSwitch;
    if (
      next &&
      !window.confirm(
        "Turn the platform ad kill switch ON? No sponsored content will serve anywhere until you turn it back off."
      )
    ) {
      return;
    }
    setKillSwitch(next); // optimistic
    try {
      const res = await fetch("/api/admin/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killSwitch: next }),
      });
      if (res.status === 404) setApiPending(true);
    } catch {
      /* next poll reconciles */
    }
    await load();
  }

  const items = queue ?? [];
  const reported = items.filter(isReported);
  const reportedIds = new Set(reported.map((r) => r.id));
  const pending = items.filter((it) => !reportedIds.has(it.id));

  const card = (it: ReviewItem, flagged: boolean) => {
    const chips = targetChipsOf(it.targeting);
    const reports = reportCount(it);
    return (
      <div
        key={it.id}
        className={
          flagged
            ? "rounded-2xl border-[1.5px] border-gold-badge bg-white px-[30px] py-6 shadow-[0_2px_10px_rgba(161,98,7,.10)]"
            : CARD + " px-[30px] py-6"
        }
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
              {it.orgName ?? "Center"}
              {it.kind && (
                <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[11px] font-bold text-ink-600">
                  {KIND_LABEL[it.kind] ?? it.kind}
                </span>
              )}
            </div>
            <div className="text-xs text-ink-600">{it.title}</div>
          </div>
          {flagged ? (
            <span className="inline-flex h-[26px] items-center rounded-full bg-amber-bg px-3 text-[11px] font-extrabold text-amber-ink">
              ⚑ REPORTED{reports ? ` · ${reports}` : ""}
            </span>
          ) : (
            <span className="inline-flex h-[26px] items-center rounded-full bg-amber-bg px-3 text-[11px] font-extrabold text-amber-ink">
              PENDING REVIEW
            </span>
          )}
        </div>

        <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] font-medium text-ink-900">
          {it.body}
        </div>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <span
                key={c + i}
                className="inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[12px] font-bold text-blue-primary"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4">
          <input
            className="w-full rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-2.5 text-[14px] font-medium text-ink-900 outline-none focus:border-blue-primary"
            placeholder="Reason (required to reject)"
            value={reasons[it.id] ?? ""}
            onChange={(e) =>
              setReasons((r) => ({ ...r, [it.id]: e.target.value }))
            }
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => moderate(it.id, "approve")}
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-success px-6 text-[13px] font-bold text-white"
          >
            ✓ Approve
          </button>
          <button
            type="button"
            onClick={() => moderate(it.id, "reject")}
            className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-gold-badge px-6 text-[13px] font-bold text-amber-ink hover:bg-amber-bg"
          >
            Reject
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Ad Review{" "}
        <span className="text-[15px] font-semibold text-ink-600">
          · {items.length} in queue
        </span>
      </div>

      {/* ── KILL SWITCH ──────────────────────────────────────────────── */}
      <div
        className={
          "rounded-2xl px-[30px] py-5 " +
          (killSwitch
            ? "border-[1.5px] border-gold-badge bg-amber-bg"
            : CARD)
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[16px] font-extrabold text-ink-900">
              Platform ad kill switch
            </div>
            <div className="mt-1 text-[13px]/[1.6] font-medium text-ink-600">
              When ON, no sponsored content serves anywhere.
            </div>
          </div>
          <button
            type="button"
            onClick={toggleKill}
            aria-pressed={killSwitch}
            className={
              "relative inline-flex h-[34px] w-[62px] flex-none cursor-pointer items-center rounded-full transition-colors " +
              (killSwitch ? "bg-amber-ink" : "bg-ink-400")
            }
          >
            <span
              className={
                "absolute h-[26px] w-[26px] rounded-full bg-white shadow transition-all " +
                (killSwitch ? "left-[32px]" : "left-[4px]")
              }
            />
          </button>
        </div>
        {killSwitch && (
          <div className="mt-3 text-[13px] font-bold text-amber-ink">
            Kill switch is ON - sponsored content is paused platform-wide.
          </div>
        )}
      </div>

      {/* ── CONTENT POLICY & FREQUENCY ───────────────────────────────── */}
      <div className={CARD + " px-[30px] py-5"}>
        <div className="text-[16px] font-extrabold text-ink-900">
          Content policy &amp; frequency
        </div>
        <div className="mt-1 text-[13px]/[1.6] font-medium text-ink-600">
          Platform-wide controls for how sponsored content shows in the recovery
          community feed.
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* frequency cap */}
          <div className="lg:w-[280px]">
            <label
              htmlFor="ad-freq"
              className="text-[13px] font-bold text-ink-900"
            >
              Show at most 1 sponsored post per N organic posts
            </label>
            <input
              id="ad-freq"
              type="number"
              min={2}
              max={20}
              step={1}
              value={everyN}
              onChange={(e) =>
                setEveryN(Math.trunc(Number(e.target.value) || 0))
              }
              className="mt-2 w-full rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-2.5 text-[14px] font-semibold text-ink-900 outline-none focus:border-blue-primary"
            />
            <div className="mt-1.5 text-[12px] font-medium text-ink-400">
              Whole number between 2 and 20. The feed honors this spacing live.
            </div>
          </div>

          {/* blocked terms */}
          <div className="flex-1">
            <label
              htmlFor="ad-blocked"
              className="text-[13px] font-bold text-ink-900"
            >
              Additional blocked terms
            </label>
            <textarea
              id="ad-blocked"
              value={blockedText}
              onChange={(e) => setBlockedText(e.target.value)}
              rows={3}
              placeholder="comma, separated, terms"
              className="mt-2 w-full resize-y rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-2.5 text-[14px] font-medium text-ink-900 outline-none focus:border-blue-primary"
            />
            <div className="mt-1.5 text-[12px] font-medium text-ink-400">
              Comma-separated. Stored alongside the built-in off-policy screen
              (gambling, alcohol, predatory lending, MLM, scams) and merged into
              it in a future release.
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveConfig}
            disabled={savingCfg}
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white hover:bg-blue-hover disabled:opacity-60"
          >
            {savingCfg ? "Saving…" : "Save policy"}
          </button>
          {cfgSaved && (
            <span className="text-[13px] font-bold text-success">Saved ✓</span>
          )}
          {cfgError && (
            <span className="text-[13px] font-bold text-amber-ink">
              {cfgError}
            </span>
          )}
        </div>
      </div>

      {apiPending && !queue && (
        <div className={CARD + " px-[30px] py-6"}>
          <div className="text-[13px] font-semibold text-blue-primary">
            Review service is coming online…
          </div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className={SKELETON + " h-[120px]"} />
            ))}
          </div>
        </div>
      )}

      {!queue && !apiPending && !error &&
        Array.from({ length: 2 }).map((_, i) => (
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

      {queue && items.length === 0 && (
        <div className={CARD + " px-[30px] py-8 text-center text-[13px] font-semibold text-ink-400"}>
          Nothing awaiting review - the queue is clear.
        </div>
      )}

      {/* Reported placements pinned to the top, amber. */}
      {reported.map((it) => card(it, true))}
      {pending.map((it) => card(it, false))}
    </div>
  );
}
