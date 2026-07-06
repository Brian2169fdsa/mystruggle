import { NextResponse } from "next/server";
import { getRoleUser } from "@/app/lib/auth";
import { db } from "@/app/lib/store";

// ── Care-team types (docs/16 Part C) ────────────────────────────────────
// The data layer for care_team_assignments / staff_engagements is landing
// concurrently; these local structural types match the agreed shapes exactly
// and the arrays are guarded with `??=` so this route works either way.

type CareTeamRole =
  | "case_manager"
  | "counselor"
  | "peer_support"
  | "tech"
  | "facilitator";

interface CareTeamAssignment {
  id: string;
  memberId: string;
  careEpisodeId?: string;
  staffId: string;
  role: CareTeamRole;
  isPrimary: boolean;
  assignedAt: number;
  endedAt?: number;
}

interface StaffEngagement {
  id: string;
  memberId: string;
  staffId: string;
  kind: "kudos" | "nudge" | "checkin" | "session_note" | "call" | "hallway";
  body?: string;
  mood?: number;
  occurredAt: number;
}

type CareDb = ReturnType<typeof db> & {
  careTeamAssignments?: CareTeamAssignment[];
  staffEngagements?: StaffEngagement[];
};

const DAY = 86_400_000;

/** One caseload row - a member this staff person is on the care team for. */
type CaseloadClient = {
  id: string;
  name: string;
  memberNumber: string;
  avatarColor: string;
  role: CareTeamRole; // MY care-team role for this member
  isPrimary: boolean;
  risk: "ok" | "watch";
  lastTouchAt: number | null; // latest staff_engagement by ANY staff
  untouchedDays: number;
  /** The member's existing 1:1 care channel (docs/14 §D) so the caseload can
   *  offer "Message" through the channel API - null when none exists yet. */
  channelId: string | null;
};

/**
 * GET /api/caseload (staff)
 * Members with an ACTIVE care-team assignment (endedAt unset) whose staffId is
 * the signed-in staff person. lastTouchAt/untouchedDays come from the latest
 * staff_engagement by ANY staff (human contact is human contact); risk "watch"
 * when untouched 3+ days or the member's streak is 0. Watch rows first, then
 * oldest-touch first - the person waiting longest is at the top.
 */
export async function GET() {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const d = db() as CareDb;
  d.careTeamAssignments ??= [];
  d.staffEngagements ??= [];

  const now = Date.now();

  // My active assignments, one row per member (primary assignment wins when
  // I hold more than one role for the same member).
  const mine = d.careTeamAssignments.filter(
    (a) => a.staffId === me.id && a.endedAt === undefined
  );
  const byMember = new Map<string, CareTeamAssignment>();
  for (const a of mine) {
    const cur = byMember.get(a.memberId);
    if (!cur || (a.isPrimary && !cur.isPrimary)) byMember.set(a.memberId, a);
  }

  // Latest ANY-staff touch per member, one pass over engagements.
  const lastTouch = new Map<string, number>();
  for (const e of d.staffEngagements) {
    const cur = lastTouch.get(e.memberId) ?? 0;
    if (e.occurredAt > cur) lastTouch.set(e.memberId, e.occurredAt);
  }

  const clients: CaseloadClient[] = [];
  for (const [memberId, a] of byMember) {
    const member = d.users.find((u) => u.id === memberId && u.role === "member");
    if (!member) continue;

    const lastTouchAt = lastTouch.get(memberId) ?? null;
    // Never touched: days since the assignment began, so a fresh assignment
    // doesn't start at zero forever.
    const untouchedDays = Math.max(
      0,
      Math.floor((now - (lastTouchAt ?? a.assignedAt)) / DAY)
    );
    const risk: CaseloadClient["risk"] =
      untouchedDays >= 3 || (member.streak ?? 0) === 0 ? "watch" : "ok";

    const channel = d.careChannels.find(
      (c) => c.kind === "one_to_one" && c.memberId === memberId
    );

    clients.push({
      id: member.id,
      name: member.name,
      memberNumber: member.memberNumber ?? "",
      avatarColor: member.avatarColor,
      role: a.role,
      isPrimary: a.isPrimary,
      risk,
      lastTouchAt,
      untouchedDays,
      channelId: channel?.id ?? null,
    });
  }

  // Watch first; within each group the person untouched longest leads.
  clients.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === "watch" ? -1 : 1;
    return (a.lastTouchAt ?? 0) - (b.lastTouchAt ?? 0);
  });

  return NextResponse.json({ clients });
}
