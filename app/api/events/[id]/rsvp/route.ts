import { NextResponse } from "next/server";
import { db, save, uid, emitContinuumEvent } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { CommunityEvent, EventRsvp } from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
type EngagementStore = {
  events?: CommunityEvent[];
  eventRsvps?: EventRsvp[];
};

function eventStore() {
  const d = db() as ReturnType<typeof db> & EngagementStore;
  d.events ??= [];
  d.eventRsvps ??= [];
  return d as ReturnType<typeof db> & Required<EngagementStore>;
}

/** Decorate an event with its RSVP count + whether this viewer RSVP'd —
 *  the same shape GET /api/events returns. */
function enrichEvent(event: CommunityEvent, viewerId?: string) {
  const d = eventStore();
  const rsvps = d.eventRsvps.filter((r) => r.eventId === event.id);
  return {
    ...event,
    rsvpCount: rsvps.length,
    iRsvped: viewerId ? rsvps.some((r) => r.userId === viewerId) : false,
  };
}

/** POST — { going: boolean }. Add or remove the signed-in member's RSVP.
 *  going=true emits a "community" continuum_event (weight 2) — an RSVP is an
 *  engagement signal. Idempotent: RSVP'ing twice keeps one row. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const { id } = await params;
  const d = eventStore();
  const event = d.events.find((e) => e.id === id);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const going = Boolean(body?.going);

  const existing = d.eventRsvps.find(
    (r) => r.eventId === id && r.userId === user.id
  );
  if (going) {
    if (!existing) {
      d.eventRsvps.push({
        id: uid(),
        eventId: id,
        userId: user.id,
        createdAt: Date.now(),
      });
      save();
      // An RSVP is an engagement signal → the continuum heartbeat.
      emitContinuumEvent(user.id, "community", 2, id);
    }
  } else if (existing) {
    d.eventRsvps = d.eventRsvps.filter(
      (r) => !(r.eventId === id && r.userId === user.id)
    );
    save();
  }

  return NextResponse.json({ event: enrichEvent(event, user.id) });
}
