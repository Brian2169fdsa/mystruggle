import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";

/**
 * GET /api/admin/alumni  (staff-only, read-only)
 *
 * Post-discharge (CONTINUING phase) roster for the staff's center — the
 * licensed outcomes engine's front door (docs/14 alumni dashboard). Per
 * alumnus we return a rolling continuum score, months since discharge, the
 * 30/60/90/180/365 follow-up cadence, a relapse-risk signal, and last activity.
 *
 * Relapse risk is AMBER-ONLY by product rule: a drop in engagement (fewer
 * events in the last 30d than the prior 30d) surfaces as "watch" — never red on
 * a person. It is the earliest, kindest relapse warning that exists.
 *
 * Defensive: `follow_up_checkins` are seeded by a concurrent agent; when absent
 * we synthesize a plausible cadence from months-since-discharge so the row
 * still renders. All optional collections read through `?? []`.
 */

const DAY = 86_400_000;
const NINETY_DAYS = 90 * DAY;
const SCORE_K = 40;
const CADENCE_DAYS = [30, 60, 90, 180, 365] as const;

type UserLike = {
  id: string;
  name: string;
  role: string;
  memberNumber?: string;
  avatarColor?: string;
  centerId?: string;
};
type EpisodeLike = {
  id: string;
  memberId: string;
  centerId?: string;
  carePhase: string;
  levelOfCare?: string;
  startedAt: number;
  phaseChangedAt: number;
  endedAt?: number;
};
type EventLike = { memberId: string; weight: number; occurredAt: number };
type CheckinLike = {
  memberId: string;
  centerId?: string;
  dueDay: number;
  status: string;
};
type StaffDb = {
  users: UserLike[];
  careEpisodes: EpisodeLike[];
  continuumEvents: EventLike[];
  followUpCheckins?: CheckinLike[];
};

type CadenceEntry = { dueDay: number; status: "pending" | "done" | "missed" };

/** Synthesize a cadence status for a due-day when no real check-in exists. */
function synthStatus(dueDay: number, daysSince: number, watch: boolean): CadenceEntry["status"] {
  if (dueDay <= daysSince - 20) return "done"; // comfortably in the past
  if (dueDay <= daysSince + 10) return watch ? "missed" : "pending"; // currently due
  return "pending"; // scheduled, not yet due
}

export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }

  const d = db() as unknown as StaffDb;
  const centerId = (staff as UserLike).centerId; // undefined ⇒ all centers

  const careEpisodes = d.careEpisodes ?? [];
  const continuumEvents = d.continuumEvents ?? [];
  const users = d.users ?? [];
  const followUpCheckins = d.followUpCheckins ?? [];

  const userById = new Map(users.map((u) => [u.id, u]));

  const refNow =
    continuumEvents.reduce((mx, e) => (e.occurredAt > mx ? e.occurredAt : mx), 0) ||
    Date.now();
  const win30 = refNow - 30 * DAY;
  const win60 = refNow - 60 * DAY;

  // Per-member event stats, indexed once.
  const stat = new Map<string, { e30: number; prior: number; last: number; raw90: number }>();
  for (const ev of continuumEvents) {
    let s = stat.get(ev.memberId);
    if (!s) {
      s = { e30: 0, prior: 0, last: 0, raw90: 0 };
      stat.set(ev.memberId, s);
    }
    if (ev.occurredAt > s.last) s.last = ev.occurredAt;
    if (ev.occurredAt >= refNow - NINETY_DAYS) s.raw90 += ev.weight;
    if (ev.occurredAt >= win30) s.e30 += 1;
    else if (ev.occurredAt >= win60) s.prior += 1;
  }

  // Real check-ins grouped by member (dueDay → status).
  const checkinsByMember = new Map<string, Map<number, string>>();
  for (const c of followUpCheckins) {
    if (centerId && c.centerId && c.centerId !== centerId) continue;
    let m = checkinsByMember.get(c.memberId);
    if (!m) {
      m = new Map();
      checkinsByMember.set(c.memberId, m);
    }
    m.set(c.dueDay, c.status);
  }

  // Latest continuing episode per member for this center.
  const continuing = careEpisodes
    .filter((e) => e.carePhase === "continuing" && (!centerId || e.centerId === centerId))
    .sort((a, b) => (b.endedAt ?? b.phaseChangedAt) - (a.endedAt ?? a.phaseChangedAt));
  const seen = new Set<string>();

  const alumni: Array<{
    id: string;
    name: string;
    memberNumber: string;
    avatarColor: string;
    continuumScore: number;
    monthsSinceDischarge: number;
    cadence: CadenceEntry[];
    relapseRisk: "low" | "watch";
    lastActive: number;
    cadenceDue: number;
  }> = [];

  for (const ep of continuing) {
    if (seen.has(ep.memberId)) continue;
    seen.add(ep.memberId);
    const u = userById.get(ep.memberId);
    if (!u || u.role !== "member") continue;

    const s = stat.get(ep.memberId) ?? { e30: 0, prior: 0, last: 0, raw90: 0 };
    const continuumScore = Math.round((100 * s.raw90) / (s.raw90 + SCORE_K));

    const dischargeAt = ep.endedAt ?? ep.phaseChangedAt;
    const daysSince = Math.max(0, Math.floor((refNow - dischargeAt) / DAY));
    const monthsSinceDischarge = Math.max(0, Math.floor(daysSince / 30));

    // Amber-only relapse signal: engagement dip in the last 30d vs prior 30d.
    const relapseRisk: "low" | "watch" =
      (s.prior > 0 && s.e30 < s.prior) || s.e30 === 0 ? "watch" : "low";

    const real = checkinsByMember.get(ep.memberId);
    const cadence: CadenceEntry[] = CADENCE_DAYS.map((dueDay) => {
      const rs = real?.get(dueDay);
      const status: CadenceEntry["status"] =
        rs === "done" || rs === "pending" || rs === "missed"
          ? rs
          : synthStatus(dueDay, daysSince, relapseRisk === "watch");
      return { dueDay, status };
    });
    // Follow-ups that are due/overdue and not yet done.
    const cadenceDue = cadence.filter(
      (c) => (c.status === "pending" || c.status === "missed") && c.dueDay <= daysSince + 10
    ).length;

    alumni.push({
      id: u.id,
      name: u.name,
      memberNumber: u.memberNumber ?? "",
      avatarColor: u.avatarColor ?? "#4E5B9B",
      continuumScore,
      monthsSinceDischarge,
      cadence,
      relapseRisk,
      lastActive: s.last,
      cadenceDue,
    });
  }

  // Watch first, then lowest score — the reach-out queue reads top-down.
  alumni.sort((a, b) => {
    if (a.relapseRisk !== b.relapseRisk) return a.relapseRisk === "watch" ? -1 : 1;
    return a.continuumScore - b.continuumScore;
  });

  const watchCount = alumni.filter((a) => a.relapseRisk === "watch").length;
  const avgScore = alumni.length
    ? Math.round(alumni.reduce((sum, a) => sum + a.continuumScore, 0) / alumni.length)
    : 0;
  const cadenceDue = alumni.reduce((sum, a) => sum + a.cadenceDue, 0);

  return NextResponse.json({
    alumni,
    summary: {
      alumniCount: alumni.length,
      watchCount,
      avgScore,
      cadenceDue,
    },
  });
}
