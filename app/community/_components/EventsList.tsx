"use client";

// Community events list + RSVP for /community/events.
//
// Codes DEFENSIVELY against a concurrently-built backend (another agent owns
// /api/events). CONTRACT:
//   GET  /api/events            -> { events: CommunityEvent[] }
//   POST /api/events/[id]/rsvp  { going:boolean } -> { event: CommunityEvent }
// While that route is still landing, GET may 404 / error - we degrade to a
// warm "coming soon" state rather than a broken screen.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  GraduationCap,
  HeartHandshake,
  MapPin,
  PartyPopper,
  Users,
} from "lucide-react";

type EventKind = "meeting" | "celebration" | "workshop" | "community";

interface CommunityEvent {
  id: string;
  centerId?: string;
  creatorId: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt?: number;
  location: string;
  kind: EventKind;
  createdAt: number;
  rsvpCount: number;
  iRsvped: boolean;
}

const CARD = "rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]";

const KIND: Record<
  EventKind,
  { label: string; Icon: typeof Users }
> = {
  meeting: { label: "Meeting", Icon: Users },
  celebration: { label: "Celebration", Icon: PartyPopper },
  workshop: { label: "Workshop", Icon: GraduationCap },
  community: { label: "Community", Icon: HeartHandshake },
};

/* ── formatting ─────────────────────────────────────────────────────── */

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const fmtDayHeading = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

function timeRange(startsAt: number, endsAt?: number): string {
  const start = fmtTime(startsAt);
  return endsAt ? `${start} – ${fmtTime(endsAt)}` : start;
}

/* ── event card ─────────────────────────────────────────────────────── */

function EventCard({
  event,
  signedIn,
  onToggle,
  pending,
}: {
  event: CommunityEvent;
  signedIn: boolean;
  onToggle: (e: CommunityEvent) => void;
  pending: boolean;
}) {
  const { label, Icon } = KIND[event.kind] ?? KIND.community;
  const going = event.iRsvped;

  return (
    <article className={CARD}>
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-tint text-blue-primary"
          aria-hidden
        >
          <Icon className="h-[22px] w-[22px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-full bg-sky-tint px-2 text-[10px] font-extrabold uppercase tracking-[.04em] text-blue-primary">
              {label}
            </span>
            <span className="tnum text-[12.5px] font-semibold text-ink-400">
              {timeRange(event.startsAt, event.endsAt)}
            </span>
          </div>
          <h3 className="mt-1.5 text-[17px] font-extrabold text-ink-900">
            {event.title}
          </h3>
          {event.description && (
            <p className="mt-1.5 text-[14px]/[1.6] font-medium text-ink-600">
              {event.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold text-ink-600">
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-[15px] w-[15px] text-ink-400" aria-hidden />
                {event.location}
              </span>
            )}
            <span className="tnum inline-flex items-center gap-1.5">
              <Users className="h-[15px] w-[15px] text-ink-400" aria-hidden />
              {event.rsvpCount} going
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-sky-tint-2 pt-4">
        {signedIn ? (
          <button
            type="button"
            onClick={() => onToggle(event)}
            disabled={pending}
            aria-pressed={going}
            className={
              "inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-full px-6 text-[14px] font-extrabold transition-colors disabled:opacity-60 " +
              (going
                ? "bg-sky-tint text-blue-primary hover:bg-sky-tint-2"
                : "bg-blue-primary text-white hover:bg-blue-hover")
            }
          >
            {going ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                You&rsquo;re going
              </>
            ) : (
              "RSVP"
            )}
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full border-2 border-blue-primary px-6 text-[14px] font-extrabold text-blue-primary hover:bg-sky-tint"
          >
            Sign in to RSVP
          </Link>
        )}
      </div>
    </article>
  );
}

function EventSkeleton() {
  return (
    <div className={CARD + " animate-pulse"} aria-hidden>
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-sky-tint" />
        <div className="flex-1 space-y-2.5">
          <div className="h-3 w-24 rounded bg-sky-tint" />
          <div className="h-4 w-2/3 rounded bg-sky-tint" />
          <div className="h-3 w-full rounded bg-canvas" />
        </div>
      </div>
      <div className="mt-4 h-11 w-32 rounded-full bg-sky-tint" />
    </div>
  );
}

/* ── list ───────────────────────────────────────────────────────────── */

export default function EventsList() {
  const [events, setEvents] = useState<CommunityEvent[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => alive && setSignedIn(!!d?.user))
      .catch(() => {});

    fetch("/api/events", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("events unavailable");
        return r.json();
      })
      .then((d) => {
        if (!alive) return;
        setEvents(Array.isArray(d?.events) ? d.events : []);
      })
      .catch(() => {
        if (!alive) return;
        setUnavailable(true);
        setEvents([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function toggle(ev: CommunityEvent) {
    if (!signedIn || pendingId) return;
    const going = !ev.iRsvped;
    setPendingId(ev.id);

    // optimistic
    setEvents((prev) =>
      prev
        ? prev.map((e) =>
            e.id === ev.id
              ? {
                  ...e,
                  iRsvped: going,
                  rsvpCount: Math.max(0, e.rsvpCount + (going ? 1 : -1)),
                }
              : e
          )
        : prev
    );

    try {
      const res = await fetch(`/api/events/${encodeURIComponent(ev.id)}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ going }),
      });
      if (!res.ok) throw new Error("rsvp failed");
      const data = (await res.json()) as { event?: CommunityEvent };
      if (data?.event) {
        setEvents((prev) =>
          prev ? prev.map((e) => (e.id === ev.id ? data.event! : e)) : prev
        );
      }
    } catch {
      // revert on failure
      setEvents((prev) =>
        prev
          ? prev.map((e) =>
              e.id === ev.id
                ? {
                    ...e,
                    iRsvped: ev.iRsvped,
                    rsvpCount: ev.rsvpCount,
                  }
                : e
            )
          : prev
      );
    } finally {
      setPendingId(null);
    }
  }

  // Upcoming only, grouped by day, each group and the whole list sorted by
  // startsAt ascending.
  const groups = useMemo(() => {
    if (!events) return null;
    const now = Date.now();
    const upcoming = events
      .filter((e) => (e.endsAt ?? e.startsAt) >= now)
      .sort((a, b) => a.startsAt - b.startsAt);
    const map = new Map<string, CommunityEvent[]>();
    for (const e of upcoming) {
      const key = dayKey(e.startsAt);
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return [...map.values()];
  }, [events]);

  if (events === null) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <EventSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint text-blue-primary">
          <CalendarDays className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mt-5 text-[19px] font-extrabold text-ink-900">
          {unavailable
            ? "Gathering the calendar"
            : "No events on the calendar yet"}
        </h2>
        <p className="mx-auto mt-2 max-w-[440px] text-[14px]/[1.65] font-medium text-ink-600">
          {unavailable
            ? "Community meetups, celebrations, and workshops will show up here soon. Check back in a bit."
            : "When the community plans a meetup, celebration, or workshop, you’ll find it here - and you can save your seat with one tap."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {groups.map((group) => (
        <section key={dayKey(group[0].startsAt)}>
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
            <CalendarDays className="h-4 w-4" aria-hidden />
            {fmtDayHeading(group[0].startsAt)}
          </h2>
          <div className="flex flex-col gap-4">
            {group.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                signedIn={signedIn}
                onToggle={toggle}
                pending={pendingId === ev.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
