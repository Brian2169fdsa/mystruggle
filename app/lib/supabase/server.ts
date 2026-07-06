// ─────────────────────────────────────────────────────────────────────────
// SERVER-ONLY Supabase clients. Do NOT import this module from a client
// component ("use client") or any browser-bound bundle - it reads the
// service-role key (`SUPABASE_SERVICE_ROLE_KEY`), which must never ship to the
// browser (docs/10 §4, docs/13 §(a)/(b)). Use `app/lib/supabase/browser.ts`
// for anything client-side.
//
// INERT until cutover: nothing here is wired into a route yet. These factories
// exist so future route work (docs/13 phases 4–6) can swap the in-memory store
// for Supabase behind the `DATA_BACKEND` flag. With `DATA_BACKEND=memory`
// (the default) these are never called, so a missing env var never throws.
// ─────────────────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Module-level memoization so we create one client per server process, not one
// per request. Supabase clients are cheap to reuse and hold no request state
// when sessions are disabled (below).
let _admin: SupabaseClient | null = null;
let _anonServer: SupabaseClient | null = null;

/**
 * Service-role client - bypasses RLS. SERVER-ONLY.
 *
 * Import ONLY from trusted server code (route handlers / server actions) that
 * has already authorized the caller: donations/webhook writes, signup
 * enrichment, redeem, lesson-complete reward writes (docs/13 §(b)/(d)).
 *
 * Reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Throws if
 * either is missing so a misconfigured deploy fails loudly instead of silently
 * acting unauthenticated.
 */
export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "supabaseAdmin(): missing NEXT_PUBLIC_SUPABASE_URL or " +
        "SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local / Vercel env " +
        "before enabling DATA_BACKEND=supabase (see docs/13 §(a))."
    );
  }

  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/**
 * Anon-scoped server client (no cookies) - for anon reads from server code,
 * e.g. public views that RLS already exposes to `anon`. RLS is the guard; this
 * holds no user session. Kept minimal; request-scoped user clients (bound to
 * `cookies()` via `@supabase/ssr`) arrive with the auth swap (docs/13 §(b)/(c)).
 *
 * Reads the public `NEXT_PUBLIC_*` vars. Throws if either is missing.
 */
export function supabaseAnonServer(): SupabaseClient {
  if (_anonServer) return _anonServer;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "supabaseAnonServer(): missing NEXT_PUBLIC_SUPABASE_URL or " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (see docs/13 §(a))."
    );
  }

  _anonServer = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _anonServer;
}
