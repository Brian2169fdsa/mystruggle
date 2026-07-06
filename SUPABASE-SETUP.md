# Supabase Setup — Operator Runbook

Concise, hands-on steps to stand up the Supabase backend for "My Struggle".
This is the *mechanical* runbook; the full phased plan, the store→table map,
and the RLS verification gates live in **`docs/13-SUPABASE-MIGRATION.md`** —
read §(f) and §(h) before you flip anything.

> The app ships with `DATA_BACKEND=memory` and behaves identically to before.
> Nothing here changes runtime behavior until the cutover (§(f) phase 8).

---

## 0. Rotate the pasted keys before go-live (READ THIS)

> **⚠️ The Supabase keys currently in `.env.local` were pasted into a chat and
> must be treated as compromised. ROTATE them before go-live.**
>
> Supabase Dashboard → Settings → API → *Rotate* the `anon` and
> `service_role` keys (and reset the database password, which invalidates any
> shared `SUPABASE_DB_URL`). Then update `.env.local` and the Vercel project
> env with the fresh values. Do this before any real (non-demo) data exists.

`.env.local` is gitignored (`.env*.local`), so secrets are not committed — but
"not committed" is not "not leaked". Rotation is the fix.

---

## 1. Network egress allowlist

Migrations and the app talk to Supabase over the network. Ensure the sandbox /
CI egress allowlist includes these hosts:

- `uvswihqvmmwqqumofblu.supabase.co` — REST/Auth + the direct DB host
  (`db.uvswihqvmmwqqumofblu.supabase.co`)
- `*.pooler.supabase.com` — the connection pooler (used by some DB URIs)

**A new session may be required for a changed allowlist to take effect.** If
`psql` or a client call hangs/refuses, re-check the allowlist and start a fresh
session before debugging anything else.

---

## 2. Environment variables

Four vars (see `docs/13 §(a)`). Two are public, two are secret:

| Var | Public? | Used by | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | app (browser + server) | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | app (browser + server) | safe in the browser — **RLS is the guard** |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** | server-only code | bypasses RLS. NEVER `NEXT_PUBLIC_*`, never in a client bundle |
| `SUPABASE_DB_URL` | **SECRET** | migration scripts only | not read by the app |

Plus the transition flag:

| Var | Value | Meaning |
|---|---|---|
| `DATA_BACKEND` | `memory` (default) / `supabase` | selects the data layer (§4) |

Secrets live in `.env.local` (gitignored) locally and in the Vercel project env
in deploys. `.env.local` is loaded by the migration script automatically (§3).

---

## 3. Apply the schema

### 3a. Get the connection string

Supabase Dashboard → **Settings → Database → Connection string → URI**. Copy it
into `.env.local` (or export it in your shell) as:

```bash
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.uvswihqvmmwqqumofblu.supabase.co:5432/postgres
```

### 3b. Preview the order (no DB needed)

```bash
node scripts/apply-supabase.mjs --dry-run
```

Lists the SQL files in the canonical apply order (docs/13 §(h)) and marks any
that are missing (they are skipped, not fatal). Runs with no database and no
env — safe to run anytime.

### 3c. Apply for real

```bash
node scripts/apply-supabase.mjs
```

Runs `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f <file>` per file, in order,
streaming output, stopping on the first failure. Requires the `psql` client on
PATH and `SUPABASE_DB_URL` set.

Order applied:

1. `schema.sql`
2. `schema-expansion.sql`
3. `apply-employer-role.sql` — `alter type user_role add value 'employer'`
   (runs *outside* a transaction; the script does not wrap statements, so this
   autocommits as required)
4. `schema-run9-10.sql`
5. `policies.sql` (defines helper fns; must precede the next file)
6. `policies-expansion.sql`
7. `policies-run9-10.sql`
8. `outcomes-analytics.sql`
9. `seed.sql`

Then run the verification gates in `docs/13 §(f)` / §(h) (RLS policy counts,
negative tests, `select analytics.refresh_outcomes();`).

---

## 4. The `DATA_BACKEND` flag + rollback

The app reads `DATA_BACKEND` through `app/lib/supabase` `dataBackend()`:

- `memory` (default) → the in-memory `app/lib/store.ts`. Any value other than
  the exact string `supabase` also resolves to `memory`.
- `supabase` → the Supabase backend (once route work is wired in phases 5–6).

**Cutover:** set `DATA_BACKEND=supabase` in Vercel and redeploy (docs/13 §(f)
phase 8).

**Rollback:** set it back to `memory` and redeploy — **no code revert**
(docs/13 §(g)). Caveat: auth sessions do not survive a rollback (Supabase
cookies ≠ the old HMAC cookie), so users re-login; data written to Supabase
during the window stays there while the memory store reseeds.

Keep `app/lib/store.ts` and the flag intact until the cutover has survived a
week of audits (docs/13 §(f) phase 8 / §(g)).
