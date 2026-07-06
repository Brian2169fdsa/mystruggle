"use client";

import { useEffect, useState } from "react";
import ChatThread, {
  previewText,
  timeAgo,
  type ThreadSummary,
} from "@/app/components/chat/ChatThread";
import {
  ProgramCard,
  CareThread,
  type CareChannelSummary,
} from "./ProgramSurface";
import GuideCompanion from "./GuideCompanion";

export default function ChatTab({
  openChannelId = null,
}: {
  /** Care channel to auto-open on mount (MyProgramPanel's "open cohort
   *  chat" → MemberApp → here). Null = normal tab behavior. */
  openChannelId?: string | null;
}) {
  // undefined = still checking the session; null = signed out.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [viewerId, setViewerId] = useState("");
  const [open, setOpen] = useState<ThreadSummary | null>(null);
  // My Program (docs/14 §D) - an open care channel takes over the full tab,
  // same pattern as the mentor thread. Not a 6th tab.
  const [openCare, setOpenCare] = useState<{
    channel: CareChannelSummary;
    viewerId: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json().catch(() => null);
        if (!alive) return;
        if (!meData?.user) {
          setSignedIn(false);
          return;
        }
        const tRes = await fetch("/api/threads");
        const tData = await tRes.json().catch(() => null);
        if (!alive) return;
        if (tRes.ok && tData?.threads) {
          setThreads(tData.threads);
          setViewerId(tData.viewerId);
        }
        setSignedIn(true);
      } catch {
        if (alive) setSignedIn(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Auto-open a requested care channel (same source of truth ProgramCard
  // uses: /api/care-channels). Runs once per requested id; backing out of
  // the thread does not re-trigger it.
  useEffect(() => {
    if (!openChannelId) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/care-channels");
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!alive) return;
        const channels: CareChannelSummary[] = Array.isArray(data?.channels)
          ? data.channels
          : [];
        const channel = channels.find((c) => c.id === openChannelId);
        if (channel) {
          setOpenCare({ channel, viewerId: data?.viewerId ?? "" });
        }
      } catch {
        // signed out / offline - fall back to the normal channel list
      }
    })();
    return () => {
      alive = false;
    };
  }, [openChannelId]);

  // ── Open care channel - full height within the tab ──
  if (openCare) {
    return (
      <div className="flex flex-1 flex-col">
        <CareThread
          channel={openCare.channel}
          viewerId={openCare.viewerId}
          onBack={() => setOpenCare(null)}
        />
      </div>
    );
  }

  // ── Open conversation - full height within the tab ──
  if (open && open.other && viewerId) {
    return (
      <div className="flex flex-1 flex-col">
        <ChatThread
          threadId={open.id}
          viewerId={viewerId}
          other={open.other}
          showMoodPrompt
          onBack={() => setOpen(null)}
        />
      </div>
    );
  }

  const realThreads = signedIn === true && threads.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-white px-5 pb-3.5 pt-[18px]">
        <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
          Chat
        </div>
      </div>
      <div className="hairline" />

      <div className="flex flex-col gap-4 p-5">
        {/* Pinned mentor thread - real when signed in, demo otherwise */}
        {realThreads ? (
          threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpen(t)}
              className="flex min-h-[44px] cursor-pointer items-center gap-3.5 rounded-2xl bg-white px-5 py-[18px] text-left shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:bg-sky-tint"
            >
              <div className="relative flex-none">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-tint text-[18px] font-extrabold"
                  style={{ color: t.other?.avatarColor || "#4E5B9B" }}
                >
                  {(t.other?.name ?? "?").charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-ink-900">
                  {t.other?.name}{" "}
                  {t.other?.role === "mentor" && (
                    <span className="ml-1 rounded-full bg-[#F0EDFB] px-2 py-0.5 text-[11px] font-semibold text-indigo-brand">
                      MY MENTOR
                    </span>
                  )}
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
          ))
        ) : (
          <div className="flex items-center gap-3.5 rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <div className="relative flex-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-tint text-[18px] font-extrabold text-indigo-brand">
                M
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-ink-900">
                Marcus T.{" "}
                <span className="ml-1 rounded-full bg-[#F0EDFB] px-2 py-0.5 text-[11px] font-semibold text-indigo-brand">
                  MY MENTOR
                </span>
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-ink-600">
                Proud of you for today. Same time Thursday?
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-medium text-ink-400">
                2:41 pm
              </span>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-primary text-[11px] font-bold text-white">
                1
              </span>
            </div>
          </div>
        )}

        {signedIn === false && (
          <a
            href="/login"
            className="flex min-h-[44px] items-center justify-center rounded-2xl border-[1.5px] border-sky-tint-2 bg-sky-tint px-5 py-3 text-[13px] font-bold text-blue-primary hover:bg-sky-tint-2"
          >
            Sign in to message your mentor →
          </a>
        )}

        {/* My Program - care channels (IOP cohort, care team, announcements) */}
        <ProgramCard
          onOpen={(channel, vId) => setOpenCare({ channel, viewerId: vId })}
        />
      </div>

      {/* The Guide - plan-aware AI companion. Owns its own context card,
          conversation scroll, and composer (see GuideCompanion). */}
      <GuideCompanion />
    </div>
  );
}
