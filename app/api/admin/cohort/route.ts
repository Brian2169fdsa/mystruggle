import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";

/**
 * GET /api/admin/cohort  (staff-only, read-only)
 *
 * The center's IN-PROGRAM members grouped into cohorts (docs/14 program
 * cockpit). A cohort is a level-of-care grouping, joined where possible to a
 * seeded `program_group` care channel so the cockpit can preview the group
 * conversation. Per-member live engagement is derived from `continuum_events`.
 *
 * Defensive by contract: the care-channel / cadence collections are seeded by
 * concurrent agents and may not exist on the store yet, so every optional
 * collection is read through `?? []`. The route still returns real cohorts
 * (from LOC grouping) even before those agents land.
 */

const DAY = 86_400_000;
const NINETY_DAYS = 90 * DAY;
const SCORE_K = 40;

const LOC_LABEL: Record<string, string> = {
  detox: "Detox",
  residential: "Residential",
  php: "PHP",
  iop: "IOP",
  op: "OP",
  recovery_maintenance: "Recovery Maintenance",
};
// Preferred cohort display order (clinical intensity, high → step-down).
const LOC_ORDER = ["detox", "residential", "php", "iop", "op", "recovery_maintenance"];

// ── Loosely-typed views over db() ─────────────────────────────────────
// These collections are added to the store by concurrent data agents; we read
// them structurally rather than importing types that may not exist yet.
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
type EventLike = {
  memberId: string;
  source?: string;
  weight: number;
  occurredAt: number;
};
type ChannelLike = {
  id: string;
  centerId?: string;
  kind?: string;
  title?: string;
  cohortId?: string;
};
type StaffDb = {
  users: UserLike[];
  careEpisodes: EpisodeLike[];
  continuumEvents: EventLike[];
  careChannels?: ChannelLike[];
};

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

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
  const careChannels = d.careChannels ?? [];

  const userById = new Map(users.map((u) => [u.id, u]));

  // Shared "now" = the dataset's leading edge (seed is anchored to a fixed
  // epoch, so wall-clock windows would read as stale). Mirrors /api/continuum.
  const refNow =
    continuumEvents.reduce((mx, e) => (e.occurredAt > mx ? e.occurredAt : mx), 0) ||
    Date.now();
  const win30 = refNow - 30 * DAY;
  const win60 = refNow - 60 * DAY;

  // Per-member event stats, indexed once (keeps the route O(events)).
  const stat = new Map<
    string,
    { e30: number; prior: number; attended: number; last: number; raw90: number }
  >();
  for (const ev of continuumEvents) {
    let s = stat.get(ev.memberId);
    if (!s) {
      s = { e30: 0, prior: 0, attended: 0, last: 0, raw90: 0 };
      stat.set(ev.memberId, s);
    }
    if (ev.occurredAt > s.last) s.last = ev.occurredAt;
    if (ev.occurredAt >= refNow - NINETY_DAYS) s.raw90 += ev.weight;
    if (ev.occurredAt >= win30) {
      s.e30 += 1;
      if (ev.source === "session" || ev.source === "lms" || ev.source === "checkin") {
        s.attended += 1;
      }
    } else if (ev.occurredAt >= win60) {
      s.prior += 1;
    }
  }

  // Latest in-program episode per member for this center.
  const inProgram = careEpisodes
    .filter((e) => e.carePhase === "in_program" && (!centerId || e.centerId === centerId))
    .sort((a, b) => b.startedAt - a.startedAt);
  const seen = new Set<string>();

  // Group members by level of care (the natural cohort).
  const byLoc = new Map<
    string,
    Array<{
      id: string;
      name: string;
      memberNumber: string;
      avatarColor: string;
      engagement30d: number;
      lastActive: number;
      attendancePct: number;
      atRisk: boolean;
    }>
  >();

  for (const ep of inProgram) {
    if (seen.has(ep.memberId)) continue;
    seen.add(ep.memberId);
    const u = userById.get(ep.memberId);
    if (!u || u.role !== "member") continue;
    const loc = ep.levelOfCare ?? "iop";
    const s = stat.get(ep.memberId) ?? {
      e30: 0,
      prior: 0,
      attended: 0,
      last: 0,
      raw90: 0,
    };
    // Attendance proxy: session/lms/check-in events vs a ~12/mo expectation,
    // with a soft floor from overall activity so a busy member never reads 0%.
    const attendancePct = clampPct(
      Math.max((s.attended / 12) * 100, (Math.min(s.e30, 12) / 12) * 55)
    );
    const atRisk = (s.prior > 0 && s.e30 < s.prior) || s.e30 === 0;
    const row = {
      id: u.id,
      name: u.name,
      memberNumber: u.memberNumber ?? "",
      avatarColor: u.avatarColor ?? "#4E5B9B",
      engagement30d: s.e30,
      lastActive: s.last,
      attendancePct,
      atRisk,
    };
    const list = byLoc.get(loc);
    if (list) list.push(row);
    else byLoc.set(loc, [row]);
  }

  // Program-group channels for this center, to attach a live conversation.
  const groupChannels = careChannels.filter(
    (c) => c.kind === "program_group" && (!centerId || c.centerId === centerId)
  );
  const usedChannels = new Set<string>();

  const locsPresent = [...byLoc.keys()].sort(
    (a, b) => LOC_ORDER.indexOf(a) - LOC_ORDER.indexOf(b)
  );

  const cohorts = locsPresent.map((loc, idx) => {
    const label = LOC_LABEL[loc] ?? loc;
    // Match a seeded channel by cohortId, title keyword, then positional order.
    let channel =
      groupChannels.find(
        (c) => !usedChannels.has(c.id) && c.cohortId === `cohort-${loc}`
      ) ??
      groupChannels.find(
        (c) =>
          !usedChannels.has(c.id) &&
          (c.title ?? "").toLowerCase().includes(loc.replace("_", " "))
      ) ??
      groupChannels.filter((c) => !usedChannels.has(c.id))[0];
    if (channel) usedChannels.add(channel.id);

    const members = byLoc
      .get(loc)!
      .sort((a, b) => b.engagement30d - a.engagement30d);

    return {
      cohortId: channel?.cohortId ?? `cohort-${loc}`,
      title: channel?.title ?? `${label} Cohort`,
      levelOfCare: loc,
      channelId: channel?.id ?? null,
      members,
    };
  });

  return NextResponse.json({ cohorts });
}
