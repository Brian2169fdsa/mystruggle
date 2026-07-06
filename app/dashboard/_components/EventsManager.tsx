"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  PartyPopper,
  Wrench,
  HeartHandshake,
  MapPin,
  CalendarClock,
} from "lucide-react";
import { CARD, SKELETON } from "./types";

/** One center event (GET /api/events). */
type EventKind = "meeting" | "celebration" | "workshop" | "community";

type CenterEvent = {
  id: string;
  centerId?: string;
  creatorId: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt?: number;
  location: string;
  kind: EventKind;
  createdAt: number | string;
  rsvpCount: number;
  iRsvped: boolean;
};

const KINDS: {
  value: EventKind;
  label: string;
  Icon: typeof Users;
  bg: string;
  color: string;
}[] = [
  { value: "meeting", label: "Meeting", Icon: Users, bg: "#EAF2FC", color: "#2E7CD6" },
  { value: "celebration", label: "Celebration", Icon: PartyPopper, bg: "#F0EDFB", color: "#4E5B9B" },
  { value: "workshop", label: "Workshop", Icon: Wrench, bg: "#EAF2FC", color: "#2E7CD6" },
  { value: "community", label: "Community", Icon: HeartHandshake, bg: "#E8F8F0", color: "#12B76A" },
];

function kindMeta(kind: EventKind) {
  return KINDS.find((k) => k.value === kind) ?? KINDS[0];
}

/** Normalize a timestamp shape (ms, seconds, ISO string) to ms epoch. */
function toMs(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}

/** "Sat, Aug 9 · 6:00 PM" (with an end time when the event has one). */
function fmtWhen(startsAt: number, endsAt?: number): string {
  const start = toMs(startsAt);
  if (!start) return "Date to be announced";
  const d = new Date(start);
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const end = toMs(endsAt);
  const endStr =
    end > start
      ? " – " +
        new Date(end).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
  return `${date} · ${time}${endStr}`;
}

/** datetime-local value ("2026-08-09T18:00") → ms epoch, or null if unset. */
function localToMs(v: string): number | null {
  if (!v) return null;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : null;
}

const INPUT =
  "w-full rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-3 text-[15px] font-medium text-ink-900 outline-none focus:border-blue-primary";
const LABEL =
  "text-[12px] font-bold uppercase tracking-[.08em] text-ink-600";

export default function EventsManager() {
  const [events, setEvents] = useState<CenterEvent[] | null>(null);
  const [apiPending, setApiPending] = useState(false); // /api/events not live yet
  const [error, setError] = useState<string | null>(null);

  // Create-form state.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState<EventKind>("meeting");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      if (res.status === 404) {
        setApiPending(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { events?: CenterEvent[] };
      setEvents(data.events ?? []);
      setApiPending(false);
      setError(null);
    } catch {
      setError("Couldn't load events right now.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, apiPending ? 8_000 : 30_000);
    return () => clearInterval(t);
  }, [load, apiPending]);

  const canSubmit =
    title.trim().length > 0 &&
    location.trim().length > 0 &&
    localToMs(starts) !== null &&
    !submitting;

  async function createEvent() {
    const startsAt = localToMs(starts);
    if (!title.trim() || !location.trim() || startsAt === null) {
      setFormError("Add a title, a location, and a start date & time.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setOkMsg(null);
    const endsAt = localToMs(ends);
    if (endsAt !== null && endsAt <= startsAt) {
      setSubmitting(false);
      setFormError("The end time needs to be after the start time.");
      return;
    }
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          startsAt,
          ...(endsAt !== null ? { endsAt } : {}),
          location: location.trim(),
          kind,
        }),
      });
      if (res.status === 404) {
        setApiPending(true);
        setFormError("Events service is still coming online — try again shortly.");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        event?: CenterEvent;
        error?: string;
      };
      if (res.status === 400) {
        setFormError(data.error ?? "Please double-check the event details.");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));

      // Surface the new event immediately (defaulting fields the POST may omit).
      if (data.event) {
        const created = data.event;
        setEvents((cur) => [
          {
            ...created,
            rsvpCount: created.rsvpCount ?? 0,
            iRsvped: created.iRsvped ?? false,
          },
          ...(cur ?? []),
        ]);
      } else {
        await load();
      }
      setTitle("");
      setDescription("");
      setStarts("");
      setEnds("");
      setLocation("");
      setKind("meeting");
      setOkMsg("Event created — members can see it in their community now.");
    } catch {
      setFormError("Something went wrong creating this event.");
    } finally {
      setSubmitting(false);
    }
  }

  // Upcoming (soonest first), then past (most recent first).
  const now = Date.now();
  const sorted = [...(events ?? [])].map((e) => ({ e, t: toMs(e.startsAt) }));
  const upcoming = sorted
    .filter((x) => x.t >= now)
    .sort((a, b) => a.t - b.t)
    .map((x) => x.e);
  const past = sorted
    .filter((x) => x.t < now)
    .sort((a, b) => b.t - a.t)
    .map((x) => x.e);
  const ordered = [...upcoming, ...past];

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Events
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-ink-600">
          Meetings, celebrations, workshops, and community gatherings — the
          moments that hold a journey together.
        </div>
      </div>

      {/* ── CREATE EVENT ─────────────────────────────────────────────── */}
      <div className={CARD + " px-[30px] py-6"}>
        <div className="text-[17px] font-extrabold text-ink-900">
          Create event
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Title</span>
            <input
              className={INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Friday night fellowship"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Kind</span>
            <select
              className={INPUT}
              value={kind}
              onChange={(e) => setKind(e.target.value as EventKind)}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className={LABEL}>Description</span>
          <textarea
            className={INPUT + " min-h-[84px] resize-y"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What to expect, who it's for, anything to bring."
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Starts</span>
            <input
              type="datetime-local"
              className={INPUT}
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Ends (optional)</span>
            <input
              type="datetime-local"
              className={INPUT}
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Location</span>
            <input
              className={INPUT}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Laveen Center · Room B"
            />
          </label>
        </div>

        {formError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-bg px-4 py-3">
            <span className="mt-0.5 flex-none text-[11px] font-extrabold text-amber-ink">
              CHECK
            </span>
            <span className="text-[13px]/[1.6] font-medium text-ink-900">
              {formError}
            </span>
          </div>
        )}
        {okMsg && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#E8F8F0] px-4 py-3">
            <span className="mt-0.5 flex-none text-[11px] font-extrabold text-success">
              CREATED
            </span>
            <span className="text-[13px]/[1.6] font-medium text-ink-900">
              {okMsg}
            </span>
          </div>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={createEvent}
            disabled={!canSubmit}
            className={
              "inline-flex h-12 items-center rounded-full px-7 text-[14px] font-bold text-white " +
              (canSubmit
                ? "cursor-pointer bg-blue-primary hover:bg-blue-hover"
                : "cursor-not-allowed bg-ink-400")
            }
          >
            {submitting ? "Creating…" : "Create event"}
          </button>
        </div>
      </div>

      {/* ── UPCOMING & PAST ──────────────────────────────────────────── */}
      <div className="mt-2 text-[17px] font-extrabold text-ink-900">
        {upcoming.length > 0
          ? `${upcoming.length} upcoming`
          : "Scheduled events"}
      </div>

      {apiPending && !events && (
        <div className={CARD + " px-[30px] py-6"}>
          <div className="text-[13px] font-semibold text-blue-primary">
            Events service is coming online…
          </div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className={SKELETON + " h-[96px]"} />
            ))}
          </div>
        </div>
      )}

      {!events && !apiPending && !error &&
        Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={SKELETON + " h-[120px]"} />
        ))}

      {error && (
        <div className={CARD + " px-[30px] py-8 text-center"}>
          <div className="text-[13px] font-semibold text-ink-600">{error}</div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              load();
            }}
            className="mt-3 inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-6 text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
          >
            Retry
          </button>
        </div>
      )}

      {events && ordered.length === 0 && (
        <div
          className={
            CARD +
            " px-[30px] py-12 text-center text-[13px] font-semibold text-ink-400"
          }
        >
          No events scheduled yet — create the first one above.
        </div>
      )}

      {ordered.map((ev) => {
        const meta = kindMeta(ev.kind);
        const isPast = toMs(ev.startsAt) < now;
        return (
          <div
            key={ev.id}
            className={CARD + " px-[30px] py-5 " + (isPast ? "opacity-70" : "")}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
                style={{ background: meta.bg, color: meta.color }}
              >
                <meta.Icon size={20} strokeWidth={2.3} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-bold text-ink-900">
                    {ev.title}
                  </span>
                  <span
                    className="inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-bold"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  {isPast && (
                    <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[11px] font-bold text-ink-600">
                      Past
                    </span>
                  )}
                </div>

                {ev.description && (
                  <div className="mt-1.5 text-[14px]/[1.6] font-medium text-ink-600">
                    {ev.description}
                  </div>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] font-semibold text-ink-600">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock
                      size={15}
                      strokeWidth={2.3}
                      className="text-blue-primary"
                    />
                    {fmtWhen(ev.startsAt, ev.endsAt)}
                  </span>
                  {ev.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin
                        size={15}
                        strokeWidth={2.3}
                        className="text-blue-primary"
                      />
                      {ev.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-none self-center text-right">
                <div className="tnum text-[22px] font-extrabold text-blue-primary">
                  {ev.rsvpCount ?? 0}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-[.06em] text-ink-600">
                  going
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
