"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Diamond,
  Heart,
  Megaphone,
  Pencil,
  Users,
} from "lucide-react";
import TabBar, { type MentorView } from "./TabBar";
import LogSheet, {
  type Duration,
  type Mode,
  MODE_LABEL,
  durationLabel,
} from "./LogSheet";
import ConcernSheet from "./ConcernSheet";
import ChatThread, {
  previewText,
  timeAgo,
  type ThreadSummary,
} from "@/app/components/chat/ChatThread";
import {
  CareThread,
  type CareChannelSummary,
  type CareKind,
} from "@/app/member-app/_components/ProgramSurface";
import CommunityFeed from "@/app/components/feed/CommunityFeed";
import MeTab, {
  DEMO_MENTEES,
  SESSION_LOGGED_EVENT,
  type MenteeAnalytics,
} from "./MeTab";

const MOOD_WORDS: Record<number, string> = {
  1: "rough",
  2: "low",
  3: "okay",
  4: "good",
  5: "great",
};

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

const firstName = (name: string) => name.split(" ")[0];

const CARD_SHADOW = "shadow-[0_1px_3px_rgba(11,37,69,.06)]";

/** Care-channel list presentation - icon + kind chip per channel kind. */
const CHANNEL_META: Record<
  CareKind,
  { chip: string; Icon: typeof Users; tint: string; ink: string }
> = {
  program_group: {
    chip: "Group",
    Icon: Users,
    tint: "bg-sky-tint",
    ink: "text-indigo-brand",
  },
  one_to_one: {
    chip: "1:1",
    Icon: Heart,
    tint: "bg-[#F0EDFB]",
    ink: "text-indigo-brand",
  },
  announcement: {
    chip: "Read-only",
    Icon: Megaphone,
    tint: "bg-amber-bg",
    ink: "text-amber-ink",
  },
};

/** Mentor phone app: roster → mentee detail / live chat + session-log sheet. */
export default function MentorApp() {
  const [view, setView] = useState<MentorView>("roster");
  const [logOpen, setLogOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("inperson");
  const [duration, setDuration] = useState<Duration>("45");
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);
  const [cheerResult, setCheerResult] = useState<"sent" | "nothread" | null>(
    null
  );
  const [mood, setMood] = useState<number | null>(null);

  // "I'm concerned" - quiet escalation to the care team.
  const [concernOpen, setConcernOpen] = useState(false);
  const [concernNote, setConcernNote] = useState("");
  const [concernSending, setConcernSending] = useState(false);
  const [concernNeedSignIn, setConcernNeedSignIn] = useState(false);
  const [concernResult, setConcernResult] = useState<
    "sent" | "duplicate" | null
  >(null);

  // Live chat state - real threads when signed in as a mentor.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  // Roster - real mentees from /api/mentor/analytics when signed in as a
  // mentor; the three flagship demo mentees otherwise.
  const [mentees, setMentees] = useState<MenteeAnalytics[] | null>(null);
  const [rosterLive, setRosterLive] = useState(false);
  const [activeMentee, setActiveMentee] = useState<MenteeAnalytics | null>(
    null
  );

  // Care channels the mentor belongs to (center group + announcements).
  const [channels, setChannels] = useState<CareChannelSummary[]>([]);
  const [activeChannel, setActiveChannel] =
    useState<CareChannelSummary | null>(null);

  // Real logged sessions for the open mentee detail when signed in.
  const [sessionInfo, setSessionInfo] = useState<{
    count: number;
    latest: ApiSession | null;
  } | null>(null);
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

  /** Real mentee roster from analytics; demo mentees when it isn't available. */
  const loadRoster = useCallback(async () => {
    try {
      const res = await fetch("/api/mentor/analytics");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.mentees) && data.mentees.length > 0) {
        setMentees(data.mentees as MenteeAnalytics[]);
        setRosterLive(true);
        return;
      }
    } catch {
      /* stays on demo content */
    }
    setMentees(DEMO_MENTEES);
    setRosterLive(false);
  }, []);

  const loadChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/care-channels");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.channels)) {
        setChannels(data.channels as CareChannelSummary[]);
        if (data.viewerId) setViewerId((v) => v || data.viewerId);
      }
    } catch {
      /* channels section simply stays hidden */
    }
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
          await Promise.all([loadThreads(), loadRoster(), loadChannels()]);
        } else {
          setSignedIn(false);
          setMentees(DEMO_MENTEES);
        }
      } catch {
        if (alive) {
          setSignedIn(false);
          setMentees(DEMO_MENTEES);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadThreads, loadRoster, loadChannels]);

  /** The DM thread with a mentee - matched by id (live roster) with a
   *  first-name fallback for the demo mentees. */
  const threadFor = useCallback(
    (m: MenteeAnalytics): ThreadSummary | null =>
      threads.find((t) => t.other?.id === m.id) ??
      threads.find((t) =>
        (t.other?.name ?? "")
          .toLowerCase()
          .startsWith(firstName(m.name).toLowerCase())
      ) ??
      null,
    [threads]
  );

  /** A mentee's real member id. The live roster IS the analytics payload, so
   *  the id is already real; demo entries resolve through the thread list. */
  const menteeId = useCallback(
    (m: MenteeAnalytics): string | null =>
      rosterLive ? m.id : threadFor(m)?.other?.id ?? null,
    [rosterLive, threadFor]
  );

  /** Ensure the DM thread with a mentee exists - the one we already have when
   *  there is one, otherwise the mentor-side find-or-create (POST /api/threads
   *  with { memberId }). Newly created threads are merged into the list so
   *  threadFor sees them immediately. Returns null only when the API says no
   *  (not our mentee) or the network fails - the honest fallback path. */
  const ensureThread = useCallback(
    async (m: MenteeAnalytics): Promise<ThreadSummary | null> => {
      const existing = threadFor(m);
      if (existing) return existing;
      const memberId = menteeId(m);
      if (!memberId) return null;
      try {
        const res = await fetch("/api/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.thread) {
          const t = data.thread as ThreadSummary;
          setThreads((prev) =>
            prev.some((p) => p.id === t.id) ? prev : [...prev, t]
          );
          return t;
        }
      } catch {
        /* fall through to the honest fallback */
      }
      return null;
    },
    [threadFor, menteeId]
  );

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

  // Refresh the open mentee's real session summary when the detail opens.
  useEffect(() => {
    if (view !== "detail" || !signedIn || !activeMentee) return;
    let alive = true;
    const id = menteeId(activeMentee);
    if (alive && id) loadSessions(id);
    return () => {
      alive = false;
    };
  }, [view, signedIn, activeMentee, menteeId, loadSessions]);

  const openDetail = (m: MenteeAnalytics) => {
    setActiveMentee(m);
    setView("detail");
    setSessionSaved(false);
    setSavedNote("");
    setSessionInfo(null);
    setCheerResult(null);
    setConcernOpen(false);
    setConcernNeedSignIn(false);
    setConcernResult(null);
  };

  /** Open the quiet concern sheet from the mentee-detail text link. */
  const openConcern = () => {
    setConcernNeedSignIn(false);
    setConcernOpen(true);
  };

  /** Send the concern to the care team - mentor session required; signed-out
   *  viewers get a gentle sign-in prompt inside the sheet, never an error. */
  const sendConcern = async () => {
    if (!signedIn || (meRole !== "mentor" && meRole !== "staff")) {
      setConcernNeedSignIn(true);
      return;
    }
    setConcernSending(true);
    try {
      const memberId = activeMentee ? menteeId(activeMentee) : null;
      if (!memberId) {
        setConcernNeedSignIn(true);
        return;
      }
      const res = await fetch("/api/concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          ...(concernNote.trim() ? { note: concernNote.trim() } : {}),
        }),
      });
      if (res.ok) {
        setConcernResult("sent");
        setConcernNote("");
        setConcernOpen(false);
      } else if (res.status === 409) {
        setConcernResult("duplicate");
        setConcernOpen(false);
      } else if (res.status === 401) {
        setConcernNeedSignIn(true);
      }
    } catch {
      /* quiet by design - the sheet simply stays open */
    } finally {
      setConcernSending(false);
    }
  };

  /** Save from the log sheet - optimistic banner always; real POST when
   *  signed in as a mentor. Sends exactly what the mentor typed (or no note
   *  at all) - never a canned string. */
  const saveSession = () => {
    const typed = note.trim();
    setLogOpen(false);
    setSessionSaved(true);
    setSavedNote(typed);
    setNote("");
    setMood(null);
    if (!signedIn || (meRole !== "mentor" && meRole !== "staff")) return;
    const memberId = activeMentee ? menteeId(activeMentee) : null;
    if (!memberId) return;
    (async () => {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId,
            mode: API_MODE[mode],
            minutes: Number(duration),
            ...(typed ? { note: typed } : {}),
          }),
        });
        if (res.ok) {
          loadSessions(memberId);
          // Me tab listens and refetches its analytics.
          window.dispatchEvent(new Event(SESSION_LOGGED_EVENT));
        }
      } catch {
        /* banner already shown - demo-grade */
      }
    })();
  };

  /** Amber nudge banner - ensure-thread-first, then open the conversation.
   *  The mentor never has to wait for the mentee to open the app. */
  const openNudge = async (m: MenteeAnalytics) => {
    if (!signedIn) {
      setActiveThread(null);
      setView("thread"); // static demo conversation
      return;
    }
    const t = await ensureThread(m);
    if (t) {
      setCameFrom("roster");
      setActiveThread(t);
      setView("thread");
    } else {
      openDetail(m); // final fallback - detail still shows everything else
    }
  };

  /** Chat tab: real thread list when signed in, demo thread otherwise. */
  const openChatTab = () => {
    if (signedIn) {
      setView("chatlist");
      loadThreads();
      loadChannels();
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

  const openChannel = (c: CareChannelSummary) => {
    setActiveChannel(c);
    setView("channel");
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

  /** Cheer from mentee detail - ensure the thread exists first (mentors can
   *  now open it themselves via POST /api/threads), then post the cheer as a
   *  real chat message. The amber "couldn't reach chat" note is only the
   *  final fallback when ensure-thread fails (offline, or not our mentee). */
  const sendCheer = async () => {
    if (!activeMentee) return;
    if (!signedIn) {
      setCheerResult("sent"); // demo behavior, banner only
      return;
    }
    const t = await ensureThread(activeMentee);
    if (t) {
      setCheerResult("sent");
      fetch(`/api/threads/${t.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "cheer",
          body: "Keep going - proud of you!",
        }),
      }).catch(() => {});
    } else {
      setCheerResult("nothread");
    }
  };

  /** Mood check-in: there's no mentor mood API, so a tap prefills the session
   *  note draft with "Mood: X/5" instead of pretending to send anything. */
  const pickMood = (n: number) => {
    setMood(n);
    setNote((prev) => {
      const base = prev.replace(/\n?Mood: [1-5]\/5\s*$/, "").trimEnd();
      return base ? `${base}\nMood: ${n}/5` : `Mood: ${n}/5`;
    });
  };

  // Real data when signed in; the just-saved optimistic copy wins right
  // after a save; honest demo copy otherwise.
  const latest = signedIn && rosterLive ? sessionInfo?.latest ?? null : null;
  const lastSession = sessionSaved
    ? `Last session: today · ${MODE_LABEL[mode]} · ${durationLabel(duration)}`
    : latest
      ? `Last session: ${dayLabel(latest.createdAt)} · ${API_MODE_LABEL[latest.mode]} · ${latest.minutes} min`
      : signedIn && rosterLive
        ? sessionInfo
          ? "No sessions logged yet."
          : "Loading sessions…"
        : activeMentee?.lastSession
          ? `Last session: ${dayLabel(activeMentee.lastSession)}`
          : "No sessions logged yet.";
  const lastSessionNote = sessionSaved
    ? savedNote
      ? `“${savedNote}”`
      : ""
    : latest?.note
      ? `“${latest.note}”`
      : "";
  const sessionCount =
    signedIn && rosterLive && sessionInfo ? sessionInfo.count : null;

  const attention = (mentees ?? []).find((m) => m.needsAttention) ?? null;

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
                  {mentees
                    ? `${mentees.length} mentee${mentees.length === 1 ? "" : "s"} · Laveen Center`
                    : "Laveen Center"}
                </div>
              </div>
              <span className="inline-flex h-7 items-center rounded-full bg-[#F0EDFB] px-3 text-[11px] font-extrabold text-indigo-brand">
                MENTOR
              </span>
            </div>
            <div className="hairline" />

            <div className="flex flex-1 flex-col gap-3.5 p-5">
              {/* Amber nudge banner - soft signal, opens thread */}
              {attention && (
                <div
                  onClick={() => openNudge(attention)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-gold-border bg-amber-bg px-[18px] py-3.5"
                >
                  <span className="h-2.5 w-2.5 flex-none rounded-full bg-gold-badge" />
                  <div className="flex-1 text-[13px]/[1.5] font-semibold text-ink-900">
                    {firstName(attention.name)} could use a little extra
                    attention. A quick hello goes a long way.
                  </div>
                  <span className="inline-flex flex-none items-center gap-1 text-[13px] font-bold text-blue-primary">
                    Message <ArrowRight size={14} strokeWidth={2.75} />
                  </span>
                </div>
              )}

              {/* Loading skeletons while the roster resolves */}
              {!mentees && (
                <>
                  <div className="h-[132px] animate-pulse rounded-2xl bg-sky-tint" />
                  <div className="h-[132px] animate-pulse rounded-2xl bg-sky-tint" />
                  <div className="h-[132px] animate-pulse rounded-2xl bg-sky-tint" />
                </>
              )}

              {/* One card per mentee - amber border for a quiet attention
                  signal, never red on a person. Every card opens detail. */}
              {(mentees ?? []).map((m) => (
                <div
                  key={m.id}
                  onClick={() => openDetail(m)}
                  className={
                    "cursor-pointer rounded-2xl bg-white p-5 " +
                    (m.needsAttention
                      ? "border-[1.5px] border-gold-border hover:bg-amber-bg "
                      : "hover:bg-sky-tint ") +
                    CARD_SHADOW
                  }
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-sky-tint text-[20px] font-extrabold"
                      style={{ color: m.avatarColor || "#4E5B9B" }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-bold text-ink-900">
                        {firstName(m.name)}
                      </div>
                      <div
                        className={
                          "text-xs font-medium " +
                          (m.needsAttention ? "text-amber-ink" : "text-ink-600")
                        }
                      >
                        {m.lastSession
                          ? `Last session ${dayLabel(m.lastSession)} · ${m.sessionsThisQuarter} this quarter`
                          : "No sessions logged yet"}
                      </div>
                    </div>
                    <ArrowRight
                      size={18}
                      strokeWidth={2.5}
                      className="flex-none text-blue-primary"
                    />
                  </div>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {m.streak > 0 ? (
                      <span className="inline-flex h-7 items-center gap-[5px] rounded-full bg-gold-bg px-3 text-[11px] font-extrabold text-gold-ink">
                        <Diamond size={10} fill="currentColor" /> {m.streak}
                        -day streak
                      </span>
                    ) : (
                      <span className="inline-flex h-7 items-center rounded-full bg-[#F1F5F9] px-3 text-[11px] font-bold text-ink-600">
                        Streak paused
                      </span>
                    )}
                    {m.courseProgress !== null ? (
                      <span className="inline-flex h-7 items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
                        Course {m.courseProgress}%
                      </span>
                    ) : (
                      <span className="inline-flex h-7 items-center rounded-full bg-[#F1F5F9] px-3 text-[11px] font-bold text-ink-600">
                        Course not started
                      </span>
                    )}
                    {m.barcTrend === "up" && (
                      <span className="inline-flex h-7 items-center rounded-full bg-[#E8F8F0] px-3 text-[11px] font-bold text-success">
                        Check-in rising
                      </span>
                    )}
                    {m.barcTrend === "flat" && (
                      <span className="inline-flex h-7 items-center rounded-full bg-[#F1F5F9] px-3 text-[11px] font-bold text-ink-600">
                        Check-in steady
                      </span>
                    )}
                    {m.barcTrend === "down" && (
                      <span className="inline-flex h-7 items-center rounded-full bg-amber-bg px-3 text-[11px] font-bold text-amber-ink">
                        Check-in dipping
                      </span>
                    )}
                    {m.openConcern && (
                      <span className="inline-flex h-7 items-center rounded-full bg-amber-bg px-3 text-[11px] font-bold text-amber-ink">
                        Concern raised
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ MENTEE DETAIL ============ */}
        {view === "detail" && activeMentee && (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-3.5 bg-white px-5 py-3.5">
              <button
                onClick={backToRoster}
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center text-ink-900"
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </button>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-tint text-[17px] font-extrabold"
                style={{ color: activeMentee.avatarColor || "#4E5B9B" }}
              >
                {activeMentee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-base font-bold text-ink-900">
                  {firstName(activeMentee.name)}
                </div>
                <div className="text-xs font-medium text-ink-600">
                  {activeMentee.memberNumber
                    ? `Member #${activeMentee.memberNumber}`
                    : "Mentee"}
                </div>
              </div>
            </div>
            <div className="hairline" />

            <div className="flex flex-1 flex-col gap-4 p-5">
              {sessionSaved && (
                <div className="flex justify-center">
                  <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#E8F8F0] px-5 text-[13px] font-bold text-success">
                    <Check size={14} strokeWidth={3} /> Session saved · +15
                    points for {firstName(activeMentee.name)}
                  </span>
                </div>
              )}
              {cheerResult === "sent" && (
                <div className="flex justify-center">
                  <span className="inline-flex h-10 items-center gap-2 rounded-full bg-gold-bg px-5 text-[13px] font-bold text-gold-ink">
                    <Diamond size={12} fill="currentColor" /> Cheer sent -{" "}
                    {firstName(activeMentee.name)} will see it in chat
                  </span>
                </div>
              )}
              {cheerResult === "nothread" && (
                <div className="flex justify-center">
                  <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-bg px-5 py-2 text-center text-[13px] font-bold text-amber-ink">
                    Couldn&apos;t reach {firstName(activeMentee.name)}&apos;s
                    chat just now - your cheer wasn&apos;t sent. Try again in a
                    moment.
                  </span>
                </div>
              )}

              {/* Journey snapshot - real analytics signals */}
              <div className={`rounded-2xl bg-white p-5 ${CARD_SHADOW}`}>
                <div className="text-xs font-bold tracking-[.12em] text-blue-primary">
                  JOURNEY SNAPSHOT
                </div>
                <div className="mt-3.5 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="tnum text-[22px] font-extrabold text-blue-primary">
                      {activeMentee.courseProgress !== null
                        ? `${activeMentee.courseProgress}%`
                        : "—"}
                    </div>
                    <div className="text-[11px] font-semibold text-ink-600">
                      course
                    </div>
                  </div>
                  <div>
                    <div className="tnum text-[22px] font-extrabold text-gold-ink">
                      {activeMentee.streak}
                      <span className="text-sm">d</span>
                    </div>
                    <div className="text-[11px] font-semibold text-ink-600">
                      streak
                    </div>
                  </div>
                  <div>
                    <div className="tnum text-[22px] font-extrabold text-success">
                      {activeMentee.lastBarcTotal !== null
                        ? `${activeMentee.lastBarcTotal}/50`
                        : "—"}
                    </div>
                    <div className="text-[11px] font-semibold text-ink-600">
                      self-check
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-sky-tint pt-3.5">
                  <div className="flex justify-between text-[13px] font-semibold text-ink-900">
                    <span>Goals</span>
                    <span className="tnum text-blue-primary">
                      {activeMentee.goalsActive} active ·{" "}
                      {activeMentee.goalsAchieved} achieved
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-tint">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#4E5B9B,#2E7CD6)]"
                      style={{
                        width:
                          activeMentee.goalsActive +
                            activeMentee.goalsAchieved >
                          0
                            ? `${Math.round(
                                (activeMentee.goalsAchieved /
                                  (activeMentee.goalsActive +
                                    activeMentee.goalsAchieved)) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
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

              {/* RECENT is demo-only content - there's no per-mentee activity
                  feed API yet, and we never fabricate one for real people. */}
              {!rosterLive && (
                <>
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
                    {/* Journal: privacy note only - content is never visible to mentors */}
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
                </>
              )}

              {/* Sessions summary - updates after a save */}
              <div
                className={`rounded-2xl bg-white px-5 py-[18px] ${CARD_SHADOW}`}
              >
                <div className="text-xs font-bold tracking-[.12em] text-blue-primary">
                  SESSIONS
                </div>
                <div className="mt-3 text-sm font-semibold text-ink-900">
                  {lastSession}
                </div>
                {lastSessionNote && (
                  <div className="mt-1.5 whitespace-pre-line text-[13px]/[1.6] font-normal text-ink-600">
                    {lastSessionNote}
                  </div>
                )}
                {sessionCount !== null && (
                  <div className="mt-2 text-[11px] font-semibold text-ink-400">
                    {sessionCount} session{sessionCount === 1 ? "" : "s"} logged
                    with {firstName(activeMentee.name)}
                  </div>
                )}
              </div>

              {/* Deliberately quiet - a text link, not a button */}
              <div className="mt-auto pb-2 text-center">
                {concernResult === "sent" ? (
                  <span className="text-[13px] font-semibold text-ink-600">
                    ✓ The care team has been notified. Thank you for looking
                    out.
                  </span>
                ) : concernResult === "duplicate" ? (
                  <span className="text-[13px] font-semibold text-ink-600">
                    You already raised this - the care team is on it.
                  </span>
                ) : (
                  <span
                    onClick={openConcern}
                    className="cursor-pointer border-b border-[#E2E8F0] pb-0.5 text-[13px] font-semibold text-ink-400"
                  >
                    I&apos;m concerned about {firstName(activeMentee.name)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ CHAT - THREAD LIST (signed in) ============ */}
        {view === "chatlist" && (
          <div className="flex flex-1 flex-col">
            <div className="bg-white px-5 pb-3.5 pt-[18px]">
              <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
                Messages
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-ink-600">
                Your mentees - a small nudge can change a whole day.
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

              {/* Care channels - center group + announcements, real API */}
              {channels.length > 0 && (
                <>
                  <div className="mt-1 text-xs font-bold tracking-[.12em] text-blue-primary">
                    CARE CHANNELS
                  </div>
                  {channels.map((c) => {
                    const meta = CHANNEL_META[c.kind];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openChannel(c)}
                        className={`flex min-h-[44px] cursor-pointer items-center gap-3.5 rounded-2xl bg-white px-5 py-[18px] text-left hover:bg-sky-tint ${CARD_SHADOW}`}
                      >
                        <div
                          className={`flex h-12 w-12 flex-none items-center justify-center rounded-full ${meta.tint} ${meta.ink}`}
                        >
                          <meta.Icon size={20} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[15px] font-bold text-ink-900">
                              {c.title}
                            </span>
                            <span
                              className={`inline-flex h-5 flex-none items-center rounded-full px-2 text-[10px] font-extrabold ${meta.tint} ${meta.ink}`}
                            >
                              {meta.chip}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-[13px] font-medium text-ink-600">
                            {c.lastMessage
                              ? `${firstName(c.lastMessage.senderName)}: ${c.lastMessage.body}`
                              : "No messages yet"}
                          </div>
                        </div>
                        {c.unreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-[20px] flex-none items-center justify-center rounded-full bg-blue-primary px-1.5 text-[11px] font-bold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* ============ CARE CHANNEL - messages + composer, crisis-safe ==== */}
        {view === "channel" && activeChannel && viewerId && (
          <CareThread
            channel={activeChannel}
            viewerId={viewerId}
            onBack={() => {
              setActiveChannel(null);
              setView("chatlist");
              loadChannels();
            }}
          />
        )}

        {/* ============ THREAD - real conversation when signed in ============ */}
        {view === "thread" && activeThread && activeThread.other && viewerId && (
          <ChatThread
            threadId={activeThread.id}
            viewerId={viewerId}
            other={activeThread.other}
            showCheckInRequest
            onBack={backFromThread}
          />
        )}

        {/* ============ THREAD - static demo (signed out) ============ */}
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
                  This is a preview - sign in as a mentor to send real
                  messages →
                </a>
              )}

              <div className="text-center text-[11px] font-semibold text-ink-400">
                TODAY
              </div>
              <div className="flex justify-end">
                <div className="max-w-[270px] rounded-2xl rounded-tr-[6px] bg-blue-primary px-[17px] py-[13px] text-sm/[1.55] font-medium text-white">
                  Hey T - been thinking about you. No pressure, no agenda. You
                  good?
                </div>
              </div>

              {/* Mood check-in card - prefills the session-note draft */}
              <div className="rounded-2xl border-[1.5px] border-sky-tint bg-white p-5 shadow-[0_2px_10px_rgba(11,37,69,.08)]">
                <div className="text-xs font-bold tracking-[.12em] text-indigo-brand">
                  QUICK CHECK-IN · FOR YOUR SESSION NOTE
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
                        onClick={() => pickMood(n)}
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
                  {mood
                    ? `Added "Mood: ${mood}/5" to your session-note draft.`
                    : "Tap a number to prefill your next session note."}
                </div>
              </div>

              <div className="mt-auto text-center text-xs font-normal text-ink-400">
                This is a preview conversation - nothing here is sent.
              </div>
            </div>

            {/* Composer - visual only in the preview; sending needs a session */}
            <div className="border-t border-sky-tint bg-white px-4 pb-6 pt-3">
              <div className="flex items-center gap-2.5">
                {signedIn === false ? (
                  <a
                    href="/login"
                    className="flex h-12 flex-1 items-center rounded-full border-[1.5px] border-sky-tint bg-canvas px-5 text-sm font-bold text-blue-primary hover:border-blue-primary"
                  >
                    Sign in to reply
                  </a>
                ) : (
                  <div className="flex h-12 flex-1 items-center rounded-full border-[1.5px] border-sky-tint bg-canvas px-5 text-sm font-normal text-ink-400">
                    Message Tyrell…
                  </div>
                )}
                <button
                  disabled
                  aria-disabled="true"
                  title="Sign in to reply"
                  className="flex h-12 w-12 flex-none cursor-default items-center justify-center rounded-full bg-blue-primary text-white opacity-40"
                >
                  <ArrowUp size={20} strokeWidth={2.5} />
                </button>
              </div>
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

        {/* ============ ME - my mentoring analytics ============ */}
        {view === "me" && <MeTab signedIn={signedIn} meRole={meRole} />}

        {/* ============ TAB BAR (hidden on detail) ============ */}
        {view !== "detail" && (
          <TabBar
            view={view}
            onMentees={backToRoster}
            onChat={openChatTab}
            onCommunity={() => setView("community")}
            onMe={() => setView("me")}
          />
        )}

        {/* ============ CONCERN SHEET - quiet escalation ============ */}
        {concernOpen && activeMentee && (
          <ConcernSheet
            name={firstName(activeMentee.name)}
            note={concernNote}
            onNote={setConcernNote}
            onSend={sendConcern}
            onClose={() => setConcernOpen(false)}
            sending={concernSending}
            needSignIn={concernNeedSignIn}
          />
        )}

        {/* ============ LOG SHEET ============ */}
        {logOpen && activeMentee && (
          <LogSheet
            name={firstName(activeMentee.name)}
            mode={mode}
            duration={duration}
            note={note}
            onMode={setMode}
            onDuration={setDuration}
            onNote={setNote}
            onSave={saveSession}
            onClose={() => setLogOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
