#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// apply-supabase.mjs — DDL runner for the Supabase migration package.
//
// Applies the SQL files under supabase/ IN THE CANONICAL ORDER documented in
// docs/13-SUPABASE-MIGRATION.md §(h). Shells out to `psql` per file with
// ON_ERROR_STOP so the run halts on the first failure. This does NOT touch the
// running app — it is an operator tool. See SUPABASE-SETUP.md for the runbook.
//
// Usage:
//   node scripts/apply-supabase.mjs            # apply all files in order
//   node scripts/apply-supabase.mjs --dry-run  # list the ordered files only
//
// Env: SUPABASE_DB_URL (Postgres connection URI). This script also does a tiny
// manual parse of .env.local (no dotenv dependency) so you can keep the URL
// there. --dry-run needs NO database and NO env.
//
// NOTE on apply-employer-role.sql: its `alter type public.user_role add value
// 'employer'` cannot run inside a transaction block. `psql -f` autocommits
// each top-level statement (we do NOT pass -1/--single-transaction), so the
// enum add commits on its own — which is exactly what this needs.
// ─────────────────────────────────────────────────────────────────────────

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SQL_DIR = join(REPO_ROOT, "supabase");

// Canonical apply order (docs/13 §(h), extended with the run9-10 + employer
// enum files). Files that don't exist yet are SKIPPED with a warning rather
// than failing the run, so this stays runnable as the package grows.
//   1. schema.sql            — v1 tables + enums + signup trigger
//   2. schema-expansion.sql  — v2 enums + tables + indexes
//   3. apply-employer-role.sql — `alter type user_role add value 'employer'`
//                                (runs outside a txn; see note above)
//   4. schema-run9-10.sql    — seed v9/v10 tables (care channels, consent,
//                              follow-ups, job_posts)
//   5. policies.sql          — v1 RLS + helper fns (is_staff/is_mentor/…)
//                              — MUST precede policies-expansion.sql
//   6. policies-expansion.sql— v2 RLS + consent helpers + placement_stats()
//   7. policies-run9-10.sql  — RLS for the run9-10 tables
//   8. outcomes-analytics.sql— analytics/licensed planes + licensed_research
//   9. seed.sql              — flagship demo rows
const ORDERED_FILES = [
  "schema.sql",
  "schema-expansion.sql",
  "apply-employer-role.sql",
  "schema-run9-10.sql",
  "policies.sql",
  "policies-expansion.sql",
  "policies-run9-10.sql",
  "outcomes-analytics.sql",
  "seed.sql",
];

const dryRun = process.argv.includes("--dry-run");

/** Tiny .env.local parser — no dependency. Only fills vars not already set. */
function loadEnvLocal() {
  const envPath = join(REPO_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let val = line.slice(eq + 1).trim();
    // strip surrounding quotes if present
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

/** Resolve the ordered list into { file, path, exists }. */
function resolveFiles() {
  return ORDERED_FILES.map((file) => {
    const path = join(SQL_DIR, file);
    return { file, path, exists: existsSync(path) };
  });
}

function printPlan(files) {
  console.log("Apply order (docs/13 §(h)):\n");
  files.forEach(({ file, exists }, i) => {
    const n = String(i + 1).padStart(2, " ");
    const mark = exists ? "✓ present" : "· missing (will skip)";
    console.log(`  ${n}. ${file.padEnd(26)} ${mark}`);
  });
  console.log("");
}

function main() {
  const files = resolveFiles();

  if (dryRun) {
    console.log("DRY RUN — no database connection, nothing executed.\n");
    printPlan(files);
    const present = files.filter((f) => f.exists).length;
    const missing = files.length - present;
    console.log(
      `Would apply ${present} file(s); ${missing} missing and skipped.`
    );
    console.log(
      "Run for real (with SUPABASE_DB_URL set): node scripts/apply-supabase.mjs"
    );
    return;
  }

  loadEnvLocal();
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "ERROR: SUPABASE_DB_URL is not set.\n\n" +
        "Copy the Postgres connection string from:\n" +
        "  Supabase Dashboard → Settings → Database → Connection string (URI)\n" +
        "then set it in your shell or in .env.local, e.g.:\n" +
        "  SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres\n\n" +
        "(Preview the plan without a DB: node scripts/apply-supabase.mjs --dry-run)"
    );
    process.exit(1);
  }

  printPlan(files);

  const applied = [];
  const skipped = [];

  for (const { file, path, exists } of files) {
    if (!exists) {
      console.warn(`SKIP  ${file} — file not found, continuing.`);
      skipped.push(file);
      continue;
    }
    console.log(`\n── Applying ${file} ─────────────────────────────────────`);
    // No -1/--single-transaction: each statement autocommits, which the
    // `alter type ... add value` in apply-employer-role.sql requires.
    const res = spawnSync(
      "psql",
      [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", path],
      { stdio: "inherit" }
    );

    if (res.error) {
      console.error(
        `\nFAILED to launch psql for ${file}: ${res.error.message}\n` +
          "Is the Postgres client (psql) installed and on PATH?"
      );
      process.exit(1);
    }
    if (res.status !== 0) {
      console.error(
        `\nFAILED on ${file} (psql exit ${res.status}). Stopping — ` +
          `${applied.length} file(s) applied before this one.`
      );
      process.exit(res.status || 1);
    }
    applied.push(file);
  }

  console.log("\n════════════════════════════════════════════════════════");
  console.log("Done.");
  console.log(`  Applied (${applied.length}): ${applied.join(", ") || "none"}`);
  console.log(`  Skipped (${skipped.length}): ${skipped.join(", ") || "none"}`);
  console.log(
    "\nNext steps:\n" +
      "  1. Verify per docs/13 §(f)/§(h) (RLS counts, negative tests,\n" +
      "     `select analytics.refresh_outcomes();`).\n" +
      "  2. Load bulk seed if applicable.\n" +
      "  3. Only then flip DATA_BACKEND=supabase (docs/13 §(f) phase 8)."
  );
}

main();
