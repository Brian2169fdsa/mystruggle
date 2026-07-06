"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, ShieldCheck, Megaphone, Users, Heart } from "lucide-react";
import { timeAgo } from "@/app/components/chat/ChatThread";

/* ── Care-channel contracts (JSON from /api/care-channels) ──────────────── */

export type CareKind = "program_group" | "one_to_one" | "announcement";

export type CareChannelSummary = {
  id: string;
  kind: CareKind;
  title: string;
  memberId: string | null;
  cohortId: string | null;
  lastMessage: CareMsg | null;
  messageCount: number;
  unreadCount: number;
  canRead?: boolean;
  canPost: boolean;
};

export type CareMsg = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "member" | "mentor" | "staff";
  body: string;
  createdAt: number;
  kind: "text";
};

const CARD_SHADOW = "shadow-[0_1px_3px_rgba(11,37,69,.06)]";

/** Per-kind presentation - icon, tint, and the human label under the title. */
const KIND_META: Record<
  CareKind,
  { label: string; Icon: typeof Users; tint: string; ink: string }
> = {
  program_group: {
    label: "Program group",
    Icon: Users,
    tint: "bg-sky-tint",
    ink: "text-indigo-brand",
  },
  one_to_one: {
    label: "Your care team",
    Icon: Heart,
    tint: "bg-[#F0EDFB]",
    ink: "text-indigo-brand",
  },
  announcement: {
    label: "Announcements · read only",
    Icon: Megaphone,
    tint: "bg-amber-bg",
    ink: "text-amber-ink",
  },
};

/* ── Pinned "My Program" card - sits above The Guide in the Chat tab ─────── */

export function ProgramCard({
  onOpen,
}: {
  onOpen: (channel: CareChannelSummary, viewerId: string) => void;
}) {
  // undefined = checking; null-ish handled via signedIn flag.
  const [state, setState] = useState<{
    signedIn: boolean;
    channels: CareChannelSummary[];
    viewerId: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/care-channels");
        if (!alive) return;
        if (res.status === 401) {
          setState({ signedIn: false, channels: [], viewerId: "" });
          return;
        }
        const data = await res.json().catch(() => null);
        if (!alive) return;
        setState({
          signedIn: true,
          channels: Array.isArray(data?.channels) ? data.channels : [],
          viewerId: data?.viewerId ?? "",
        });
      } catch {
        if (alive) setState({ signedIn: false, channels: [], viewerId: "" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Still checking - render nothing to avoid a flash.
  if (state === null) return null;

  return (
    <div className="rounded-2xl border-[1.5px] border-sky-tint bg-white p-4 shadow-[0_2px_10px_rgba(11,37,69,.06)]">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-blue-primary" strokeWidth={2.4} />
        <span className="text-[11px] font-bold tracking-[.12em] text-indigo-brand">
          MY PROGRAM
        </span>
      </div>

      {!state.signedIn ? (
        <>
          <div className="mt-2 text-[13px]/[1.5] font-medium text-ink-600">
            Your IOP cohort, your care team, and center announcements live
            here once you sign in.
          </div>
          <a
            href="/login"
            className="mt-3 flex min-h-[44px] items-center justify-center rounded-full border-[1.5px] border-sky-tint-2 bg-sky-tint px-5 text-[13px] font-bold text-blue-primary hover:bg-sky-tint-2"
          >
            Sign in to see your program →
          </a>
        </>
      ) : state.channels.length === 0 ? (
        <div className="mt-2 text-[13px]/[1.5] font-medium text-ink-600">
          When your center adds you to a cohort or care team, it&apos;ll show up
          right here.
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {state.channels.map((c) => {
            const meta = KIND_META[c.kind];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onOpen(c, state.viewerId)}
                className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-sky-tint bg-white px-3.5 py-2.5 text-left hover:bg-sky-tint ${CARD_SHADOW}`}
              >
                <div
                  className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${meta.tint} ${meta.ink}`}
                >
                  <meta.Icon size={18} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold text-ink-900">
                    {c.title}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] font-medium text-ink-600">
                    {c.lastMessage
                      ? `${c.lastMessage.senderName.split(" ")[0]}: ${c.lastMessage.body}`
                      : meta.label}
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
        </div>
      )}

      <div className="mt-3 text-[11px]/[1.45] font-medium text-ink-400">
        For support &amp; scheduling - never clinical records.
      </div>
    </div>
  );
}

/* ── Full-height conversation - reuses the ChatThread bubble look ────────── */

export function CareThread({
  channel,
  viewerId,
  onBack,
}: {
  channel: CareChannelSummary;
  viewerId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<CareMsg[] | null>(null);
  const [input, setInput] = useState("");
  const [held, setHeld] = useState<{ line: string; note: string } | null>(null);
  const [sending, setSending] = useState(false);
  const lastTs = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);
  const meta = KIND_META[channel.kind];

  // ── Announcement read receipts (announcement channels ONLY - receipts are
  //    a broadcast feature; 1:1/group threads never get them). Announcements
  //    are staff-post-only, so canPost here cleanly splits the two viewers:
  //    canPost ⇒ staff (sees "Seen by N"), !canPost ⇒ member/mentor (beacons
  //    their reads once per mount, fire-and-forget).
  const isAnnouncement = channel.kind === "announcement";
  const staffViewer = isAnnouncement && channel.canPost;
  const beaconedRef = useRef(false);
  const [reads, setReads] = useState<Record<string, number> | null>(null);

  // Member/mentor: beacon the visible message ids once per mount.
  useEffect(() => {
    if (!isAnnouncement || staffViewer || beaconedRef.current) return;
    const ids = (messages ?? [])
      .filter((m) => !m.id.startsWith("tmp-"))
      .map((m) => m.id);
    if (!ids.length) return;
    beaconedRef.current = true;
    fetch(`/api/care-channels/${channel.id}/reads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: ids }),
    }).catch(() => {
      /* fire-and-forget - receipts are never worth an error state */
    });
  }, [messages, isAnnouncement, staffViewer, channel.id]);

  // Staff: fetch the channel's receipt rollup for the "Seen by N" lines.
  useEffect(() => {
    if (!staffViewer) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/care-channels/${channel.id}/reads`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!alive || !Array.isArray(data?.byMessage)) return;
        const map: Record<string, number> = {};
        for (const row of data.byMessage) map[row.messageId] = row.reads ?? 0;
        setReads(map);
      } catch {
        /* transient - receipts just stay hidden */
      }
    })();
    return () => {
      alive = false;
    };
  }, [staffViewer, channel.id]);

  const merge = useCallback((incoming: CareMsg[]) => {
    setMessages((prev) => {
      const cur = prev ?? [];
      const ids = new Set(cur.map((m) => m.id));
      const fresh = incoming.filter((m) => !ids.has(m.id));
      if (!fresh.length) return cur;
      return [...cur, ...fresh].sort((a, b) => a.createdAt - b.createdAt);
    });
  }, []);

  useEffect(() => {
    for (const m of messages ?? []) {
      if (!m.id.startsWith("tmp-") && m.createdAt > lastTs.current) {
        lastTs.current = m.createdAt;
      }
    }
  }, [messages]);

  // Initial load + 4s polling with ?after=.
  useEffect(() => {
    let alive = true;
    const load = async (after: number) => {
      try {
        const res = await fetch(
          `/api/care-channels/${channel.id}/messages${after ? `?after=${after}` : ""}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data.messages)) merge(data.messages);
      } catch {
        /* transient - next poll retries */
      }
    };
    load(0);
    const t = setInterval(() => load(lastTs.current), 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [channel.id, merge]);

  useEffect(() => {
    const count = messages?.length ?? 0;
    if (count && count !== countRef.current) {
      endRef.current?.scrollIntoView({
        behavior: countRef.current === 0 ? "auto" : "smooth",
        block: "end",
      });
      countRef.current = count;
    }
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setHeld(null);
    setSending(true);
    const temp: CareMsg = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      senderId: viewerId,
      senderName: "You",
      senderRole: "member",
      body: text,
      createdAt: Date.now(),
      kind: "text",
    };
    setMessages((prev) => [...(prev ?? []), temp]);
    try {
      const res = await fetch(`/api/care-channels/${channel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json().catch(() => null);
      // Crisis held → drop the optimistic bubble, show the 988 care card.
      if (res.ok && data?.held) {
        setMessages((prev) => (prev ?? []).filter((m) => m.id !== temp.id));
        setHeld(data.resources ?? null);
      } else {
        setMessages((prev) => {
          const rest = (prev ?? []).filter(
            (m) => m.id !== temp.id && m.id !== data?.message?.id
          );
          return res.ok && data?.message
            ? [...rest, data.message].sort((a, b) => a.createdAt - b.createdAt)
            : rest;
        });
      }
    } catch {
      setMessages((prev) => (prev ?? []).filter((m) => m.id !== temp.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center text-ink-900"
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div
          className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${meta.tint} ${meta.ink}`}
        >
          <meta.Icon size={20} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-ink-900">
            {channel.title}
          </div>
          <div className="text-xs font-medium text-ink-600">{meta.label}</div>
        </div>
      </div>

      {/* Persistent non-clinical banner */}
      <div className="flex items-center gap-2 bg-sky-tint px-4 py-2 text-[11px]/[1.4] font-semibold text-indigo-brand">
        <ShieldCheck size={13} strokeWidth={2.4} className="flex-none" />
        Messages here are for support &amp; scheduling - never clinical records.
      </div>
      <div className="hairline" />

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
        {messages === null && (
          <div className="py-8 text-center text-[13px] font-medium text-ink-400">
            Opening your conversation…
          </div>
        )}
        {messages !== null && messages.length === 0 && (
          <div className="py-8 text-center text-[13px] font-medium text-ink-400">
            {channel.kind === "announcement"
              ? "No announcements yet - your care team will post here."
              : "No messages yet - say hello. It matters more than you know."}
          </div>
        )}

        {(messages ?? []).map((m) => {
          const mine = m.senderId === viewerId;
          const showName = !mine && channel.kind !== "one_to_one";
          const staffTag = m.senderRole === "staff" || m.senderRole === "mentor";
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              {showName && (
                <span className="mb-1 px-1 text-[11px] font-bold text-ink-600">
                  {m.senderName.split(" ")[0]}
                  {staffTag && (
                    <span className="ml-1.5 rounded-full bg-[#F0EDFB] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-indigo-brand">
                      CARE TEAM
                    </span>
                  )}
                </span>
              )}
              <div
                className={
                  mine
                    ? "max-w-[270px] rounded-2xl rounded-tr-[6px] bg-blue-primary px-[17px] py-[13px] text-sm/[1.55] font-medium text-white"
                    : `max-w-[270px] rounded-2xl rounded-tl-[6px] border border-sky-tint bg-white px-[17px] py-[13px] text-sm/[1.55] font-medium text-ink-900 ${CARD_SHADOW}`
                }
              >
                {m.body}
              </div>
              <span className="mt-1 px-1 text-[10px] font-medium text-ink-400">
                {timeAgo(m.createdAt)}
              </span>
              {/* Muted receipt line - staff viewers of announcement channels
                  only. Never rendered in 1:1/group threads. */}
              {staffViewer && reads !== null && !m.id.startsWith("tmp-") && (
                <span className="px-1 text-[10px] font-medium text-ink-400">
                  {(reads[m.id] ?? 0) > 0
                    ? `Seen by ${reads[m.id]}`
                    : "Not seen yet"}
                </span>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Crisis held → warm 988 care card, never dismissive */}
      {held && (
        <div className="px-4 pb-3">
          <div className="rounded-2xl border-[1.5px] border-heart-red bg-[#FDECEC] p-4">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-heart-red">
              <Heart size={14} fill="currentColor" />
              We&apos;re here for you
            </div>
            <div className="mt-1.5 text-[13px]/[1.5] font-semibold text-ink-900">
              {held.line}
            </div>
            <div className="mt-1 text-[12px]/[1.5] font-medium text-ink-600">
              {held.note}
            </div>
          </div>
        </div>
      )}

      {/* Composer - only where the viewer may post; announcements are read-only */}
      {channel.canPost ? (
        <form
          onSubmit={send}
          className="flex items-center gap-2.5 border-t border-sky-tint bg-white px-4 pb-6 pt-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your program…"
            aria-label="Message your program"
            className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-sky-tint bg-canvas px-5 text-sm font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="inline-flex h-12 flex-none cursor-pointer items-center justify-center rounded-full bg-blue-primary px-5 text-sm font-bold text-white hover:bg-blue-hover disabled:cursor-default disabled:opacity-40"
          >
            Send
          </button>
        </form>
      ) : (
        <div className="border-t border-sky-tint bg-white px-4 pb-6 pt-3.5 text-center text-[12px] font-semibold text-ink-400">
          <Megaphone size={14} className="mr-1.5 inline align-text-bottom" />
          Announcements are posted by your care team.
        </div>
      )}
    </div>
  );
}
