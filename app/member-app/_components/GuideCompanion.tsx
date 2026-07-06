"use client";

import { useEffect, useRef, useState } from "react";

// The Guide — plan-aware AI companion for the member app. Fetches the member's
// own plan context from /api/guide (goals, program, engagement streak, BARC
// trend, next follow-up) and surfaces it so the Guide visibly "knows them,"
// then lets them chat with the deterministic, context-grounded companion.
// App surface → gold gamification accents are allowed here.

type GoalCard = {
  id: string;
  title: string;
  domain: string;
  why: string | null;
  nextMilestone: string | null;
  milestonesDone: number;
  milestonesTotal: number;
};

type GuideContext = {
  member: { name: string; streak: number };
  program: string | null;
  goals: GoalCard[];
  activity: {
    last7: number;
    last30: number;
    lastActivityAt: number | null;
    streak: number;
  };
  barc: { total: number; takenAt: number; trend: "rising" | "steady" | "dipping" | null } | null;
  upcomingFollowUp: { dueDay: number; status: string } | null;
};

type ChatTurn = { role: "member" | "guide"; text: string; crisis?: boolean };

/** The Guide avatar — script "M" on indigo→blue gradient tile. */
function GuideAvatar() {
  return (
    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[linear-gradient(135deg,#4E5B9B,#2E7CD6)] font-script text-[20px] text-white">
      M
    </div>
  );
}

const STARTER_CHIPS = [
  "How am I doing?",
  "I'm having an urge",
  "Help me with my goal",
  "Tell me about my program",
];

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

export default function GuideCompanion() {
  const [ctx, setCtx] = useState<GuideContext | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "signedout">("loading");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/guide");
        if (!alive) return;
        if (res.status === 401 || res.status === 403) {
          setState("signedout");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && data?.context) {
          setCtx(data.context);
          setState("ready");
        } else {
          setState("signedout");
        }
      } catch {
        if (alive) setState("signedout");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, sending]);

  const send = async (raw: string) => {
    const message = raw.trim();
    if (!message || sending) return;
    setInput("");
    setTurns((t) => [...t, { role: "member", text: message }]);
    setSending(true);
    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.reply) {
        setTurns((t) => [...t, { role: "guide", text: data.reply, crisis: !!data.crisis }]);
      } else {
        setTurns((t) => [
          ...t,
          {
            role: "guide",
            text: "I'm here — try that once more and I'll help.",
          },
        ]);
      }
    } catch {
      setTurns((t) => [
        ...t,
        { role: "guide", text: "I couldn't reach your plan just now. I'm still here — try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const name = ctx ? firstName(ctx.member.name) : "there";
  const primaryGoal = ctx?.goals[0] ?? null;
  const trendCopy =
    ctx?.barc?.trend === "rising"
      ? "trending up"
      : ctx?.barc?.trend === "dipping"
        ? "a little below last time"
        : ctx?.barc?.trend === "steady"
          ? "holding steady"
          : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable body */}
      <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        {/* Section label */}
        <div className="flex items-center gap-2.5">
          <div className="h-px flex-1 bg-[#E2E8F0]" />
          <span className="text-[11px] font-bold tracking-[.12em] text-indigo-brand">
            THE GUIDE
          </span>
          <div className="h-px flex-1 bg-[#E2E8F0]" />
        </div>

        {/* ── Plan-aware context card — the Guide "knows you" ── */}
        {state === "ready" && ctx && (
          <div className="rounded-2xl border-[1.5px] border-[#F0E6C8] bg-[linear-gradient(180deg,#FFFDF6,#FFFFFF)] p-4 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <div className="flex items-center gap-2.5">
              <GuideAvatar />
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold text-ink-900">
                  I&apos;m keeping up with your journey, {name}
                </div>
                <div className="text-[12px] font-medium text-ink-600">
                  {ctx.program ? `Active in your ${ctx.program}` : "Here for your next step"}
                </div>
              </div>
            </div>

            {/* Stat chips — gold streak accent is app-only gamification */}
            <div className="mt-3.5 flex flex-wrap gap-2">
              {ctx.activity.streak > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBF3D9] px-3 py-1.5 text-[12px] font-bold text-[#8A6D1E]">
                  🔥 {ctx.activity.streak}-day streak
                </span>
              )}
              {ctx.activity.last7 > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-tint px-3 py-1.5 text-[12px] font-bold text-blue-primary">
                  {ctx.activity.last7} step{ctx.activity.last7 === 1 ? "" : "s"} this week
                </span>
              )}
              {ctx.barc && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8F0] px-3 py-1.5 text-[12px] font-bold text-success">
                  Self-check {ctx.barc.total}/50{trendCopy ? ` · ${trendCopy}` : ""}
                </span>
              )}
            </div>

            {/* Goals the Guide is tracking */}
            {ctx.goals.length > 0 && (
              <div className="mt-3.5 flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-400">
                  Working toward
                </div>
                {ctx.goals.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-xl bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(11,37,69,.05)]"
                  >
                    <div className="text-[13px] font-bold text-ink-900">{g.title}</div>
                    {g.nextMilestone ? (
                      <div className="mt-0.5 text-[12px] font-medium text-ink-600">
                        Next: {g.nextMilestone}
                        {g.milestonesTotal > 0 && (
                          <span className="text-ink-400">
                            {" "}
                            · {g.milestonesDone}/{g.milestonesTotal} done
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[12px] font-medium text-success">
                        Every milestone cleared 🎉
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {ctx.upcomingFollowUp && (
              <div className="mt-3 text-[12px] font-medium text-ink-600">
                Next check-in: your {ctx.upcomingFollowUp.dueDay}-day follow-up
              </div>
            )}
          </div>
        )}

        {/* Intro bubble */}
        <div className="flex items-start gap-2.5">
          <GuideAvatar />
          <div className="max-w-[290px] rounded-2xl rounded-tl-md bg-white px-[18px] py-3.5 text-[14px]/[1.6] font-medium text-ink-900 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            {state === "ready" ? (
              <>
                Hi {name} — I&apos;m The Guide, and I know where you are on your
                journey{primaryGoal ? ` toward "${primaryGoal.title}"` : ""}. Ask
                me anything, or tap a card below.
              </>
            ) : state === "signedout" ? (
              <>Hi — I&apos;m The Guide. Sign in and I&apos;ll walk your journey with you.</>
            ) : (
              <>Getting your plan together…</>
            )}
          </div>
        </div>

        {/* Conversation */}
        {turns.map((turn, i) =>
          turn.role === "member" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[280px] rounded-2xl rounded-tr-md bg-blue-primary px-[18px] py-3.5 text-[14px]/[1.6] font-medium text-white">
                {turn.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2.5">
              <GuideAvatar />
              <div
                className={`max-w-[290px] whitespace-pre-line rounded-2xl rounded-tl-md px-[18px] py-3.5 text-[14px]/[1.6] font-medium shadow-[0_1px_3px_rgba(11,37,69,.06)] ${
                  turn.crisis
                    ? "border-[1.5px] border-[#F3C7C0] bg-[#FDF2F0] text-ink-900"
                    : "bg-white text-ink-900"
                }`}
              >
                {turn.crisis && (
                  <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[.08em] text-heart-red">
                    You matter — reach out now
                  </div>
                )}
                {turn.text}
              </div>
            </div>
          )
        )}

        {sending && (
          <div className="flex items-start gap-2.5">
            <GuideAvatar />
            <div className="rounded-2xl rounded-tl-md bg-white px-[18px] py-3.5 text-[14px] font-medium text-ink-400 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              …
            </div>
          </div>
        )}

        {/* Starter chips (only before the first exchange) */}
        {state === "ready" && turns.length === 0 && (
          <div className="flex flex-col gap-2 pl-[46px]">
            {STARTER_CHIPS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => send(label)}
                className="inline-flex min-h-[44px] cursor-pointer items-center self-start rounded-full border-[1.5px] border-blue-primary px-[18px] py-2.5 text-left text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {state === "signedout" && (
          <a
            href="/login"
            className="flex min-h-[44px] items-center justify-center rounded-2xl border-[1.5px] border-sky-tint-2 bg-sky-tint px-5 py-3 text-[13px] font-bold text-blue-primary hover:bg-sky-tint-2"
          >
            Sign in to talk with The Guide →
          </a>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2.5 border-t border-sky-tint bg-white px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={state !== "ready" || sending}
          placeholder="Message The Guide…"
          className="h-12 flex-1 rounded-full border-[1.5px] border-sky-tint bg-canvas px-5 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state !== "ready" || sending || !input.trim()}
          className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-full bg-blue-primary text-[18px] font-bold text-white disabled:opacity-40"
          aria-label="Send message to The Guide"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
