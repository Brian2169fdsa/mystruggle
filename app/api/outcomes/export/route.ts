import { getRoleUser } from "@/app/lib/auth";
import { buildFrame, buildLicensed, SUPPRESSED } from "../compute";

/**
 * GET /api/outcomes/export?plane=licensed  (staff only)
 *
 * The "grant-ready / licensor packet" export: a downloadable CSV of the
 * DE-IDENTIFIED, AGGREGATED outcomes (k≥11 enforced — see compute.ts). Only the
 * licensed plane is exportable: an identifiable single-center roster is never a
 * file that leaves the building (docs/10 §6 / requirements/11 §H).
 */
export async function GET(req: Request) {
  const staff = await getRoleUser(); // no roles → staff only
  if (!staff) {
    return new Response(JSON.stringify({ error: "Staff sign-in required." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const plane = new URL(req.url).searchParams.get("plane") ?? "licensed";
  if (plane !== "licensed") {
    return new Response(
      JSON.stringify({ error: "Only plane=licensed is exportable." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const data = buildLicensed(buildFrame());

  // Render a suppressed/null aggregate as the human-readable suppression token.
  const v = (x: number | null | undefined) =>
    x === null || x === undefined ? SUPPRESSED : String(x);
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows: (string | number)[][] = [];
  const row = (...cells: (string | number)[]) => rows.push(cells);

  row("section", "metric", "group", "value");
  row("meta", "de-identified", "", String(data.deidentified));
  row("meta", "min cohort (k)", "", data.minCohort);
  row("meta", "population", "", data.population);
  row("meta", "licensing blocked until counsel items checked", "",
    String(data.governance.licensingBlockedUntilCounselItemsChecked));

  // mv_continuum_score
  const sc = data.mvContinuumScore;
  row("mv_continuum_score", "members", "", sc.n);
  row("mv_continuum_score", "avg", "", v(sc.avg));
  row("mv_continuum_score", "median", "", v(sc.median));
  for (const b of sc.buckets) row("mv_continuum_score", "bucket", b.label, v(b.count));

  // mv_care_outcomes
  const co = data.mvCareOutcomes;
  for (const t of co.phaseTransitionRates)
    row("mv_care_outcomes", "phase_transition", `${t.from}→${t.to}`, v(t.count));
  for (const l of co.completionByLoc)
    row("mv_care_outcomes", "completion_pct", `${l.loc} (n=${l.episodes})`, v(l.completionPct));
  for (const r of co.retentionInRecovery)
    row("mv_care_outcomes", "retention_pct", `${r.day}d (eligible=${r.eligible})`, v(r.pct));
  row("mv_care_outcomes", "recovery_capital", "pre", v(co.recoveryCapitalDelta.pre));
  row("mv_care_outcomes", "recovery_capital", "during", v(co.recoveryCapitalDelta.during));
  row("mv_care_outcomes", "recovery_capital", "post", v(co.recoveryCapitalDelta.post));

  // mv_efficacy
  for (const q of data.mvEfficacy.quartiles) {
    row("mv_efficacy", "avg_score", q.label, v(q.avgScore));
    row("mv_efficacy", "retention90_pct", q.label, v(q.retention90Pct));
    row("mv_efficacy", "avg_goals_achieved", q.label, v(q.avgGoalsAchieved));
  }

  const csv = rows.map((r) => r.map((c) => esc(String(c))).join(",")).join("\n") + "\n";

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv;charset=utf-8",
      "content-disposition": 'attachment; filename="licensed-outcomes.csv"',
    },
  });
}
