"use client";

// A tiny, non-intrusive control at the foot of the feed. Members can learn why
// sponsored placements appear and dial them down. The feed stays a recovery
// space first (docs/15 §"The Community Ad Product" - member controls). The
// "reduce" preference is remembered locally in `ms-reduce-sponsored`.

import { useState } from "react";

export const REDUCE_STORAGE_KEY = "ms-reduce-sponsored";

/** Read the persisted "reduce sponsored content" preference (SSR-safe). */
export function readReducePref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REDUCE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function SponsoredControls({
  reduced,
  onChange,
}: {
  reduced: boolean;
  /** Lets the feed re-evaluate interleaving when the preference flips. */
  onChange: (next: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const next = !reduced;
    try {
      window.localStorage.setItem(REDUCE_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* private mode / storage disabled - keep the in-memory preference */
    }
    onChange(next);
  };

  return (
    <div className="mt-1 text-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex min-h-[44px] cursor-pointer items-center text-[12px] font-semibold text-ink-400 transition-colors hover:text-ink-600"
      >
        Why am I seeing sponsored posts?
      </button>

      {open && (
        <div className="mx-auto mt-1 max-w-[520px] rounded-2xl border border-sky-tint-2 bg-white px-5 py-4 text-left shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <p className="text-[13px]/[1.6] font-medium text-ink-600">
            These keep the platform free. Centers only - recovery-relevant, never
            sold your data.
          </p>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
            <span className="text-[13px] font-bold text-ink-900">
              Reduce sponsored content
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={reduced}
              onClick={toggle}
              className={
                "relative inline-flex h-7 w-12 flex-none cursor-pointer items-center rounded-full transition-colors " +
                (reduced ? "bg-blue-primary" : "bg-sky-tint-2")
              }
            >
              <span
                className={
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
                  (reduced ? "translate-x-6" : "translate-x-1")
                }
              />
            </button>
          </label>
        </div>
      )}
    </div>
  );
}
