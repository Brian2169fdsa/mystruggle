"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, Diamond } from "lucide-react";

/* ── Shared chat contracts ─────────────────────────────────────────── */

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  kind: "text" | "mood" | "cheer";
  body: string;
  mood?: number;
  createdAt: number;
};

export type ThreadOther = {
  id?: string;
  name: string;
  role: string;
  avatarColor: string;
};

/** Shape of one entry from GET /api/threads. */
export type ThreadSummary = {
  id: string;
  other: (ThreadOther & { id: string }) | null;
  lastMessage: ChatMessage | null;
  messageCount: number;
};

export const MOOD_WORDS: Record<number, string> = {
  1: "rough",
  2: "low",
  3: "okay",
  4: "good",
  5: "great",
};

/** Warm relative timestamp — "just now" → "3m" → "2h" → "yesterday". */
export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** One-line preview for thread lists. */
export function previewText(m: ChatMessage | null): string {
  if (!m) return "Say hello — a first message goes a long way.";
  if (m.kind === "mood")
    return `Checked in: ${m.mood}/5 · ${MOOD_WORDS[m.mood ?? 3] ?? ""}`;
  if (m.kind === "cheer") return `◆ ${m.senderName} sent a cheer!`;
  return m.body;
}

const CARD_SHADOW = "shadow-[0_1px_3px_rgba(11,37,69,.06)]";

/* ── Conversation view ─────────────────────────────────────────────── */

/**
 * Shared live conversation — used by the member Chat tab and the mentor app.
 * Polls every 4s with ?after=<last createdAt>, optimistic sends, mood +
 * cheer message cards.
 */
export default function ChatThread({
  threadId,
  viewerId,
  other,
  showMoodPrompt = false,
  showCheckInRequest = false,
  onBack,
}: {
  threadId: string;
  viewerId: string;
  other: ThreadOther;
  /** Member side: render the 1–5 mood check-in card above the composer. */
  showMoodPrompt?: boolean;
  /** Mentor side: small button that asks the mentee to check in. */
  showCheckInRequest?: boolean;
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [moodDone, setMoodDone] = useState(false);
  const lastTs = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const cur = prev ?? [];
      const ids = new Set(cur.map((m) => m.id));
      const fresh = incoming.filter((m) => !ids.has(m.id));
      if (!fresh.length) return cur;
      return [...cur, ...fresh].sort((a, b) => a.createdAt - b.createdAt);
    });
  }, []);

  // Track the newest server timestamp for cheap ?after= polling.
  useEffect(() => {
    for (const m of messages ?? []) {
      if (!m.id.startsWith("tmp-") && m.createdAt > lastTs.current) {
        lastTs.current = m.createdAt;
      }
    }
  }, [messages]);

  // Initial load + 4s polling.
  useEffect(() => {
    let alive = true;
    const load = async (after: number) => {
      try {
        const res = await fetch(
          `/api/threads/${threadId}/messages${after ? `?after=${after}` : ""}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data.messages)) merge(data.messages);
      } catch {
        /* transient network hiccup — next poll retries */
      }
    };
    load(0);
    const t = setInterval(() => load(lastTs.current), 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [threadId, merge]);

  // Auto-scroll to the newest message.
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

  const post = useCallback(
    async (payload: { body: string; kind?: "mood" | "cheer"; mood?: number }) => {
      const temp: ChatMessage = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        senderId: viewerId,
        senderName: "You",
        kind: payload.kind ?? "text",
        body: payload.body,
        mood: payload.mood,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...(prev ?? []), temp]);
      try {
        const res = await fetch(`/api/threads/${threadId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        setMessages((prev) => {
          const rest = (prev ?? []).filter(
            (m) => m.id !== temp.id && m.id !== data?.message?.id
          );
          return res.ok && data?.message
            ? [...rest, data.message].sort((a, b) => a.createdAt - b.createdAt)
            : rest;
        });
      } catch {
        setMessages((prev) => (prev ?? []).filter((m) => m.id !== temp.id));
      }
    },
    [threadId, viewerId]
  );

  const sendText = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    post({ body: text });
  };

  const sendMood = (n: number) => {
    setMoodDone(true);
    post({ body: "", kind: "mood", mood: n });
  };

  const firstName = other.name.split(" ")[0];

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center text-ink-900"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
        )}
        <div className="relative flex-none">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-tint text-[17px] font-extrabold"
            style={{ color: other.avatarColor || "#4E5B9B" }}
          >
            {firstName.charAt(0).toUpperCase()}
          </div>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-success" />
        </div>
        <div>
          <div className="text-base font-bold text-ink-900">{other.name}</div>
          <div className="text-xs font-medium text-ink-600">
            {other.role === "mentor" ? "Your mentor" : "Your mentee"}
          </div>
        </div>
      </div>
      <div className="hairline" />

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {messages === null && (
          <div className="py-8 text-center text-[13px] font-medium text-ink-400">
            Opening your conversation…
          </div>
        )}
        {messages !== null && messages.length === 0 && (
          <div className="py-8 text-center text-[13px] font-medium text-ink-400">
            No messages yet — say hello. It matters more than you know.
          </div>
        )}

        {(messages ?? []).map((m) => {
          const mine = m.senderId === viewerId;

          if (m.kind === "mood") {
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div className="w-[240px] rounded-2xl border-[1.5px] border-sky-tint-2 bg-sky-tint px-[18px] py-3.5">
                  <div className="text-[11px] font-bold tracking-[.12em] text-indigo-brand">
                    CHECK-IN
                  </div>
                  <div className="mt-1 text-[15px] font-extrabold text-ink-900">
                    Checked in: {m.mood}/5{" "}
                    <span className="font-bold text-blue-primary">
                      · {MOOD_WORDS[m.mood ?? 3] ?? ""}
                    </span>
                  </div>
                </div>
                <span className="mt-1 px-1 text-[10px] font-medium text-ink-400">
                  {timeAgo(m.createdAt)}
                </span>
              </div>
            );
          }

          if (m.kind === "cheer") {
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div className="max-w-[270px] rounded-2xl border-[1.5px] border-gold-border bg-gold-bg px-[18px] py-3.5">
                  <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-gold-ink">
                    <Diamond size={12} fill="currentColor" />
                    {mine ? "You" : m.senderName} sent a cheer!
                  </div>
                  {m.body && (
                    <div className="mt-1 text-[13px]/[1.5] font-semibold text-ink-900">
                      {m.body}
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] font-medium text-ink-400">
                  {timeAgo(m.createdAt)}
                </span>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
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
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Mood check-in prompt — member side only */}
      {showMoodPrompt && !moodDone && (
        <div className="px-4 pb-3">
          <div className="rounded-2xl border-[1.5px] border-sky-tint bg-white p-5 shadow-[0_2px_10px_rgba(11,37,69,.08)]">
            <div className="text-xs font-bold tracking-[.12em] text-indigo-brand">
              QUICK CHECK-IN
            </div>
            <div className="mt-2 text-[15px] font-semibold text-ink-900">
              How&apos;s today feeling?
            </div>
            <div className="mt-4 flex justify-between px-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => sendMood(n)}
                  className="flex cursor-pointer flex-col items-center gap-1.5"
                >
                  <span className="box-border inline-flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-[#E2E8F0] bg-white text-[15px] font-extrabold text-ink-600 hover:border-blue-primary hover:bg-sky-tint hover:text-blue-primary">
                    {n}
                  </span>
                  <span className="text-[10px] font-semibold text-ink-400">
                    {MOOD_WORDS[n]}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3.5 text-center text-[11px] font-normal text-ink-400">
              Shared with your mentor and the care team only.
            </div>
          </div>
        </div>
      )}
      {showMoodPrompt && moodDone && (
        <div className="px-4 pb-3 text-center text-[12px] font-semibold text-success">
          ✓ Checked in — thanks for sharing how today feels.
        </div>
      )}

      {/* Request a check-in — mentor side only */}
      {showCheckInRequest && (
        <div className="flex justify-end px-4 pb-2">
          <button
            type="button"
            onClick={() => post({ body: "How are you feeling today, 1–5?" })}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-4 text-[12px] font-bold text-blue-primary hover:bg-sky-tint"
          >
            Request a check-in
          </button>
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={sendText}
        className="flex items-center gap-2.5 border-t border-sky-tint bg-white px-4 pb-6 pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${firstName}…`}
          aria-label={`Message ${firstName}`}
          className="h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-sky-tint bg-canvas px-5 text-sm font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="inline-flex h-12 flex-none cursor-pointer items-center justify-center rounded-full bg-blue-primary px-5 text-sm font-bold text-white hover:bg-blue-hover disabled:cursor-default disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
