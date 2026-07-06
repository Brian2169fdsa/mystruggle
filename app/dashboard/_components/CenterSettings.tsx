"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessagesSquare, MoonStar, Sunrise } from "lucide-react";
import { CARD, SKELETON } from "./types";

/** One center's policy row (GET/PATCH /api/admin/center-policies). */
type CenterPolicy = {
  centerId: string;
  communityAccessDuringResidential: boolean;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  portalOnlyEarlyPhase: boolean;
  updatedAt: number;
  updatedBy?: string;
};

type PolicyPatch = {
  communityAccessDuringResidential?: boolean;
  portalOnlyEarlyPhase?: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
};

/** 0-23 → "12 AM" … "11 PM". */
function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${period}`;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

const SELECT =
  "h-11 rounded-xl border-[1.5px] border-sky-tint bg-white px-3 text-[14px] font-semibold text-ink-900 outline-none focus:border-blue-primary";

function ToggleRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-ink-900">{label}</span>
        <span className="mt-0.5 block text-[13px]/[1.6] font-medium text-ink-600">
          {hint}
        </span>
      </span>
      <span
        className={
          "relative h-6 w-11 flex-none rounded-full transition-colors " +
          (on ? "bg-blue-primary" : "bg-[#E2E8F0]")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
            (on ? "left-[22px]" : "left-0.5")
          }
        />
      </span>
    </button>
  );
}

/** Center policies card - three warm, plainly-explained controls the center
 *  can flip: residential community access, quiet hours, portal-first early
 *  phases. Optimistic PATCH, reconciled with the server's returned policy. */
export default function CenterSettings() {
  const [policy, setPolicy] = useState<CenterPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Monotonic guard so a slow PATCH response never clobbers a newer one.
  const patchSeq = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/center-policies");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { policy?: CenterPolicy };
      if (data.policy) {
        setPolicy(data.policy);
        setError(null);
      }
    } catch {
      setError("Couldn't load your center's policies right now.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Optimistically apply a patch, then reconcile with the server's row.
   *  On failure, refetch so the card always reflects what's really saved. */
  const apply = useCallback(
    async (patch: PolicyPatch) => {
      const seq = ++patchSeq.current;
      setSaveError(null);
      setPolicy((cur) => {
        if (!cur) return cur;
        const next: CenterPolicy = { ...cur };
        if (patch.communityAccessDuringResidential !== undefined) {
          next.communityAccessDuringResidential =
            patch.communityAccessDuringResidential;
        }
        if (patch.portalOnlyEarlyPhase !== undefined) {
          next.portalOnlyEarlyPhase = patch.portalOnlyEarlyPhase;
        }
        if (patch.quietHoursStart !== undefined) {
          if (patch.quietHoursStart === null) delete next.quietHoursStart;
          else next.quietHoursStart = patch.quietHoursStart;
        }
        if (patch.quietHoursEnd !== undefined) {
          if (patch.quietHoursEnd === null) delete next.quietHoursEnd;
          else next.quietHoursEnd = patch.quietHoursEnd;
        }
        return next;
      });
      try {
        const res = await fetch("/api/admin/center-policies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = (await res.json().catch(() => ({}))) as {
          policy?: CenterPolicy;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? String(res.status));
        // Reconcile - only if no newer patch is already in flight.
        if (data.policy && seq === patchSeq.current) setPolicy(data.policy);
      } catch {
        if (seq === patchSeq.current) {
          setSaveError("That change didn't save - showing what's on record.");
          load();
        }
      }
    },
    [load]
  );

  if (error) {
    return (
      <div className="flex flex-col gap-[18px]">
        <Header />
        <div className={CARD + " px-[30px] py-8 text-center"}>
          <div className="text-[13px] font-semibold text-ink-600">{error}</div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              load();
            }}
            className="mt-3 inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-6 text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex flex-col gap-[18px]">
        <Header />
        <div className={SKELETON + " h-[320px]"} />
      </div>
    );
  }

  const quietSet =
    policy.quietHoursStart !== undefined || policy.quietHoursEnd !== undefined;

  return (
    <div className="flex flex-col gap-[18px]">
      <Header />

      <div className={CARD + " px-[30px] py-6"}>
        <div className="text-[17px] font-extrabold text-ink-900">
          Center policies
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-ink-600">
          How community and notifications behave for the people in your care.
        </div>

        {saveError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-bg px-4 py-3">
            <span className="mt-0.5 flex-none text-[11px] font-extrabold text-amber-ink">
              CHECK
            </span>
            <span className="text-[13px]/[1.6] font-medium text-ink-900">
              {saveError}
            </span>
          </div>
        )}

        {/* (1) Community access during residential care */}
        <div className="mt-5 flex items-start gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#EAF2FC] text-blue-primary">
            <MessagesSquare size={20} strokeWidth={2.3} />
          </div>
          <div className="min-w-0 flex-1">
            <ToggleRow
              label="Community access during residential care"
              hint="Members in residential or detox phases can browse and post in the community."
              on={policy.communityAccessDuringResidential}
              onToggle={() =>
                apply({
                  communityAccessDuringResidential:
                    !policy.communityAccessDuringResidential,
                })
              }
            />
          </div>
        </div>

        <div className="my-5 h-px bg-sky-tint" />

        {/* (2) Quiet hours */}
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#F0EDFB] text-indigo-brand">
            <MoonStar size={20} strokeWidth={2.3} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold text-ink-900">Quiet hours</div>
            <div className="mt-0.5 text-[13px]/[1.6] font-medium text-ink-600">
              Notifications during quiet hours wait for the morning - members
              still get them, just not at 2am.
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
                  From
                </span>
                <select
                  className={SELECT}
                  value={policy.quietHoursStart ?? ""}
                  onChange={(e) =>
                    apply({
                      quietHoursStart:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                >
                  <option value="">Not set</option>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-600">
                  Until
                </span>
                <select
                  className={SELECT}
                  value={policy.quietHoursEnd ?? ""}
                  onChange={(e) =>
                    apply({
                      quietHoursEnd:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                >
                  <option value="">Not set</option>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </label>
              {quietSet && (
                <button
                  type="button"
                  onClick={() =>
                    apply({ quietHoursStart: null, quietHoursEnd: null })
                  }
                  className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-sky-tint px-5 text-[13px] font-bold text-ink-600 hover:border-blue-primary hover:text-blue-primary"
                >
                  Clear quiet hours
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="my-5 h-px bg-sky-tint" />

        {/* (3) Portal-only early phases */}
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#E8F8F0] text-success">
            <Sunrise size={20} strokeWidth={2.3} />
          </div>
          <div className="min-w-0 flex-1">
            <ToggleRow
              label="Portal-only early phases"
              hint="Members in their first care phase see their program portal first; community unlocks as they progress."
              on={policy.portalOnlyEarlyPhase}
              onToggle={() =>
                apply({ portalOnlyEarlyPhase: !policy.portalOnlyEarlyPhase })
              }
            />
          </div>
        </div>

        <div className="mt-6 border-t border-sky-tint pt-4 text-[12.5px] font-medium text-ink-600">
          Policies apply to your center&rsquo;s members only.
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Center settings
      </div>
      <div className="mt-0.5 text-[13px] font-medium text-ink-600">
        Gentle guardrails for your center - set once, and the platform follows
        your lead.
      </div>
    </div>
  );
}
