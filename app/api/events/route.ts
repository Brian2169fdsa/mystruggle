import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser, getRoleUser } from "@/app/lib/auth";
import type { CommunityEvent, EventKind, EventRsvp } from "@/app/lib/types";

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

const EVENT_KINDS: EventKind[] = [
  "meeting",
  "celebration",
  "workshop",
  "community",
];

/** Decorate an event with its RSVP count + whether this viewer RSVP'd. */
function enrichEvent(event: CommunityEvent, viewerId?: string) {
  const d = eventStore();
  const rsvps = d.eventRsvps.filter((r) => r.eventId === event.id);
  return {
    ...event,
    rsvpCount: rsvps.length,
    iRsvped: viewerId ? rsvps.some((r) => r.userId === viewerId) : false,
  };
}

/** GET — every community event, upcoming (soonest) first, then past.
 *  Open to all; iRsvped reflects the signed-in viewer when present. */
export async function GET() {
  const user = await getSessionUser();
  const d = eventStore();
  const nowTs = Date.now();
  const upcoming = d.events
    .filter((e) => e.startsAt >= nowTs)
    .sort((a, b) => a.startsAt - b.startsAt);
  const past = d.events
    .filter((e) => e.startsAt < nowTs)
    .sort((a, b) => b.startsAt - a.startsAt);
  const events = [...upcoming, ...past].map((e) => enrichEvent(e, user?.id));
  return NextResponse.json({ events });
}

/** POST — create an event. Mentors and staff only (staff pass every gate). */
export async function POST(req: Request) {
  const user = await getRoleUser("mentor");
  if (!user) {
    return NextResponse.json(
      { error: "Only mentors and staff can create events." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const location = String(body?.location ?? "").trim();
  const startsAt = Number(body?.startsAt);
  const kind = String(body?.kind ?? "") as EventKind;
  if (!title || !description || !location || !EVENT_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: "Title, description, location, and a valid kind are required." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(startsAt) || startsAt <= 0) {
    return NextResponse.json(
      { error: "A valid start time is required." },
      { status: 400 }
    );
  }
  let endsAt: number | undefined;
  if (body?.endsAt != null) {
    const e = Number(body.endsAt);
    if (!Number.isFinite(e) || e < startsAt) {
      return NextResponse.json(
        { error: "End time must be after the start time." },
        { status: 400 }
      );
    }
    endsAt = e;
  }

  const d = eventStore();
  const event: CommunityEvent = {
    id: uid(),
    centerId: user.centerId,
    creatorId: user.id,
    title,
    description,
    startsAt,
    endsAt,
    location,
    kind,
    createdAt: Date.now(),
  };
  d.events.push(event);
  save();
  return NextResponse.json({ event });
}
