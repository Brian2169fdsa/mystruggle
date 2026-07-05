"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Diamond,
  Pencil,
} from "lucide-react";
import TabBar, { type MentorView } from "./TabBar";
import LogSheet, {
  type Duration,
  type Mode,
  MODE_LABEL,
  durationLabel,
} from "./LogSheet";
import ChatThread, {
  previewText,
  timeAgo,
  type ThreadSummary,
} from "@/app/components/chat/ChatThread";
import CommunityFeed from "@/app/components/feed/CommunityFeed";

const MOOD_WORDS: Record<number, string> = {
  1: "rough",
  2: "low",
  3: "okay",
  4: "good",
  5: "great",
};

// Real session-log wiring — Danielle's flagship member number (roster demo).
const DANIELLE_MEMBER_NUMBER = "039521464";
const DEMO_NOTE = "Prepped for Thursday's interview. Confidence way up.";

type ApiSessionMode = "in-person" | "phone" | "video";

/** LogSheet's Mode keys → API SessionMode values. */
const API_MODE: Record<Mode, ApiSessionMode> = {
  inperson: "in-person",
  phone: "phone",
  video: "video",
};

const API_MODE_LABEL: Record<ApiSessionMode, string> = {
  "in-person": "in person",
  phone: "phone",
  video: "video",
};

type ApiSession = {
  id: string;
  mode: ApiSessionMode;
  minutes: number;
  note?: string;
  createdAt: number;
  mentorName: string | null;
};

/** "today" / "yesterday" / "4 days ago" / "May 12" for session timestamps. */
function dayLabel(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400e3);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const CARD_SHADOW = "shadow-[0_1px_3px_rgba(11,37,69,.06)]";

/** Mentor phone app: roster → mentee detail / live chat + session-log sheet. */
export default function MentorApp() {
  const [view, setView] = useState<MentorView>("roster");
  const [logOpen, setLogOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("inperson");
  const [duration, setDuration] = useState<Duration>("45");
  const [sessionSaved, setSessionSaved] = useState(false);
  const [cheerSent, setCheerSent] = useState(false);
  const [mood, setMood] = useState<number | null>(null);

  // Live chat state — real threads when signed in as a mentor.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  // Real logged sessions for the mentee detail (Danielle) when signed in.
  const [sessionInfo, setSessionInfo] = useState<{
    count: number;
    latest: ApiSession | null;
  } | null>(null);
  const danielleIdRef = useRef<string | null>(null);
  const [viewerId, setViewerId] = useState("");
  const [activeThread, setActiveThread] = useState<ThreadSummary | null>(null);
  const [cameFrom, setCameFrom] = useState<"roster" | "chatlist">("roster");

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/threads");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.threads) {
        setThreads(data.threads);
        setViewerId(data.viewerId);
        return data.threads as ThreadSummary[];
      }
    } catch {
      /* stays on demo content */
    }
    return [];
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (data?.user) {
          setSignedIn(true);
          setMeRole(data.user.role ?? null);
          await loadThreads();
        } else {
          setSignedIn(false);
        }
      } catch {
        if (alive) setSignedIn(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadThreads]);

  const findThread = (firstName: string) =>
    threads.find((t) =>
      (t.other?.name ?? "").toLowerCase().startsWith(firstName.toLowerCase())
    ) ?? null;

  /** Danielle's real member id — from the loaded threads when possible,
   *  otherwise resolved once via the roster API by member number. */
  const resolveDanielleId = useCallback(async (): Promise<string | null> => {
    if (danielleIdRef.current) return danielleIdRef.current;
    const t = threads.find((t) =>
      (t.other?.name ?? "").toLowerCase().startsWith("danielle")
    );
    if (t?.other?.id) {
      danielleIdRef.current = t.other.id;
      return t.other.id;
    }
    try {
      const res = await fetch("/api/admin/members");
      const data = await res.json().catch(() => null);
      const m = (data?.members as { id: string; memberNumber?: string }[] | undefined)?.find(
        (x) => x.memberNumber === DANIELLE_MEMBER_NUMBER
      );
      if (m?.id) {
        danielleIdRef.current = m.id;
        return m.id;
      }
    } catch {
      /* stays on demo content */
    }
    return null;
  }, [threads]);

  const loadSessions = useCallback(async (memberId: string) => {
    try {
      const res = await fetch(`/api/sessions?memberId=${memberId}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.sessions) {
        setSessionInfo({
          count: data.count ?? data.sessions.length,
          latest: (data.sessions[0] as ApiSession) ?? null,
        });
      }
    } catch {
      /* stays on demo content */
    }
  }, []);

  // Refresh Danielle's real session summary whenever the detail view opens.
  useEffect(() => {
    if (view !== "detail" || !signedIn) return;
    let alive = true;
    (async () => {
      const id = await resolveDanielleId();
      if (alive && id) await loadSessions(id);
    })();
    return () => {
      alive = false;
    };
  }, [view, signedIn, resolveDanielleId, loadSessions]);

  const openDetail = () => {
    setView("detail");
    setSessionSaved(false);
    setCheerSent(false);
  };

  /** Save from the log sheet — optimistic banner always; real POST when
   *  signed in as a mentor (401/signed-out keeps the local demo behavior). */
  const saveSession = () => {
    setLogOpen(false);
    setSessionSaved(true);
    if (!signedIn || meRole !== "mentor") return;
    (async () => {
      const memberId = await resolveDanielleId();
      if (!memberId) return;
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId,
            mode: API_MODE[mode],
            minutes: Number(duration),
            note: DEMO_NOTE,
          }),
        });
        if (res.ok) loadSessions(memberId);
      } catch {
        /* banner already shown — demo-grade */
      }
    })();
  };

  /** Tyrell — roster card + amber nudge: real thread when signed in. */
  const openTyrell = () => {
    setCameFrom("roster");
    setActiveThread(signedIn ? findThread("Tyrell") : null);
    setView("thread");
  };

  /** Chat tab: real thread list when signed in, demo thread otherwise. */
  const openChatTab = () => {
    if (signedIn) {
      setView("chatlist");
      loadThreads();
    } else {
      setActiveThread(null);
      setView("thread");
    }
  };

  const openThreadFromList = (t: ThreadSummary) => {
    setCameFrom("chatlist");
    setActiveThread(t);
    setView("thread");
  };

  const backToRoster = () => {
    setView("roster");
    setLogOpen(false);
  };

  const backFromThread = () => {
    if (cameFrom === "chatlist" && signedIn) {
      setView("chatlist");
      loadThreads();
    } else {
      backToRoster();
    }
  };

  /** Cheer from mentee detail — banner always; real message when signed in. */
  const sendCheer = () => {
    setCheerSent(true);
    const t = findThread("Danielle");
    if (signedIn && t) {
      fetch(`/api/threads/${t.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "cheer",
          body: "Keep going — proud of you!",
        }),
      }).catch(() => {});
    }
  };

  const lastSession = sessionSaved
    ? `Last session: today · ${MODE_LABEL[mode]} · ${durationLabel(duration)}`
    : "Last session: Tuesday · in person · 45 min";
  const lastSessionNote = sessionSaved
    ? "“Prepped for Thursday’s interview. Confidence way up.”"
    : "“Talked through the ABC Painting interview. She’s ready.”";

  return (
    <div className="flex min-h-screen justify-center bg-[#E8EDF4]">
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-canvas shadow-[0_0_60px_rgba(11,37,69,.12)]">
        {/* ============ ROSTER ============ */}
        {view === "roster" && (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between bg-white px-5 pb-3.5 pt-[18px]">
              <div>
                <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
                  Good morning, Marcus
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-ink-600">
                  3 mentees · Laveen Center
                </div>
              </div>
              <span className="inline-flex h-7 items-center rounded-full bg-[#F0EDFB] px-3 text-[11px] font-extrabold text-indigo-brand">
                MENTOR
              </span>
            </div>
            <div className="hairline" />

            <div className="flex flex-1 flex-col gap-3.5 p-5">
              {/* Amber nudge banner — soft signal, opens thread */}
              <div
                onClick={openTyrell}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-gold-border bg-amber-bg px-[18px] py-3.5"
              >
                <span className="h-2.5 w-2.5 flex-none rounded-full bg-gold-badge" />
                <div className="flex-1 text-[13px]/[1.5] font-semibold text-ink-900">
                  Tyrell hasn&apos;t checked in for 6 days. A quick hello goes
                  a long way.
                </div>
                <span className="inline-flex flex-none items-center gap-1 text-[13px] font-bold text-blue-primary">
                  Message <ArrowRight size={14} strokeWidth={2.75} />
                </span>
              </div>

              {/* Danielle */}
              <div
                onClick={openDetail}
                className={`cursor-pointer rounded-2xl bg-white p-5 hover:bg-sky-tint ${CARD_SHADOW}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-sky-tint text-[20px] font-extrabold text-indigo-brand">
                    D
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-bold text-ink-900">
                      Danielle
                    </div>
                    <div className="text-xs font-medium text-success">
                      Active today · mood good
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    strokeWidth={2.5}
                    className="flex-none text-blue-primary"
                  />
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <span className="inline-flex h-7 items-center gap-[5px] rounded-full bg-gold-bg px-3 text-[11px] font-extrabold text-gold-ink">
                    <Diamond size={10} fill="currentColor" /> 12-day streak
                  </span>
                  <span className="inline-flex h-7 items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
                    Course 45%
                  </span>
                  <span className="inline-flex h-7 items-center rounded-full bg-[#E8F8F0] px-3 text-[11px] font-bold text-success">
                    Mood 4/5
                  </span>
                </div>
              </div>

              {/* Tyrell — amber border, never red on a person */}
              <div
                onClick={openTyrell}
                className={`cursor-pointer rounded-2xl border-[1.5px] border-gold-border bg-white p-5 hover:bg-amber-bg ${CARD_SHADOW}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-sky-tint text-[20px] font-extrabold text-indigo-brand">
                    T
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-bold text-ink-900">
                      Tyrell
                    </div>
                    <div className="text-xs font-medium text-amber-ink">
                      Last active 6 days ago
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    strokeWidth={2.5}
                    className="flex-none text-blue-primary"
                  />
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <span className="inline-flex h-7 items-center rounded-full bg-[#F1F5F9] px-3 text-[11px] font-bold text-ink-600">
                    Streak paused
                  </span>
                  <span className="inline-flex h-7 items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
                    Course 15%
                  </span>
                  <span className="inline-flex h-7 items-center rounded-full bg-amber-bg px-3 text-[11px] font-bold text-amber-ink">
                    Mood 2/5 · Mon
                  </span>
                </div>
              </div>

              {/* Andre */}
              <div className={`rounded-2xl bg-white p-5 ${CARD_SHADOW}`}>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-sky-tint text-[20px] font-extrabold text-indigo-brand">
                    A
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-bold text-ink-900">
                      Andre{" "}
                      <span className="ml-1 inline-flex h-5 items-center rounded-full bg-sky-tint px-2 text-[10px] font-extrabold text-blue-primary">
                        NEW
                      </span>
                    </div>
                    <div className="text-xs font-medium text-ink-600">
                      Joined today · first meeting Friday
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    strokeWidth={2.5}
                    className="flex-none text-blue-primary"
                  />
                </div>
                <div className="mt-3.5 flex gap-2">
                  <span className="inline-flex h-7 items-center rounded-full bg-[#F1F5F9] px-3 text-[11px] font-bold text-ink-600">
                    Day 1
                  </span>
                  <span className="inline-flex h-7 items-center rounded-full bg-[#F1F5F9] px-3 text-[11px] font-bold text-ink-600">
                    No check-ins yet
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ MENTEE DETAIL ============ */}
        {view === "detail" && (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-3.5 bg-white px-5 py-3.5">
              <button
                onClick={backToRoster}
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center text-ink-900"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </button>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-tint text-[17px] font-extrabold text-indigo-brand">
                D
              </div>
              <div>
                <div className="text-base font-bold text-ink-900">Danielle</div>
                <div className="text-xs font-medium text-ink-600">
                  Member #039521464 · Transitional
                </div>
              </div>
            </div>
            <div className="hairline" />

            <div className="flex flex-1 flex-col gap-4 p-5">
              {sessionSaved && (
                <div className="flex justify-center">
                  <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#E8F8F0] px-5 text-[13px] font-bold text-success">
                    <Check size={14} strokeWidth={3} /> Session saved · +15
                    points for Danielle
                  </span>
                </div>
              )}
              {cheerSent && (
                <div className="flex justify-center">
                  <span className="inline-flex h-10 items-center gap-2 rounded-full bg-gold-bg px-5 text-[13px] font-bold text-gold-ink">
                    <Diamond size={12} fill="currentColor" /> Cheer sent —
                    Danielle will see it on her Home
                  </span>
                </div>
              )}

              {/* Journey snapshot */}
              <div className={`rounded-2xl bg-white p-5 ${CARD_SHADOW}`}>
                <div className="text-xs font-bold tracking-[.12em] text-blue-primary">
                  JOURNEY SNAPSHOT
                </div>
                <div className="mt-3.5 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="tnum text-[22px] font-extrabold text-blue-primary">
                      45%
                    </div>
                    <div className="text-[11px] font-semibold text-ink-600">
                      ISE Course 3
                    </div>
                  </div>
                  <div>
                    <div className="tnum text-[22px] font-extrabold text-gold-ink">
                      12<span className="text-sm">d</span>
                    </div>
                    <div className="text-[11px] font-semibold text-ink-600">
                      streak
                    </div>
                  </div>
                  <div>
                    <div className="tnum text-[22px] font-extrabold text-success">
                      4/5
                    </div>
                    <div className="text-[11px] font-semibold text-ink-600">
                      mood · today
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-sky-tint pt-3.5">
                  <div className="flex justify-between text-[13px] font-semibold text-ink-900">
                    <span>Hallway house · $175/week</span>
                    <span className="text-blue-primary">$105</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-tint">
                    <div className="h-full w-[60%] rounded-full bg-[linear-gradient(90deg,#4E5B9B,#2E7CD6)]" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLogOpen(true)}
                  className="inline-flex h-14 cursor-pointer items-center justify-center gap-[7px] rounded-full bg-blue-primary text-sm font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
                >
                  Log a session
                </button>
                <button
                  onClick={sendCheer}
                  className="inline-flex h-14 cursor-pointer items-center justify-center gap-[7px] rounded-full border-[1.5px] border-gold-badge bg-amber-bg text-sm font-bold text-gold-ink"
                >
                  <Diamond size={13} fill="currentColor" /> Send a cheer
                </button>
              </div>

              <div className="text-xs font-bold tracking-[.12em] text-blue-primary">
                RECENT
              </div>
              <div className={`rounded-2xl bg-white ${CARD_SHADOW}`}>
                <div className="flex items-center gap-3.5 border-b border-canvas px-5 py-4">
                  <span className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[#E8F8F0] text-success">
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <div>
                    <div className="text-[13px] font-bold text-ink-900">
                      Completed ISE 3 · Lesson 1
                    </div>
                    <div className="text-[11px] font-normal text-ink-600">
                      yesterday
                    </div>
                  </div>
                </div>
                {/* Journal: privacy note only — content is never visible to mentors */}
                <div className="flex items-center gap-3.5 border-b border-canvas px-5 py-4">
                  <span className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-sky-tint text-blue-primary">
                    <Pencil size={14} strokeWidth={2.5} />
                  </span>
                  <div>
                    <div className="text-[13px] font-bold text-ink-900">
                      Journal entry · private
                    </div>
                    <div className="text-[11px] font-normal text-ink-600">
                      yesterday · visible to assigned staff only
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 px-5 py-4">
                  <span className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-gold-bg text-gold-ink">
                    <Diamond size={13} fill="currentColor" />
                  </span>
                  <div>
                    <div className="text-[13px] font-bold text-ink-900">
                      Earned 30-Day Streak badge
                    </div>
                    <div className="text-[11px] font-normal text-ink-600">
                      last week
                    </div>
                  </div>
                </div>
              </div>

              {/* Sessions summary — updates after a save */}
              <div
                className={`rounded-2xl bg-white px-5 py-[18px] ${CARD_SHADOW}`}
              >
                <div className="text-xs font-bold tracking-[.12em] text-blue-primary">
                  SESSIONS
                </div>
                <div className="mt-3 text-sm font-semibold text-ink-900">
                  {lastSession}
                </div>
                <div className="mt-1.5 text-[13px]/[1.6] font-normal text-ink-600">
                  {lastSessionNote}
                </div>
              </div>

              {/* Deliberately quiet — a text link, not a button */}
              <div className="mt-auto pb-2 text-center">
                <span className="cursor-pointer border-b border-[#E2E8F0] pb-0.5 text-[13px] font-semibold text-ink-400">
                  I&apos;m concerned about Danielle
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============ CHAT — THREAD LIST (signed in) ============ */}
        {view === "chatlist" && (
          <div className="flex flex-1 flex-col">
            <div className="bg-white px-5 pb-3.5 pt-[18px]">
              <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
                Messages
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-ink-600">
                Your mentees — a small nudge can change a whole day.
              </div>
            </div>
            <div className="hairline" />

            <div className="flex flex-1 flex-col gap-3.5 p-5">
              {threads.length === 0 && (
                <div className="py-8 text-center text-[13px] font-medium text-ink-400">
                  Loading your conversations…
                </div>
              )}
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openThreadFromList(t)}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-3.5 rounded-2xl bg-white px-5 py-[18px] text-left hover:bg-sky-tint ${CARD_SHADOW}`}
                >
                  <div
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-sky-tint text-[18px] font-extrabold"
                    style={{ color: t.other?.avatarColor || "#4E5B9B" }}
                  >
                    {(t.other?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-ink-900">
                      {t.other?.name}
                    </div>
                    <div className="mt-0.5 truncate text-[13px] font-medium text-ink-600">
                      {previewText(t.lastMessage)}
                    </div>
                  </div>
                  {t.lastMessage && (
                    <span className="flex-none self-start text-[11px] font-medium text-ink-400">
                      {timeAgo(t.lastMessage.createdAt)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============ THREAD — real conversation when signed in ============ */}
        {view === "thread" && activeThread && activeThread.other && viewerId && (
          <ChatThread
            threadId={activeThread.id}
            viewerId={viewerId}
            other={activeThread.other}
            showCheckInRequest
            onBack={backFromThread}
          />
        )}

        {/* ============ THREAD — static demo (signed out) ============ */}
        {view === "thread" && !(activeThread && activeThread.other && viewerId) && (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-3.5 bg-white px-5 py-3.5">
              <button
                onClick={backToRoster}
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center text-ink-900"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </button>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-tint text-[17px] font-extrabold text-indigo-brand">
                T
              </div>
              <div>
                <div className="text-base font-bold text-ink-900">Tyrell</div>
                <div className="text-xs font-medium text-amber-ink">
                  last seen 6 days ago
                </div>
              </div>
            </div>
            <div className="hairline" />

            <div className="flex flex-1 flex-col gap-3.5 p-5">
              {signedIn === false && (
                <a
                  href="/login"
                  className="flex min-h-[44px] items-center justify-center rounded-2xl border-[1.5px] border-sky-tint-2 bg-sky-tint px-5 py-3 text-center text-[13px] font-bold text-blue-primary hover:bg-sky-tint-2"
                >
                  This is a preview — sign in as a mentor to send real
                  messages →
                </a>
              )}

              <div className="text-center text-[11px] font-semibold text-ink-400">
                TODAY
              </div>
              <div className="flex justify-end">
                <div className="max-w-[270px] rounded-2xl rounded-tr-[6px] bg-blue-primary px-[17px] py-[13px] text-sm/[1.55] font-medium text-white">
                  Hey T — been thinking about you. No pressure, no agenda. You
                  good?
                </div>
              </div>

              {/* Mood check-in card */}
              <div className="rounded-2xl border-[1.5px] border-sky-tint bg-white p-5 shadow-[0_2px_10px_rgba(11,37,69,.08)]">
                <div className="text-xs font-bold tracking-[.12em] text-indigo-brand">
                  QUICK CHECK-IN · SENT WITH YOUR MESSAGE
                </div>
                <div className="mt-2 text-[15px] font-semibold text-ink-900">
                  How&apos;s today feeling, Tyrell?
                </div>
                <div className="mt-4 flex justify-between px-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const on = mood === n;
                    return (
                      <button
                        key={n}
                        onClick={() => setMood(n)}
                        className="flex cursor-pointer flex-col items-center gap-1.5"
                      >
                        <span
                          className={
                            "box-border inline-flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-extrabold " +
                            (on
                              ? "border-2 border-blue-primary bg-sky-tint text-blue-primary"
                              : "border-[1.5px] border-[#E2E8F0] bg-white text-ink-600")
                          }
                        >
                          {n}
                        </span>
                        <span
                          className={
                            "text-[10px] font-semibold " +
                            (on ? "text-blue-primary" : "text-ink-400")
                          }
                        >
                          {MOOD_WORDS[n]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3.5 text-center text-[11px] font-normal text-ink-400">
                  Shared with Marcus and the care team only.
                </div>
              </div>

              <div className="mt-auto text-center text-xs font-normal text-ink-400">
                Tyrell will see your message and check-in the next time he
                opens the app.
              </div>
            </div>

            {/* Composer */}
            <div className="flex items-center gap-2.5 border-t border-sky-tint bg-white px-4 pb-6 pt-3">
              <div className="flex h-12 flex-1 items-center rounded-full border-[1.5px] border-sky-tint bg-canvas px-5 text-sm font-normal text-ink-400">
                Message Tyrell…
              </div>
              <button className="flex h-12 w-12 flex-none cursor-pointer items-center justify-center rounded-full bg-blue-primary text-white">
                <ArrowUp size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* ============ COMMUNITY ============ */}
        {view === "community" && (
          <div className="flex flex-1 flex-col">
            <div className="bg-white px-5 pb-3.5 pt-[18px]">
              <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
                Community
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-ink-600">
                Wins and milestones from the whole family.
              </div>
            </div>
            <div className="hairline" />
            <div className="flex-1 p-5">
              <CommunityFeed compact />
            </div>
          </div>
        )}

        {/* ============ TAB BAR (hidden on detail) ============ */}
        {view !== "detail" && (
          <TabBar
            view={view}
            onMentees={backToRoster}
            onChat={openChatTab}
            onCommunity={() => setView("community")}
          />
        )}

        {/* ============ LOG SHEET ============ */}
        {logOpen && (
          <LogSheet
            mode={mode}
            duration={duration}
            onMode={setMode}
            onDuration={setDuration}
            onSave={() => {
              setLogOpen(false);
              setSessionSaved(true);
            }}
            onClose={() => setLogOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
