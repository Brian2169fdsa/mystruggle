import { NextResponse } from "next/server";
import { getRoleUser } from "@/app/lib/auth";
import {
  db,
  save,
  uid,
  emitContinuumEvent,
  emitNotification,
  findUserById,
} from "@/app/lib/store";

// ── Staff engagement types (docs/16 Part C) ─────────────────────────────
// Local structural types - the store arrays are landing concurrently, so this
// route guards with `??=` and matches the agreed shapes exactly.

type EngagementKind =
  | "kudos"
  | "nudge"
  | "checkin"
  | "session_note"
  | "call"
  | "hallway";

const KINDS: EngagementKind[] = [
  "kudos",
  "nudge",
  "checkin",
  "session_note",
  "call",
  "hallway",
];

interface StaffEngagement {
  id: string;
  memberId: string;
  staffId: string;
  kind: EngagementKind;
  body?: string;
  mood?: number;
  occurredAt: number;
}

type EngagementDb = ReturnType<typeof db> & {
  staffEngagements?: StaffEngagement[];
};

const MAX_BODY = 400;

/**
 * POST /api/staff-engagements (staff) { memberId, kind, body?, mood? }
 * Logs one lightweight human touch. Engagement notes only - never clinical or
 * medical details (docs/14 rule; enforced as copy + a 400-char cap, not a
 * content scanner). Every touch also emits a continuum_event (source
 * "checkin", weight 2) so human contact itself is a measured engagement
 * input; kudos additionally land as a warm notification in the member's inbox.
 */
export async function POST(req: Request) {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const memberId = String(payload.memberId ?? "");
  const kind = payload.kind as EngagementKind;
  const body =
    payload.body === undefined ? undefined : String(payload.body).trim();
  const mood = payload.mood === undefined ? undefined : Number(payload.mood);

  const member = findUserById(memberId);
  if (!member || member.role !== "member") {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json(
      { error: "Unknown engagement kind." },
      { status: 400 }
    );
  }
  if (body !== undefined && body.length > MAX_BODY) {
    return NextResponse.json(
      { error: `Keep it short and warm - ${MAX_BODY} characters max.` },
      { status: 400 }
    );
  }
  if (mood !== undefined) {
    if (kind !== "checkin") {
      return NextResponse.json(
        { error: "Mood belongs to check-ins only." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
      return NextResponse.json(
        { error: "Mood must be 1-5." },
        { status: 400 }
      );
    }
  }

  const d = db() as EngagementDb;
  d.staffEngagements ??= [];

  const engagement: StaffEngagement = {
    id: uid(),
    memberId,
    staffId: me.id,
    kind,
    body: body || undefined,
    mood,
    occurredAt: Date.now(),
  };
  d.staffEngagements.push(engagement);
  save();

  // Human contact is a measured engagement input (docs/16 Part C). Reuses the
  // EXISTING continuum source "checkin" - no new source is invented.
  emitContinuumEvent(memberId, "checkin", 2, engagement.id);

  // Kudos land as a warm notification in the member's inbox.
  if (kind === "kudos") {
    emitNotification(
      memberId,
      "system",
      "\u{1F49B} Kudos from your care team",
      body || "Your care team noticed your progress this week. Keep going.",
      "kudos"
    );
  }

  return NextResponse.json({ engagement });
}

/**
 * GET /api/staff-engagements?memberId= (staff)
 * The latest 30 touches for one member (any staff), newest first, with each
 * sender's first name for display.
 */
export async function GET(req: Request) {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required." }, { status: 400 });
  }

  const d = db() as EngagementDb;
  d.staffEngagements ??= [];

  const engagements = d.staffEngagements
    .filter((e) => e.memberId === memberId)
    .sort((a, b) => b.occurredAt - a.occurredAt)
    .slice(0, 30)
    .map((e) => ({
      ...e,
      staffName: findUserById(e.staffId)?.name ?? "Care team",
    }));

  return NextResponse.json({ engagements });
}
