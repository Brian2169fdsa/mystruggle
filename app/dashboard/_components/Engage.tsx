"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy, CalendarClock, Users, HeartPulse, Lock } from "lucide-react";
import { CARD, SKELETON } from "./types";

// Engage - challenges + pulse surveys (docs/16 Part E). Anti-toxicity by
// design: challenges are opt-in and show a participation COUNT only (no
// rankings, no leaderboards); pulse answers are anonymous to peers - staff
// see trends, never names.

/** One decorated challenge (GET /api/challenges). */
type Challenge = {
  id: string;
  centerId?: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt: number;
  badge?: string;
  createdBy: string;
  createdAt: number;
  joined: boolean;
  participants: number;
  active: boolean;
};

/** One aggregated survey (GET /api/pulse, staff view). */
type Survey = {
  id: string;
  centerId?: string;
  programId?: string;
  question: string;
  createdBy: string;
  createdAt: number;
  closesAt?: number;
  responses: number;
  avg: number | null;
};

/** datetime-local value → ms epoch, or null if unset/invalid. */
function localToMs(v: string): number | null {
  if (!v) return null;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : null;
}

/** "Jul 6 – Jul 13" challenge window. */
function fmtWindow(startsAt: number, endsAt: number): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return (
    new Date(startsAt).toLocaleDateString("en-US", opts) +
    " – " +
    new Date(endsAt).toLocaleDateString("en-US", opts)
  );
}

/** Warm, non-comparative read on an average - a trend note, not a grade. */
function trendNote(avg: number | null, responses: number): string {
  if (avg === null || responses === 0) return "waiting on first answers";
  if (avg >= 4) return "feeling strong this week";
  if (avg >= 3) return "holding steady";
  return "worth a gentle check-in";
}

const INPUT =
  "w-full rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-3 text-[15px] font-medium text-ink-900 outline-none focus:border-blue-primary";
const LABEL = "text-[12px] font-bold uppercase tracking-[.08em] text-ink-600";
const BTN = (enabled: boolean) =>
  "inline-flex h-12 items-center rounded-full px-7 text-[14px] font-bold text-white " +
  (enabled
    ? "cursor-pointer bg-blue-primary hover:bg-blue-hover"
    : "cursor-not-allowed bg-ink-400");

function Notice({
  tone,
  tag,
  children,
}: {
  tone: "ok" | "warn";
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 " +
        (tone === "ok" ? "bg-[#E8F8F0]" : "bg-amber-bg")
      }
    >
      <span
        className={
          "mt-0.5 flex-none text-[11px] font-extrabold " +
          (tone === "ok" ? "text-success" : "text-amber-ink")
        }
      >
        {tag}
      </span>
      <span className="text-[13px]/[1.6] font-medium text-ink-900">
        {children}
      </span>
    </div>
  );
}

export default function Engage() {
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [surveys, setSurveys] = useState<Survey[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Challenge form.
  const [cTitle, setCTitle] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cStarts, setCStarts] = useState("");
  const [cEnds, setCEnds] = useState("");
  const [cBadge, setCBadge] = useState("");
  const [cSubmitting, setCSubmitting] = useState(false);
  const [cError, setCError] = useState<string | null>(null);
  const [cOk, setCOk] = useState<string | null>(null);

  // Pulse form.
  const [pQuestion, setPQuestion] = useState("");
  const [pCloses, setPCloses] = useState("");
  const [pSubmitting, setPSubmitting] = useState(false);
  const [pError, setPError] = useState<string | null>(null);
  const [pOk, setPOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/challenges"),
        fetch("/api/pulse"),
      ]);
      if (!cRes.ok || !pRes.ok) throw new Error("load");
      const cData = (await cRes.json()) as { challenges?: Challenge[] };
      const pData = (await pRes.json()) as { surveys?: Survey[] };
      setChallenges(cData.challenges ?? []);
      setSurveys(pData.surveys ?? []);
      setError(null);
    } catch {
      setError("Couldn't load engagement data right now.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // ── create challenge ──────────────────────────────────────────────────
  const canCreateChallenge =
    cTitle.trim().length > 0 &&
    cDescription.trim().length > 0 &&
    localToMs(cStarts) !== null &&
    localToMs(cEnds) !== null &&
    !cSubmitting;

  async function createChallenge() {
    const startsAt = localToMs(cStarts);
    const endsAt = localToMs(cEnds);
    if (!cTitle.trim() || !cDescription.trim() || startsAt === null || endsAt === null) {
      setCError("Add a title, a description, and both dates.");
      return;
    }
    if (endsAt <= startsAt) {
      setCError("The end date needs to be after the start date.");
      return;
    }
    setCSubmitting(true);
    setCError(null);
    setCOk(null);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cTitle.trim(),
          description: cDescription.trim(),
          startsAt,
          endsAt,
          ...(cBadge.trim() ? { badge: cBadge.trim() } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        challenge?: Challenge;
        error?: string;
      };
      if (res.status === 400 || res.status === 403) {
        setCError(data.error ?? "Please double-check the challenge details.");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      if (data.challenge) {
        const created = data.challenge;
        setChallenges((cur) => [
          {
            ...created,
            joined: created.joined ?? false,
            participants: created.participants ?? 0,
            active: created.active ?? false,
          },
          ...(cur ?? []),
        ]);
      } else {
        await load();
      }
      setCTitle("");
      setCDescription("");
      setCStarts("");
      setCEnds("");
      setCBadge("");
      setCOk("Challenge is live - members can opt in from their app.");
    } catch {
      setCError("Something went wrong creating this challenge.");
    } finally {
      setCSubmitting(false);
    }
  }

  // ── create pulse survey ───────────────────────────────────────────────
  const canCreateSurvey = pQuestion.trim().length > 0 && !pSubmitting;

  async function createSurvey() {
    if (!pQuestion.trim()) {
      setPError("Write the question you want to ask.");
      return;
    }
    setPSubmitting(true);
    setPError(null);
    setPOk(null);
    const closesAt = localToMs(pCloses);
    try {
      const res = await fetch("/api/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: pQuestion.trim(),
          ...(closesAt !== null ? { closesAt } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        survey?: Survey;
        error?: string;
      };
      if (res.status === 400 || res.status === 403) {
        setPError(data.error ?? "Please double-check the question.");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      if (data.survey) {
        const created = data.survey;
        setSurveys((cur) => [
          { ...created, responses: created.responses ?? 0, avg: created.avg ?? null },
          ...(cur ?? []),
        ]);
      } else {
        await load();
      }
      setPQuestion("");
      setPCloses("");
      setPOk("Pulse survey sent - answers stay anonymous to peers.");
    } catch {
      setPError("Something went wrong creating this survey.");
    } finally {
      setPSubmitting(false);
    }
  }

  const loading = !challenges && !surveys && !error;

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Engage
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-ink-600">
          Challenges and pulse surveys - more ways for your community to show
          up, on their own terms.
        </div>
      </div>

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

      {loading &&
        Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className={SKELETON + " h-[140px]"} />
        ))}

      {/* ── CHALLENGES ─────────────────────────────────────────────────── */}
      <div className="mt-2 flex items-center gap-2.5">
        <Trophy size={18} strokeWidth={2.3} className="text-blue-primary" />
        <span className="text-[17px] font-extrabold text-ink-900">
          Challenges
        </span>
      </div>
      <div className="-mt-3 text-[13px] font-medium text-ink-600">
        Time-boxed and always opt-in. We celebrate everyone who joins in -
        participation counts, and there are no rankings and no leaderboards.
      </div>

      <div className={CARD + " px-[30px] py-6"}>
        <div className="text-[17px] font-extrabold text-ink-900">
          Create challenge
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Title</span>
            <input
              className={INPUT}
              value={cTitle}
              onChange={(e) => setCTitle(e.target.value)}
              placeholder="Gratitude Week: post daily"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Badge emoji (optional)</span>
            <input
              className={INPUT}
              value={cBadge}
              onChange={(e) => setCBadge(e.target.value)}
              placeholder="🌱"
              maxLength={16}
            />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className={LABEL}>Description</span>
          <textarea
            className={INPUT + " min-h-[84px] resize-y"}
            value={cDescription}
            onChange={(e) => setCDescription(e.target.value)}
            placeholder="What it's about, how to take part, and what joining looks like week to week."
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Starts</span>
            <input
              type="datetime-local"
              className={INPUT}
              value={cStarts}
              onChange={(e) => setCStarts(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Ends</span>
            <input
              type="datetime-local"
              className={INPUT}
              value={cEnds}
              onChange={(e) => setCEnds(e.target.value)}
            />
          </label>
        </div>

        {cError && (
          <Notice tone="warn" tag="CHECK">
            {cError}
          </Notice>
        )}
        {cOk && (
          <Notice tone="ok" tag="LIVE">
            {cOk}
          </Notice>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={createChallenge}
            disabled={!canCreateChallenge}
            className={BTN(canCreateChallenge)}
          >
            {cSubmitting ? "Creating…" : "Create challenge"}
          </button>
        </div>
      </div>

      {challenges && challenges.length === 0 && (
        <div
          className={
            CARD +
            " px-[30px] py-12 text-center text-[13px] font-semibold text-ink-400"
          }
        >
          No challenges yet - start the first one above.
        </div>
      )}

      {(challenges ?? []).map((ch) => (
        <div key={ch.id} className={CARD + " px-[30px] py-5"}>
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sky-tint text-[20px]">
              {ch.badge ? (
                <span aria-hidden>{ch.badge}</span>
              ) : (
                <Trophy
                  size={20}
                  strokeWidth={2.3}
                  className="text-blue-primary"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[16px] font-bold text-ink-900">
                  {ch.title}
                </span>
                {ch.active ? (
                  <span className="inline-flex h-[22px] items-center rounded-full bg-[#E8F8F0] px-2.5 text-[11px] font-bold text-success">
                    Active now
                  </span>
                ) : (
                  <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[11px] font-bold text-ink-600">
                    {Date.now() < ch.startsAt ? "Starts soon" : "Wrapped"}
                  </span>
                )}
              </div>

              {ch.description && (
                <div className="mt-1.5 text-[14px]/[1.6] font-medium text-ink-600">
                  {ch.description}
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] font-semibold text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock
                    size={15}
                    strokeWidth={2.3}
                    className="text-blue-primary"
                  />
                  {fmtWindow(ch.startsAt, ch.endsAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users
                    size={15}
                    strokeWidth={2.3}
                    className="text-blue-primary"
                  />
                  opt-in · everyone who joins is celebrated
                </span>
              </div>
            </div>

            <div className="flex-none self-center text-right">
              <div className="tnum text-[22px] font-extrabold text-blue-primary">
                {ch.participants}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[.06em] text-ink-600">
                joined in
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ── PULSE SURVEYS ──────────────────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-2.5">
        <HeartPulse size={18} strokeWidth={2.3} className="text-blue-primary" />
        <span className="text-[17px] font-extrabold text-ink-900">
          Pulse surveys
        </span>
      </div>
      <div className="-mt-3 flex items-center gap-1.5 text-[13px] font-medium text-ink-600">
        <Lock size={13} strokeWidth={2.5} className="flex-none text-navy-deep" />
        Answers are anonymous to peers - you see trends, not names.
      </div>

      <div className={CARD + " px-[30px] py-6"}>
        <div className="text-[17px] font-extrabold text-ink-900">
          Ask a pulse question
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Question</span>
            <input
              className={INPUT}
              value={pQuestion}
              onChange={(e) => setPQuestion(e.target.value)}
              maxLength={200}
              placeholder="How supported do you feel this week?"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Closes (optional)</span>
            <input
              type="datetime-local"
              className={INPUT}
              value={pCloses}
              onChange={(e) => setPCloses(e.target.value)}
            />
          </label>
        </div>

        {pError && (
          <Notice tone="warn" tag="CHECK">
            {pError}
          </Notice>
        )}
        {pOk && (
          <Notice tone="ok" tag="SENT">
            {pOk}
          </Notice>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={createSurvey}
            disabled={!canCreateSurvey}
            className={BTN(canCreateSurvey)}
          >
            {pSubmitting ? "Sending…" : "Send pulse"}
          </button>
        </div>
      </div>

      {surveys && surveys.length === 0 && (
        <div
          className={
            CARD +
            " px-[30px] py-12 text-center text-[13px] font-semibold text-ink-400"
          }
        >
          No pulse surveys yet - ask your first question above.
        </div>
      )}

      {(surveys ?? []).map((s) => {
        const closed = s.closesAt != null && s.closesAt <= Date.now();
        const pct = s.avg === null ? 0 : (s.avg / 5) * 100;
        return (
          <div key={s.id} className={CARD + " px-[30px] py-5"}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold text-ink-900">
                {s.question}
              </span>
              {closed && (
                <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[11px] font-bold text-ink-600">
                  Closed
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex min-w-[220px] flex-1 items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-sky-tint">
                  <div
                    className="h-full rounded-full bg-blue-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="tnum text-[14px] font-extrabold text-navy-deep">
                  {s.avg === null ? "–" : s.avg.toFixed(1)}
                  <span className="font-bold text-ink-400"> / 5</span>
                </span>
              </div>
              <span className="text-[13px] font-semibold text-ink-600">
                <span className="tnum font-extrabold text-blue-primary">
                  {s.responses}
                </span>{" "}
                {s.responses === 1 ? "answer" : "answers"} ·{" "}
                {trendNote(s.avg, s.responses)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
