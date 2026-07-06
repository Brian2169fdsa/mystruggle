import { NextResponse } from "next/server";
import { db, findUserById } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { CareEpisode } from "@/app/lib/types";

/**
 * GET /api/continuum?memberId=...
 *
 * One person's continuum-of-care record: their latest care episode, the
 * append-only phase-transition log, the unified continuum_events stream, a
 * 0–100 rolling engagement score, and a 14-month activity histogram for the
 * dashboard ribbon + sparkline.
 *
 * Authorization (least privilege): staff (supervise all), the member's OWN
 * mentor, or the member themselves. Everyone else → 403; no session → 401.
 */

// Saturating normalizer constant for the engagement score. score =
// 100 * raw / (raw + K), where raw = summed event weights in the trailing
// 90-day window. K is the "half-saturation" weight: at raw = K the score is
// 50, and it approaches (but never reaches) 100 as engagement climbs - so a
// very active member lands ~70–85 and inactivity decays toward 0. K = 40 was
// tuned against the seed so Danielle (dense, multi-module) reads as healthy.
const SCORE_K = 40;
const NINETY_DAYS = 90 * 86400e3;
const FOURTEEN_MONTHS = 14;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function GET(req: Request) {
  const memberId = new URL(req.url).searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json({ error: "memberId required." }, { status: 400 });
  }

  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const target = findUserById(memberId);
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const isStaff = me.role === "staff";
  const isSelf = me.id === memberId;
  const isTheirMentor = me.role === "mentor" && target.mentorId === me.id;
  if (!(isStaff || isSelf || isTheirMentor)) {
    return NextResponse.json(
      { error: "Not authorized to view this continuum record." },
      { status: 403 }
    );
  }

  const d = db();

  // Latest care episode for this member (by start).
  const episodes = d.careEpisodes
    .filter((e) => e.memberId === memberId)
    .sort((a, b) => b.startedAt - a.startedAt);
  const episode: CareEpisode | null = episodes[0] ?? null;

  // Transitions for that episode, chronological (append-only outcomes log).
  const transitions = episode
    ? d.phaseTransitions
        .filter((t) => t.episodeId === episode.id)
        .sort((a, b) => a.at - b.at)
    : [];

  // Member's full event stream (newest first), capped for transport.
  const memberEvents = d.continuumEvents
    .filter((e) => e.memberId === memberId)
    .sort((a, b) => b.occurredAt - a.occurredAt);
  const events = memberEvents.slice(0, 200);

  // Reference "now" = the platform's most recent recorded activity, not the
  // wall clock. Seed data is anchored to a fixed EPOCH, so a raw Date.now()
  // window would treat it as stale; anchoring to the dataset's leading edge
  // makes the rolling windows render live. In production the newest event ≈
  // real now, so behavior is identical - and score decay stays honest because
  // an inactive member's events fall outside the window measured from that
  // shared leading edge.
  const latest = d.continuumEvents.reduce(
    (mx, e) => (e.occurredAt > mx ? e.occurredAt : mx),
    0
  );
  const refNow = latest > 0 ? latest : Date.now();

  // Rolling engagement score: summed weights in the trailing 90 days.
  const windowStart = refNow - NINETY_DAYS;
  let raw = 0;
  for (const e of memberEvents) {
    if (e.occurredAt >= windowStart) raw += e.weight;
  }
  const score = Math.round((100 * raw) / (raw + SCORE_K));

  // 14-month activity histogram for the sparkline, oldest → newest.
  const anchor = new Date(refNow);
  const buckets: { month: string; count: number; weight: number; key: string }[] = [];
  for (let i = FOURTEEN_MONTHS - 1; i >= 0; i--) {
    const dte = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    buckets.push({
      month: MONTH_LABELS[dte.getMonth()],
      count: 0,
      weight: 0,
      key: `${dte.getFullYear()}-${dte.getMonth()}`,
    });
  }
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
  for (const e of memberEvents) {
    const dte = new Date(e.occurredAt);
    const idx = bucketIndex.get(`${dte.getFullYear()}-${dte.getMonth()}`);
    if (idx !== undefined) {
      buckets[idx].count++;
      buckets[idx].weight += e.weight;
    }
  }
  const monthlyActivity = buckets.map(({ month, count, weight }) => ({
    month,
    count,
    weight,
  }));

  return NextResponse.json({
    episode,
    transitions,
    events,
    score,
    monthlyActivity,
  });
}
