// ─────────────────────────────────────────────────────────────────────────
// The data-layer seam.
//
// `app/lib/store.ts` (in-memory) has always been the swap-out point for
// Supabase; the `app/api/` route handlers are the stable contract (docs/13).
// This module is the SWITCH future route work consults to decide which backend
// to read/write. It is INERT today: nothing calls `dataBackend()` yet, and the
// default is "memory", so the app behaves identically until the cutover
// (docs/13 §(f) phase 8) flips `DATA_BACKEND=supabase`.
//
// Rollback is the same switch in reverse (docs/13 §(g)): set DATA_BACKEND back
// to memory and redeploy — no code revert.
// ─────────────────────────────────────────────────────────────────────────

export { supabaseAdmin, supabaseAnonServer } from "./server";
export { supabaseBrowser } from "./browser";

export type DataBackend = "memory" | "supabase";

/**
 * Which data backend the app should use. Reads `process.env.DATA_BACKEND`.
 * Defaults to "memory"; ONLY the exact value "supabase" selects Supabase —
 * any other value (unset, typo, empty) falls back to "memory" so a
 * misconfigured env can never silently point production at an unready backend.
 */
export function dataBackend(): DataBackend {
  return process.env.DATA_BACKEND === "supabase" ? "supabase" : "memory";
}
