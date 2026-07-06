"use client";

// My Program - the client-portal panel at the top of Home (docs/16 Part D).
// Renders ONLY when the signed-in member has an active program enrollment
// (/api/portal says enrolled). Navy gradient card: program identity +
// curriculum progress (gold fill - app gamification surface), a Today strip,
// a journey-task preview, the kudos inbox, engagement extras (challenge chip,
// pulse quick-respond), and quick links into cohort chat + My Plan.
//
// The challenges + pulse APIs are landing concurrently - every fetch here is
// defensive: any failure simply hides that block, never the whole panel.

import { useEffect, useState } from "react";
import { timeAgo } from "@/app/components/chat/ChatThread";

/* ── /api/portal contract ────────────────────────────────────────────── */

type PortalSession = {
  title: string;
  startsAt: number;
  durationMin: number;
  location?: string;
  facilitatorName?: string;
  isToday: boolean;
};

type PortalTask = { id: string; label: string; done: boolean };

type PortalData = {
  enrolled: boolean;
  program: {
    id: string;
    title: string;
    badge?: string;
    progressPct: number;
    nextUp: string | null;
    channelId: string | null;
    cohortLabel?: string;
  } | null;
  today: { sessions: PortalSession[]; tasks: PortalTask[] };
  kudos: { body: string; occurredAt: number }[];
};

const PULSE_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];

/** "10:00 AM" for today, "Tue 10:00 AM" for upcoming days. */
function sessionTime(ts: number, isToday: boolean): string {
  const time = new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (isToday) return time;
  const day = new Date(ts).toLocaleDateString(undefined, { weekday: "short" });
  return `${day} ${time}`;
}

/** Cross-component "open my cohort chat" signal. MemberApp listens, switches
 *  to the Chat tab, and hands the channel id to ChatTab to auto-open. A
 *  CustomEvent keeps this panel additive - HomeTab needs no new props. */
export const OPEN_CARE_CHANNEL_EVENT = "ms:open-care-channel";

function openCohortChat(channelId: string) {
  window.dispatchEvent(
    new CustomEvent(OPEN_CARE_CHANNEL_EVENT, { detail: { channelId } })
  );
}

/* ── subtle confetti accent for the kudos row - pure CSS, no libraries ── */

const CONFETTI_BG = {
  backgroundImage:
    "radial-gradient(circle at 8% 22%, rgba(234,179,8,.55) 2px, transparent 2.6px), " +
    "radial-gradient(circle at 24% 78%, rgba(255,255,255,.4) 1.6px, transparent 2.2px), " +
    "radial-gradient(circle at 88% 26%, rgba(234,179,8,.45) 1.8px, transparent 2.4px), " +
    "radial-gradient(circle at 72% 84%, rgba(255,255,255,.35) 1.5px, transparent 2px), " +
    "radial-gradient(circle at 94% 68%, rgba(234,179,8,.4) 1.4px, transparent 2px)",
};

export default function MyProgramPanel({
  openPlan,
}: {
  openPlan?: () => void;
}) {
  const [portal, setPortal] = useState<PortalData | null>(null);
  // Engagement extras - null means "not available", hide that block.
  const [challenge, setChallenge] = useState<{
    title: string;
    badge?: string;
  } | null>(null);
  const [pulse, setPulse] = useState<{ id: string; question: string } | null>(
    null
  );
  const [pulseScore, setPulseScore] = useState(0);
  const [pulseNote, setPulseNote] = useState("");
  const [pulseState, setPulseState] = useState<"idle" | "sending" | "done">(
    "idle"
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/portal");
        if (!res.ok) return; // signed out / API not live yet - render nothing
        const data = (await res.json().catch(() => null)) as PortalData | null;
        if (alive && data?.enrolled && data.program) setPortal(data);
      } catch {
        // offline - the rest of Home still works
      }
    })();

    // Active joined challenge → small chip. Any failure hides the chip.
    (async () => {
      try {
        const res = await fetch("/api/challenges");
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          challenges?: Array<{
            title?: unknown;
            badge?: unknown;
            joined?: unknown;
            active?: unknown;
          }>;
        } | null;
        const list = data?.challenges;
        if (!alive || !Array.isArray(list)) return;
        const active = list.find(
          (c) => c && c.joined === true && c.active === true && c.title
        );
        if (active) {
          setChallenge({
            title: String(active.title),
            badge:
              typeof active.badge === "string" && active.badge
                ? active.badge
                : undefined,
          });
        }
      } catch {
        // hide the chip
      }
    })();

    // Open pulse survey → inline quick-respond. Any failure hides the block.
    (async () => {
      try {
        const res = await fetch("/api/pulse");
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          open?: Array<{
            id?: unknown;
            question?: unknown;
            questions?: Array<unknown>;
            title?: unknown;
          }>;
        } | null;
        const open = data?.open;
        if (!alive || !Array.isArray(open) || open.length === 0) return;
        const s = open[0];
        const q0 = s?.questions?.[0];
        const q0Text =
          q0 && typeof q0 === "object" && "text" in q0
            ? (q0 as { text?: unknown }).text
            : undefined;
        let question = "";
        if (typeof s?.question === "string") question = s.question;
        else if (typeof q0 === "string") question = q0;
        else if (typeof q0Text === "string") question = q0Text;
        else if (typeof s?.title === "string") question = s.title;
        if (s?.id && question) {
          setPulse({ id: String(s.id), question });
        }
      } catch {
        // hide the block
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const sendPulse = async () => {
    if (!pulse || pulseScore === 0 || pulseState !== "idle") return;
    setPulseState("sending");
    try {
      const res = await fetch(`/api/pulse/${pulse.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: pulseScore,
          note: pulseNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setPulseState("done");
    } catch {
      setPulse(null); // API not ready / rejected - hide, never error at them
      setPulseState("idle");
    }
  };

  if (!portal?.enrolled || !portal.program) return null;

  const program = portal.program;
  const channelId = program.channelId; // const-bound so the closure narrows
  const sessions = portal.today.sessions;
  const tasks = portal.today.tasks.slice(0, 3);
  const latestKudos = portal.kudos[0] ?? null;
  const todayStrip = sessions.length > 0 && sessions[0].isToday;

  return (
    <div className="bg-white px-5 pb-1 pt-[18px]">
      <div className="rounded-2xl bg-gradient-to-br from-navy-deep to-indigo-brand p-5 text-white shadow-[0_6px_20px_rgba(11,37,69,.25)]">
        {/* Identity row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold tracking-[.14em] text-white/60">
            MY PROGRAM
          </span>
          {program.cohortLabel && (
            <span className="inline-flex h-6 items-center rounded-full bg-white/15 px-2.5 text-[10px] font-extrabold tracking-[.04em] text-white">
              {program.cohortLabel}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {program.badge && (
            <span
              title={`Program badge: ${program.badge}`}
              className="h-2.5 w-2.5 flex-none rounded-full bg-gold-badge shadow-[0_0_8px_rgba(234,179,8,.8)]"
            />
          )}
          <span className="min-w-0 truncate text-[19px] font-extrabold tracking-[-0.01em]">
            {program.title}
          </span>
        </div>

        {/* Curriculum progress - gold fill (app gamification surface) */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-white/70">Curriculum progress</span>
            <span className="tnum text-gold-badge">{program.progressPct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gold-badge"
              style={{ width: `${Math.min(100, Math.max(0, program.progressPct))}%` }}
            />
          </div>
          {program.nextUp && (
            <div className="mt-2 truncate text-[12.5px] font-semibold text-white/85">
              Next up: {program.nextUp}
            </div>
          )}
        </div>

        {/* Today strip */}
        <div className="mt-4">
          <div className="text-[10px] font-bold tracking-[.14em] text-white/60">
            {todayStrip ? "TODAY" : "COMING UP"}
          </div>
          {sessions.length === 0 ? (
            <div className="mt-1.5 rounded-xl bg-white/10 px-3.5 py-3 text-[13px] font-semibold text-white/85">
              No sessions today - breathe, you have earned it
            </div>
          ) : (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {sessions.map((s, i) => (
                <div
                  key={s.title + s.startsAt + i}
                  className="rounded-xl bg-white/10 px-3.5 py-2.5"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="tnum flex-none text-[13px] font-extrabold">
                      {sessionTime(s.startsAt, s.isToday)}
                    </span>
                    <span className="min-w-0 truncate text-[13px] font-semibold text-white/90">
                      {s.title}
                    </span>
                  </div>
                  {(s.location || s.facilitatorName || s.durationMin > 0) && (
                    <div className="mt-0.5 truncate text-[11.5px] font-medium text-white/65">
                      {[
                        s.location,
                        s.facilitatorName && `with ${s.facilitatorName}`,
                        s.durationMin > 0 && `${s.durationMin} min`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Journey tasks preview - first 3, read-only glance */}
        {tasks.length > 0 && (
          <div className="mt-3.5">
            <div className="text-[10px] font-bold tracking-[.14em] text-white/60">
              MY TASKS
            </div>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5">
                  <span
                    className={
                      "inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-md border-[1.5px] text-[11px] font-bold " +
                      (t.done
                        ? "border-gold-badge bg-gold-badge text-navy-deep"
                        : "border-white/40 bg-transparent")
                    }
                  >
                    {t.done ? "✓" : ""}
                  </span>
                  <span
                    className={
                      "min-w-0 truncate text-[13px] font-medium " +
                      (t.done ? "text-white/50 line-through" : "text-white/90")
                    }
                  >
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kudos inbox - celebration styling, staff stay "Your care team" */}
        {latestKudos && (
          <div
            className="mt-3.5 rounded-xl border border-gold-badge/40 bg-white/10 px-3.5 py-3"
            style={CONFETTI_BG}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[.08em] text-gold-badge">
              <span aria-hidden>💛</span> KUDOS FROM YOUR CARE TEAM
            </div>
            <div className="mt-1 text-[13px]/[1.5] font-semibold text-white">
              {latestKudos.body}
            </div>
            <div className="mt-1 text-[11px] font-medium text-white/60">
              {timeAgo(latestKudos.occurredAt)}
              {portal.kudos.length > 1 &&
                ` · ${portal.kudos.length - 1} more in your inbox`}
            </div>
          </div>
        )}

        {/* Active joined challenge chip */}
        {challenge && (
          <div className="mt-3">
            <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-white/15 px-3 text-[12px] font-bold text-white">
              <span aria-hidden>{challenge.badge || "🔥"}</span>
              <span className="min-w-0 truncate">
                {challenge.title} - joined
              </span>
            </span>
          </div>
        )}

        {/* Pulse quick-respond - one question, one tap, done */}
        {pulse && (
          <div className="mt-3.5 rounded-xl bg-white/10 px-3.5 py-3">
            {pulseState === "done" ? (
              <div className="text-[13px] font-semibold text-white">
                Thank you 💛 Your care team sees this.
              </div>
            ) : (
              <>
                <div className="text-[13px]/[1.5] font-semibold text-white">
                  {pulse.question}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  {PULSE_EMOJI.map((e, i) => {
                    const score = i + 1;
                    const on = pulseScore === score;
                    return (
                      <button
                        key={e}
                        type="button"
                        aria-label={`Answer ${score} of 5`}
                        onClick={() => setPulseScore(score)}
                        className={
                          "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[20px] " +
                          (on
                            ? "bg-gold-badge/25 ring-2 ring-gold-badge"
                            : "bg-white/10 hover:bg-white/20")
                        }
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={pulseNote}
                    onChange={(e) => setPulseNote(e.target.value)}
                    placeholder="Add a note (optional)"
                    aria-label="Optional note"
                    className="h-10 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[13px] font-medium text-white outline-none placeholder:text-white/45 focus:bg-white/15"
                  />
                  <button
                    type="button"
                    onClick={sendPulse}
                    disabled={pulseScore === 0 || pulseState !== "idle"}
                    className="inline-flex h-10 flex-none cursor-pointer items-center rounded-full bg-gold-badge px-4 text-[13px] font-extrabold text-navy-deep disabled:cursor-default disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Quick links */}
        <div className="mt-4 flex gap-2">
          {channelId && (
            <button
              type="button"
              onClick={() => openCohortChat(channelId)}
              className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full bg-white/15 px-4 text-[13px] font-bold text-white hover:bg-white/25"
            >
              Open cohort chat →
            </button>
          )}
          {openPlan && (
            <button
              type="button"
              onClick={openPlan}
              className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full bg-white/15 px-4 text-[13px] font-bold text-white hover:bg-white/25"
            >
              My plan →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
