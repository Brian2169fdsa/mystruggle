"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CARD, SKELETON, relTime } from "./types";

/** One sponsored placement owned by the signed-in center. */
type Placement = {
  id: string;
  orgName?: string;
  title: string;
  body: string;
  kind: PlacementKind;
  status: string;
  // Targeting is freeform jsonb — we flatten it defensively for display.
  targeting?: Record<string, string | string[] | undefined | null> | null;
  startsAt?: number | string | null;
  endsAt?: number | string | null;
  // The live API exposes these under `stats`; the contract called it `metrics`.
  metrics?: Metrics | null;
  stats?: Metrics | null;
};

type Metrics = {
  impressions?: number;
  clicks?: number;
  ctr?: number;
  dismisses?: number;
  dismiss?: number;
  reports?: number;
  report?: number;
};

type PlacementKind =
  | "service"
  | "alumni_event"
  | "job_opening"
  | "program"
  | "announcement";

type AudienceScope = "community" | "geo" | "circle" | "phase";

const KIND_OPTIONS: { value: PlacementKind; label: string }[] = [
  { value: "service", label: "Service" },
  { value: "alumni_event", label: "Alumni event" },
  { value: "job_opening", label: "Job opening (fair-chance)" },
  { value: "program", label: "Program" },
  { value: "announcement", label: "Announcement" },
];

const SCOPE_OPTIONS: { value: AudienceScope; label: string }[] = [
  { value: "community", label: "Whole community" },
  { value: "geo", label: "Metro / geo" },
  { value: "phase", label: "Care phase" },
  { value: "circle", label: "Circle topic" },
];

type TargetKey = "metros" | "phases" | "interests" | "circles";

/** Coarse, non-clinical targeting chips only — NO health / diagnosis option. */
const TARGET_GROUPS: { key: TargetKey; label: string; chips: string[] }[] = [
  { key: "metros", label: "Metro", chips: ["Phoenix", "Laveen", "Tempe", "Mesa"] },
  { key: "phases", label: "Care phase", chips: ["Pre-care", "In-care", "Alumni"] },
  { key: "interests", label: "Interest tags", chips: ["Employment", "Housing", "Fitness", "Faith", "Family"] },
  { key: "circles", label: "Circle", chips: ["Recovery", "Parents", "Veterans", "Young adults"] },
];

/** Flatten any targeting jsonb shape (contract arrays OR live metro/interestTags
 *  strings) into a flat list of display chips. Never surfaces raw keys. */
function targetChips(t: Placement["targeting"]): string[] {
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

/** Normalizes stats/metrics across the contract and live field names. */
function metricsOf(p: Placement): {
  impressions: number;
  clicks: number;
  dismisses: number;
  reports: number;
  ctrPct: number;
} {
  const m = p.metrics ?? p.stats ?? {};
  const impressions = m.impressions ?? 0;
  const clicks = m.clicks ?? 0;
  const dismisses = m.dismisses ?? m.dismiss ?? 0;
  const reports = m.reports ?? m.report ?? 0;
  // Prefer computing from raw counts; the live API's ctr is a 0–1 fraction.
  let ctrPct: number;
  if (impressions > 0) ctrPct = (clicks / impressions) * 100;
  else if (typeof m.ctr === "number") ctrPct = m.ctr <= 1 ? m.ctr * 100 : m.ctr;
  else ctrPct = 0;
  return { impressions, clicks, dismisses, reports, ctrPct };
}

/** Normalizes any backend status onto our chip vocabulary. */
function chipFor(status: string): { label: string; bg: string; color: string } {
  const s = status.toLowerCase();
  if (s.startsWith("run")) return { label: "RUNNING", bg: "#E8F8F0", color: "#12B76A" };
  if (s.startsWith("pend") || s === "in_review" || s === "review")
    return { label: "PENDING REVIEW", bg: "#FFF9EC", color: "#A16207" };
  if (s.startsWith("paus")) return { label: "PAUSED", bg: "#EAF2FC", color: "#2E7CD6" };
  if (s.startsWith("reject")) return { label: "REJECTED", bg: "#FFF9EC", color: "#A16207" };
  if (s.startsWith("approv")) return { label: "APPROVED", bg: "#E8F8F0", color: "#12B76A" };
  if (s.startsWith("end")) return { label: "ENDED", bg: "#F1F5F9", color: "#4B5563" };
  return { label: "DRAFT", bg: "#F1F5F9", color: "#4B5563" };
}

function num(n: number | undefined): string {
  return (n ?? 0).toLocaleString("en-US");
}

function toTs(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(n) ? n : null;
}

const INPUT =
  "w-full rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-3 text-[15px] font-medium text-ink-900 outline-none focus:border-blue-primary";

type FormTargeting = Record<TargetKey, string[]>;

const EMPTY_TARGETING: FormTargeting = {
  metros: [],
  phases: [],
  interests: [],
  circles: [],
};

export default function AdManager() {
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [apiPending, setApiPending] = useState(false); // API not online yet (404)
  const [error, setError] = useState<string | null>(null);

  // Create-form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PlacementKind>("service");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [scope, setScope] = useState<AudienceScope>("community");
  const [targeting, setTargeting] = useState<FormTargeting>(EMPTY_TARGETING);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/placements");
      if (res.status === 404) {
        setApiPending(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { placements: Placement[] };
      setPlacements(data.placements ?? []);
      setApiPending(false);
      setError(null);
    } catch {
      setError("Couldn't load your placements.");
    }
  }, []);

  useEffect(() => {
    load();
    // Poll: fast (8s) while the API is still coming online, slower once live.
    const t = setInterval(load, apiPending ? 8_000 : 20_000);
    return () => clearInterval(t);
  }, [load, apiPending]);

  function toggleChip(group: TargetKey, chip: string) {
    setTargeting((prev) => {
      const cur = prev[group] ?? [];
      const next = cur.includes(chip)
        ? cur.filter((c) => c !== chip)
        : [...cur, chip];
      return { ...prev, [group]: next };
    });
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting;

  async function createPlacement() {
    if (!canSubmit) return;
    setSubmitting(true);
    setRejectReason(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          ctaLabel: ctaLabel.trim(),
          ctaUrl: ctaUrl.trim(),
          kind,
          audienceScope: scope,
          targeting,
        }),
      });
      if (res.status === 404) {
        setApiPending(true);
        setRejectReason("Ad service is still coming online — try again shortly.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 400) {
        // Content-policy rejection — surface the reason inline.
        setRejectReason(
          (data as { error?: string }).error ??
            "This placement doesn't meet the community content policy."
        );
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      // Clear the form and refresh the list.
      setTitle("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
      setKind("service");
      setScope("community");
      setTargeting(EMPTY_TARGETING);
      setOkMsg("Draft created — submit it for review when you're ready.");
      await load();
    } catch {
      setRejectReason("Something went wrong creating this placement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function lifecycle(id: string, action: "submit" | "pause" | "resume") {
    try {
      const res = await fetch("/api/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.status === 404) {
        setApiPending(true);
        return;
      }
    } catch {
      /* next poll reconciles */
    }
    await load();
  }

  const runningCount = useMemo(
    () => (placements ?? []).filter((p) => p.status.toLowerCase().startsWith("run")).length,
    [placements]
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Ad Manager{" "}
        <span className="text-[15px] font-semibold text-ink-600">
          · {runningCount} running
        </span>
      </div>
      <p className="-mt-2 max-w-[680px] text-[15px]/[1.6] font-medium text-ink-600">
        Promote your services, alumni events, and openings inside the recovery
        community. Every placement is reviewed against the community content
        policy before it runs.
      </p>

      {/* ── CREATE PLACEMENT ─────────────────────────────────────────── */}
      <div className={CARD + " px-[30px] py-6"}>
        <div className="text-[17px] font-extrabold text-ink-900">
          Create placement
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
              Title
            </span>
            <input
              className={INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Alumni cookout · Saturday"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
              Kind
            </span>
            <select
              className={INPUT}
              value={kind}
              onChange={(e) => setKind(e.target.value as PlacementKind)}
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
            Body
          </span>
          <textarea
            className={INPUT + " min-h-[92px] resize-y"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Open to all alumni and their families. Food, music, and connection."
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
              CTA label
            </span>
            <input
              className={INPUT}
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="RSVP"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
              CTA URL
            </span>
            <input
              className={INPUT}
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
            Audience scope
          </span>
          <select
            className={INPUT + " md:max-w-[320px]"}
            value={scope}
            onChange={(e) => setScope(e.target.value as AudienceScope)}
          >
            {SCOPE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {/* Coarse, non-clinical targeting chips */}
        <div className="mt-4 flex flex-col gap-3">
          {TARGET_GROUPS.map((g) => (
            <div key={g.key}>
              <div className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
                {g.label}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.chips.map((chip) => {
                  const on = (targeting[g.key] ?? []).includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(g.key, chip)}
                      className={
                        "inline-flex h-[34px] cursor-pointer items-center rounded-full px-4 text-[13px] font-bold " +
                        (on
                          ? "bg-blue-primary text-white"
                          : "bg-sky-tint text-blue-primary hover:bg-sky-tint-2")
                      }
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-sky-tint px-4 py-3">
          <span className="mt-0.5 flex-none text-[11px] font-extrabold text-blue-primary">
            PRIVACY
          </span>
          <span className="text-[13px]/[1.6] font-medium text-ink-900">
            Targeting is coarse and non-clinical by design — we never target by
            health, diagnosis, or substance.
          </span>
        </div>

        {rejectReason && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-bg px-4 py-3">
            <span className="mt-0.5 flex-none text-[11px] font-extrabold text-amber-ink">
              NOT APPROVED
            </span>
            <span className="text-[13px]/[1.6] font-medium text-ink-900">
              {rejectReason}
            </span>
          </div>
        )}
        {okMsg && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#E8F8F0] px-4 py-3">
            <span className="mt-0.5 flex-none text-[11px] font-extrabold text-success">
              CREATED
            </span>
            <span className="text-[13px]/[1.6] font-medium text-ink-900">
              {okMsg}
            </span>
          </div>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={createPlacement}
            disabled={!canSubmit}
            className={
              "inline-flex h-12 items-center rounded-full px-7 text-[14px] font-bold text-white " +
              (canSubmit
                ? "cursor-pointer bg-blue-primary hover:bg-blue-hover"
                : "cursor-not-allowed bg-ink-400")
            }
          >
            {submitting ? "Creating…" : "Create placement"}
          </button>
        </div>
      </div>

      {/* ── YOUR PLACEMENTS ──────────────────────────────────────────── */}
      <div className="mt-2 text-[17px] font-extrabold text-ink-900">
        Your placements
      </div>

      {apiPending && !placements && (
        <div className={CARD + " px-[30px] py-6"}>
          <div className="text-[13px] font-semibold text-blue-primary">
            Ad service is coming online…
          </div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className={SKELETON + " h-[110px]"} />
            ))}
          </div>
        </div>
      )}

      {!placements && !apiPending && !error &&
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

      {placements && placements.length === 0 && (
        <div className={CARD + " px-[30px] py-8 text-center text-[13px] font-semibold text-ink-400"}>
          No placements yet — create one above.
        </div>
      )}

      {(placements ?? []).map((p) => {
        const chip = chipFor(p.status);
        const s = p.status.toLowerCase();
        const isDraft = s.startsWith("draft") || s.startsWith("reject");
        const isRunning = s.startsWith("run");
        const isPaused = s.startsWith("paus");
        const start = toTs(p.startsAt);
        const chips = targetChips(p.targeting);
        const m = metricsOf(p);
        return (
          <div key={p.id} className={CARD + " px-[30px] py-6"}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink-900">
                  {p.title}
                  <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[11px] font-bold text-ink-600">
                    {KIND_OPTIONS.find((k) => k.value === p.kind)?.label ?? p.kind}
                  </span>
                </div>
                <div className="text-xs text-ink-600">
                  {start ? `starts ${relTime(start)}` : "not scheduled"}
                </div>
              </div>
              <span
                className="inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-extrabold"
                style={{ background: chip.bg, color: chip.color }}
              >
                {chip.label}
              </span>
            </div>

            <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] font-medium text-ink-900">
              {p.body}
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

            {/* Aggregate metrics row */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { label: "Impressions", value: num(m.impressions) },
                { label: "Clicks", value: num(m.clicks) },
                { label: "CTR", value: m.ctrPct.toFixed(1) + "%" },
                { label: "Dismisses", value: num(m.dismisses) },
                { label: "Reports", value: num(m.reports) },
              ].map((cell) => (
                <div key={cell.label} className="rounded-xl bg-canvas px-4 py-3">
                  <div className="text-[18px] font-extrabold text-ink-900">
                    {cell.value}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-[.06em] text-ink-600">
                    {cell.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11px] font-medium text-ink-400">
              Aggregate only — we never show you individual members.
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {isDraft && (
                <button
                  type="button"
                  onClick={() => lifecycle(p.id, "submit")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white hover:bg-blue-hover"
                >
                  Submit for review
                </button>
              )}
              {isRunning && (
                <button
                  type="button"
                  onClick={() => lifecycle(p.id, "pause")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-gold-badge px-6 text-[13px] font-bold text-amber-ink hover:bg-amber-bg"
                >
                  Pause
                </button>
              )}
              {isPaused && (
                <button
                  type="button"
                  onClick={() => lifecycle(p.id, "resume")}
                  className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white hover:bg-blue-hover"
                >
                  Resume
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
