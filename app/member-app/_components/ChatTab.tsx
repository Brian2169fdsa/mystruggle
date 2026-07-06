"use client";

import { useEffect, useState } from "react";
import type { GuideState } from "./MemberApp";
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

const GUIDE_CHIPS = [
  "I’m looking for a halfway house",
  "I need my driver's license back",
  "Help me find a job",
];

const GUIDE_ANSWERS: Record<string, string> = {
  "I need my driver's license back":
    "In Arizona that usually means clearing reinstatement fees at MVD. Three steps:\n1. Check your status on azdot.gov\n2. Ask staff about the fee-assistance fund\n3. Book the MVD visit.\nWant me to add “MVD reinstatement visit” as a task?",
  "I’m looking for a halfway house":
    "There are 3 partner halfway houses near Laveen with openings this month. Your center coordinator, Sarah, handles placements — I can flag your interest and add “Ask Sarah about halfway house openings” to your tracker. Sound good?",
  "Help me find a job":
    "Your VOC program has 2 employer partners hiring now — ABC Painting and Desert Logistics. You already have an interview at ABC Painting! Want me to add “Prep 3 interview answers” as a task for today?",
};

/** The Guide avatar — script "M" on indigo→blue gradient tile. */
function GuideAvatar() {
  return (
    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[linear-gradient(135deg,#4E5B9B,#2E7CD6)] font-script text-[20px] text-white">
      M
    </div>
  );
}

export default function ChatTab({
  guideState,
  askedLabel,
  askGuide,
  addGuideTask,
  resetGuide,
}: {
  guideState: GuideState;
  askedLabel: string;
  askGuide: (label: string) => void;
  addGuideTask: () => void;
  resetGuide: () => void;
}) {
  // undefined = still checking the session; null = signed out.
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [viewerId, setViewerId] = useState("");
  const [open, setOpen] = useState<ThreadSummary | null>(null);
  // My Program (docs/14 §D) — an open care channel takes over the full tab,
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

  // ── Open care channel — full height within the tab ──
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

  // ── Open conversation — full height within the tab ──
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

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Pinned mentor thread — real when signed in, demo otherwise */}
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

        {/* My Program — care channels (IOP cohort, care team, announcements) */}
        <ProgramCard
          onOpen={(channel, vId) => setOpenCare({ channel, viewerId: vId })}
        />

        {/* Divider */}
        <div className="mt-1 flex items-center gap-2.5">
          <div className="h-px flex-1 bg-[#E2E8F0]" />
          <span className="text-[11px] font-bold tracking-[.12em] text-indigo-brand">
            THE GUIDE
          </span>
          <div className="h-px flex-1 bg-[#E2E8F0]" />
        </div>

        {/* Intro bubble */}
        <div className="flex items-start gap-2.5">
          <GuideAvatar />
          <div className="max-w-[280px] rounded-2xl rounded-tl-md bg-white px-[18px] py-3.5 text-[14px]/[1.6] font-medium text-ink-900 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            Hi Danielle — I&apos;m The Guide. I can help with housing,
            documents, jobs, and anything on your journey. What do you need
            today?
          </div>
        </div>

        {guideState === "idle" && (
          <div className="flex flex-col gap-2 pl-[46px]">
            {GUIDE_CHIPS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => askGuide(label)}
                className="inline-flex min-h-[44px] cursor-pointer items-center self-start rounded-full border-[1.5px] border-blue-primary px-[18px] py-2.5 text-left text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {guideState === "asked" && (
          <div className="flex flex-col gap-3.5">
            <div className="flex justify-end">
              <div className="max-w-[280px] rounded-2xl rounded-tr-md bg-blue-primary px-[18px] py-3.5 text-[14px]/[1.6] font-medium text-white">
                {askedLabel}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <GuideAvatar />
              <div className="max-w-[290px] whitespace-pre-line rounded-2xl rounded-tl-md bg-white px-[18px] py-3.5 text-[14px]/[1.6] font-medium text-ink-900 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
                {GUIDE_ANSWERS[askedLabel] ?? ""}
              </div>
            </div>
            <div className="flex gap-2 pl-[46px]">
              <button
                type="button"
                onClick={addGuideTask}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-blue-primary px-5 text-[13px] font-bold text-white hover:bg-blue-hover"
              >
                Yes, add it to my tracker
              </button>
              <button
                type="button"
                onClick={resetGuide}
                className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border-[1.5px] border-[#E2E8F0] px-5 text-[13px] font-bold text-ink-600"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {guideState === "added" && (
          <div className="flex justify-center">
            <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#E8F8F0] px-5 text-[13px] font-bold text-success">
              ✓ Added to My Tracker — check your Home tab
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2.5 border-t border-sky-tint bg-white px-4 py-3">
        <div className="flex h-12 flex-1 items-center rounded-full border-[1.5px] border-sky-tint bg-canvas px-5 text-[14px] text-ink-400">
          Message The Guide…
        </div>
        <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-full bg-blue-primary text-[18px] font-bold text-white">
          ↑
        </span>
      </div>
    </div>
  );
}
