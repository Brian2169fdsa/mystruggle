// Browser (anon) Supabase client. Safe to import from client components:
// it uses only the public `NEXT_PUBLIC_*` vars — the anon key is designed to
// ship to the browser, RLS is the security boundary (docs/13 §(a)). Never put
// the service-role key here; that lives in `server.ts` (server-only).
//
// INERT until cutover: no client component imports this yet. It exists so
// future realtime/read work (docs/13 phase 7) can subscribe under RLS once
// `DATA_BACKEND=supabase`.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One client per browser tab (module singleton across a page's lifetime).
let _browser: SupabaseClient | null = null;

/**
 * Anon client for the browser. Memoized. Throws if the public env vars are
 * missing so a misconfigured build surfaces immediately rather than making
 * unauthenticated calls against a wrong/empty URL.
 */
export function supabaseBrowser(): SupabaseClient {
  if (_browser) return _browser;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "supabaseBrowser(): missing NEXT_PUBLIC_SUPABASE_URL or " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (see docs/13 §(a))."
    );
  }

  _browser = createClient(url, anonKey);
  return _browser;
}
