"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SafeUser, SupportRequest } from "@/app/lib/types";

// ── member profile + BARC self-check (docs/13 Part A) ──────────────────

/** Own profile details as edited here (strings for controlled inputs). */
type OwnDetails = {
  tagline: string;
  journeySince: string;
  interests: string[];
  recoveryCapitalPublic: boolean;
  showMilestones: boolean;
};

type CheckPoint = { id?: string; takenAt: number; total: number };

/** BARC-10 areas, framed warmly - reflection, never diagnosis. */
const BARC_DOMAINS: { key: string; label: string }[] = [
  { key: "housing", label: "My housing situation" },
  { key: "employment", label: "Work & daily structure" },
  { key: "relationships", label: "My relationships" },
  { key: "hope", label: "Hope for the future" },
  { key: "coping", label: "Coping with hard days" },
  { key: "health", label: "My health" },
  { key: "meaning", label: "Meaning & purpose" },
  { key: "safety", label: "Feeling safe" },
  { key: "support", label: "People I can lean on" },
  { key: "finances", label: "My finances" },
];

function ToggleRow({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-[13px] font-bold text-ink-900">{label}</span>
        <span className="block text-[11px] font-medium text-ink-600">{hint}</span>
      </span>
      <span
        className={
          "relative h-6 w-11 flex-none rounded-full transition-colors " +
          (on ? "bg-blue-primary" : "bg-[#E2E8F0]")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
            (on ? "left-[22px]" : "left-0.5")
          }
        />
      </span>
    </button>
  );
}

/** Editable profile card - optimistic POSTs to /api/profile. */
function MyProfileCard({
  slug,
  details,
  saveDetails,
}: {
  slug?: string;
  details: OwnDetails;
  saveDetails: (patch: Partial<OwnDetails>) => void;
}) {
  const [tagline, setTagline] = useState(details.tagline);
  const [since, setSince] = useState(details.journeySince);
  const [newInterest, setNewInterest] = useState("");

  // re-sync local inputs when the server copy first arrives
  useEffect(() => {
    setTagline(details.tagline);
    setSince(details.journeySince);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.tagline, details.journeySince]);

  const addInterest = () => {
    const tag = newInterest.trim().slice(0, 28);
    if (!tag || details.interests.length >= 8) return;
    if (details.interests.some((i) => i.toLowerCase() === tag.toLowerCase()))
      return setNewInterest("");
    saveDetails({ interests: [...details.interests, tag] });
    setNewInterest("");
  };

  return (
    <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <label className="block">
        <span className="text-[11px] font-bold tracking-[.06em] text-ink-600">
          TAGLINE
        </span>
        <input
          value={tagline}
          maxLength={140}
          onChange={(e) => setTagline(e.target.value)}
          onBlur={() => {
            if (tagline.trim() !== details.tagline) saveDetails({ tagline });
          }}
          placeholder="A few words that carry you…"
          className="mt-1 h-11 w-full rounded-xl border border-sky-tint bg-canvas px-3.5 text-[14px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[11px] font-bold tracking-[.06em] text-ink-600">
          ON THE JOURNEY SINCE
        </span>
        <input
          type="date"
          value={since}
          onChange={(e) => {
            setSince(e.target.value);
            saveDetails({ journeySince: e.target.value });
          }}
          className="mt-1 h-11 w-full rounded-xl border border-sky-tint bg-canvas px-3.5 text-[14px] font-medium text-ink-900 focus:border-blue-primary focus:outline-none"
        />
      </label>

      <div className="mt-4">
        <span className="text-[11px] font-bold tracking-[.06em] text-ink-600">
          INTERESTS
        </span>
        {details.interests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {details.interests.map((tag) => (
              <span
                key={tag}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sky-tint px-3 text-[12px] font-semibold text-blue-primary"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() =>
                    saveDetails({
                      interests: details.interests.filter((i) => i !== tag),
                    })
                  }
                  className="cursor-pointer text-[14px] font-bold leading-none text-blue-primary/70 hover:text-blue-primary"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <input
            value={newInterest}
            maxLength={28}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInterest();
              }
            }}
            placeholder="Add an interest…"
            className="h-11 flex-1 rounded-xl border border-sky-tint bg-canvas px-3.5 text-[13px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={addInterest}
            disabled={!newInterest.trim() || details.interests.length >= 8}
            className="h-11 flex-none cursor-pointer rounded-full bg-blue-primary px-4 text-[13px] font-bold text-white transition-colors hover:bg-blue-hover disabled:cursor-default disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col border-t border-canvas pt-2.5">
        <ToggleRow
          label="Show my recovery rings publicly"
          hint="Three rings grown from your own activity - never a clinical score."
          on={details.recoveryCapitalPublic}
          onToggle={() =>
            saveDetails({ recoveryCapitalPublic: !details.recoveryCapitalPublic })
          }
        />
        <ToggleRow
          label="Show my milestones"
          hint="Level, streak, goals and courses on your public profile."
          on={details.showMilestones}
          onToggle={() => saveDetails({ showMilestones: !details.showMilestones })}
        />
      </div>

      {slug && (
        <Link
          href={`/community/u/${slug}`}
          className="mt-2 inline-flex min-h-[44px] items-center text-[13px] font-bold text-blue-primary"
        >
          View my public profile →
        </Link>
      )}
    </div>
  );
}

/** BARC-10 self-check - 10 quick 0–5 tap scales, warm and private. */
function SelfCheckCard({
  checks,
  submitCheck,
}: {
  checks: CheckPoint[];
  submitCheck: (scores: Record<string, number>) => Promise<CheckPoint | null>;
}) {
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const answered = BARC_DOMAINS.every((d) => scores[d.key] !== undefined);

  const submit = async () => {
    if (!answered || saving) return;
    setSaving(true);
    const prevTotal = checks.length ? checks[checks.length - 1].total : null;
    const check = await submitCheck(scores);
    setSaving(false);
    if (!check) return;
    const word =
      prevTotal === null
        ? "your starting point, noted with kindness."
        : check.total > prevTotal
          ? "trending up. Keep going."
          : check.total === prevTotal
            ? "holding steady. That counts."
            : "thanks for being honest with yourself. Every check-in counts.";
    setResult(`${check.total}/50 - ${word}`);
    setScores({});
    setOpen(false);
  };

  const trend = checks.slice(-6);

  return (
    <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <p className="text-[13px]/[1.6] font-medium text-ink-600">
        10 quick sliders. Just for you - and the staff who support you. Never
        public.
      </p>

      {result && (
        <div className="mt-3 rounded-xl bg-sky-tint px-4 py-3 text-[14px] font-bold text-blue-primary">
          {result}
        </div>
      )}

      {trend.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-bold tracking-[.06em] text-ink-600">
            YOUR TREND
          </div>
          <div className="mt-2 flex items-end gap-3">
            {trend.map((c, i) => (
              <div key={c.id ?? i} className="flex flex-col items-center gap-1">
                <span className="tnum text-[11px] font-bold text-ink-600">
                  {c.total}
                </span>
                <div
                  className="w-7 rounded-t-md bg-blue-primary"
                  style={{ height: 8 + Math.round((c.total / 50) * 34) }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setResult(null);
          }}
          className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white transition-colors hover:bg-blue-hover"
        >
          {trend.length ? "Check in again" : "Start a check-in"}
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {BARC_DOMAINS.map((d) => (
            <div key={d.key}>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-ink-900">
                  {d.label}
                </span>
                <span className="text-[10px] font-semibold text-ink-400">
                  not yet → strong
                </span>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((n) => {
                  const on = scores[d.key] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${d.label}: ${n} of 5`}
                      aria-pressed={on}
                      onClick={() =>
                        setScores((s) => ({ ...s, [d.key]: n }))
                      }
                      className={
                        "tnum h-10 flex-1 cursor-pointer rounded-lg border text-[13px] font-bold transition-colors " +
                        (on
                          ? "border-blue-primary bg-blue-primary text-white"
                          : "border-sky-tint bg-canvas text-ink-600 hover:border-sky-tint-2")
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={!answered || saving}
              className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white transition-colors hover:bg-blue-hover disabled:cursor-default disabled:opacity-40"
            >
              {saving ? "Saving…" : "Done - save my check-in"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] cursor-pointer items-center px-3 text-[13px] font-semibold text-ink-600"
            >
              Not now
            </button>
          </div>
          {!answered && (
            <p className="text-[11px] font-medium text-ink-400">
              Tap a number for each area - there are no wrong answers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const JOURNEY: {
  title: string;
  sub: string;
  state: "done" | "current" | "future";
  lineColor?: string;
}[] = [
  {
    title: "Outreach",
    sub: "Met the Laveen team · Oct 2025",
    state: "done",
    lineColor: "#12B76A",
  },
  {
    title: "Stabilization",
    sub: "Matched with Marcus · Nov 2025",
    state: "done",
    lineColor: "#12B76A",
  },
  {
    title: "In Program",
    sub: "GED + first job · Feb 2026",
    state: "done",
    lineColor: "#2E7CD6",
  },
  {
    title: "Transitional - you are here",
    sub: "Hallway house · $175/week goal",
    state: "current",
    lineColor: "#E2E8F0",
  },
  { title: "Independent", sub: "A place of her own", state: "future" },
];

/** Level ladder: Bronze→Silver at 640 pts, Silver→Gold at 1,000. */
function levelProgress(level: string, points: number) {
  const lv = level.toLowerCase();
  if (lv === "gold")
    return { from: "Gold", to: "Top level - well done", pct: 100 };
  if (lv === "silver")
    return {
      from: "Silver",
      to: "Gold at 1,000",
      pct: Math.min(100, Math.round((points / 1000) * 100)),
    };
  return {
    from: "Bronze",
    to: "Silver at 640",
    pct: Math.min(100, Math.round((points / 640) * 100)),
  };
}

export default function MeTab({
  points,
  lessonDone,
  user = null,
  requests = null,
}: {
  points: number;
  lessonDone: boolean;
  user?: SafeUser | null;
  requests?: SupportRequest[] | null;
}) {
  // Signed in → real profile (MemberApp keeps user.points current after
  // lesson completions); signed out → the styled Danielle demo.
  const displayName = user?.name ?? "Danielle";
  const displayPoints = user ? (user.points ?? 0) : points;
  const level = user ? (user.level ?? "Bronze") : "Silver";
  const progress = levelProgress(level, displayPoints);
  const memberNumber = user ? user.memberNumber : "039521464";
  const initial = displayName.charAt(0).toUpperCase();
  const myRequests = user ? (requests ?? []) : null;

  // ── profile details + BARC trend (signed in only) ────────────────────
  const [details, setDetails] = useState<OwnDetails | null>(null);
  const [checks, setChecks] = useState<CheckPoint[]>([]);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.details) return;
        setDetails({
          tagline: data.details.tagline ?? "",
          journeySince: data.details.journeySince ?? "",
          interests: data.details.interests ?? [],
          recoveryCapitalPublic: !!data.details.recoveryCapitalPublic,
          showMilestones: data.details.showMilestones !== false,
        });
        setChecks(data.checks ?? []);
      } catch {
        // offline - the rest of the tab still works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Optimistic profile-details save - revert on failure. */
  const saveDetails = (patch: Partial<OwnDetails>) => {
    setDetails((prev) => {
      if (!prev) return prev;
      const before = prev;
      const next = { ...prev, ...patch };
      (async () => {
        try {
          const res = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          if (!res.ok) throw new Error(String(res.status));
        } catch {
          setDetails(before);
        }
      })();
      return next;
    });
  };

  const submitCheck = async (
    scores: Record<string, number>
  ): Promise<CheckPoint | null> => {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barc: { scores } }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data?.checks) setChecks(data.checks);
      return data?.check ?? null;
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Navy profile header */}
      <div className="bg-navy-deep px-5 pb-6 pt-3 text-center">
        {!user ? (
          <div className="flex justify-end">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center px-2 text-[13px] font-bold text-[#8FBCF0]"
            >
              Sign in →
            </Link>
          </div>
        ) : (
          <div className="min-h-[16px]" />
        )}
        {user ? (
          <div
            className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-white/25 text-[30px] font-extrabold text-white"
            style={{ background: user.avatarColor }}
          >
            {initial}
          </div>
        ) : (
          <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-white/25 bg-sky-tint text-[30px] font-extrabold text-indigo-brand">
            D
          </div>
        )}
        <div className="mt-3 text-[22px] font-extrabold text-white">
          {displayName}
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-2">
          {memberNumber && (
            <span className="inline-flex h-[26px] items-center rounded-full bg-white/[.12] px-3 text-[11px] font-bold text-[#8FBCF0]">
              Member #{memberNumber}
            </span>
          )}
          <span className="tnum inline-flex h-[26px] items-center gap-[5px] rounded-full bg-[rgba(234,179,8,.18)] px-3 text-[11px] font-extrabold text-gold-badge">
            ◆ {level.toUpperCase()} · {displayPoints} pts
          </span>
        </div>
        <div className="mx-auto mt-3.5 max-w-[260px]">
          <div className="flex justify-between text-[10px] font-semibold text-[#8FBCF0]">
            <span>{progress.from}</span>
            <span>{progress.to}</span>
          </div>
          <div className="mt-[5px] h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gold-badge"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="hairline" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {user && (
          <>
            {/* My story */}
            <div className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
              MY STORY
            </div>
            <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              {user.story ? (
                <p className="text-[14px]/[1.6] font-medium text-ink-900">
                  {user.story}
                </p>
              ) : (
                <p className="text-[14px]/[1.6] font-medium text-ink-600">
                  Your story matters. Add it from your giving page settings so
                  supporters can hear it in your own words.
                </p>
              )}
            </div>

            {/* My profile - public-profile details, consent toggles */}
            {details && (
              <>
                <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
                  MY PROFILE
                </div>
                <MyProfileCard
                  slug={user.slug}
                  details={details}
                  saveDetails={saveDetails}
                />
              </>
            )}

            {/* Check in with yourself - BARC-10, private, never diagnostic */}
            <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
              CHECK IN WITH YOURSELF
            </div>
            <SelfCheckCard checks={checks} submitCheck={submitCheck} />

            {/* Support requests */}
            <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
              MY SUPPORT REQUESTS
            </div>
            <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              {myRequests && myRequests.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {myRequests.map((req) => {
                    const funded = req.status === "funded";
                    const pct = Math.min(
                      100,
                      Math.round(
                        (req.raised / Math.max(1, req.weeklyTarget)) * 100,
                      ),
                    );
                    return (
                      <div key={req.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] font-bold text-ink-900">
                            {req.label}
                          </span>
                          {funded ? (
                            <span className="inline-flex h-[22px] items-center rounded-full bg-[#E7F8F0] px-2.5 text-[10px] font-extrabold text-success">
                              ✓ FUNDED
                            </span>
                          ) : (
                            <span className="tnum text-[12px] font-semibold text-ink-600">
                              ${req.raised} of ${req.weeklyTarget}/wk
                            </span>
                          )}
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-tint">
                          <div
                            className={
                              "h-full rounded-full " +
                              (funded ? "bg-success" : "bg-blue-primary")
                            }
                            style={{ width: `${funded ? 100 : pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[14px]/[1.6] font-medium text-ink-600">
                  No support requests yet - your mentor can help you set one up
                  when you're ready.
                </p>
              )}
            </div>

            {/* QR share card */}
            {user.slug && (
              <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
                <div className="flex items-center gap-4">
                  <img
                    src={`/api/qr/${user.slug}`}
                    alt={`QR code for ${displayName}'s giving page`}
                    className="h-[88px] w-[88px] flex-none rounded-xl border border-sky-tint bg-white p-1.5"
                  />
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-ink-900">
                      Your giving page
                    </div>
                    <div className="mt-0.5 text-[12px] text-ink-600">
                      Anyone who scans this can support you directly.
                    </div>
                    <Link
                      href={`/p/${user.slug}`}
                      className="mt-1 inline-flex min-h-[44px] items-center text-[13px] font-bold text-blue-primary"
                    >
                      Share your page → /p/{user.slug}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Badges */}
        <div className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
          MY BADGES
        </div>
        <div className="grid grid-cols-4 gap-3">
          {["First Week", "GED Earned", "30-Day Streak"].map((name) => (
            <div
              key={name}
              className="rounded-2xl border-[1.5px] border-gold-border bg-white px-2 py-3.5 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold-bg text-[16px] font-extrabold text-gold-ink">
                ◆
              </div>
              <div className="mt-2 text-[10px]/[1.3] font-bold text-ink-900">
                {name}
              </div>
            </div>
          ))}
          {/* Course Champ - unlocked by completing the lesson */}
          <div
            className={
              "rounded-2xl border-[1.5px] bg-white px-2 py-3.5 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)] " +
              (lessonDone ? "border-gold-border" : "border-white opacity-45")
            }
          >
            <div
              className={
                "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-extrabold " +
                (lessonDone
                  ? "bg-gold-bg text-gold-ink"
                  : "bg-[#F1F5F9] text-ink-400")
              }
            >
              {lessonDone ? "◆" : "◇"}
            </div>
            <div className="mt-2 text-[10px]/[1.3] font-bold text-ink-900">
              Course Champ
            </div>
          </div>
        </div>

        {/* Journey timeline */}
        <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
          MY JOURNEY
        </div>
        <div className="rounded-2xl bg-white px-6 pb-5 pt-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="flex flex-col">
            {JOURNEY.map((step, i) => {
              const last = i === JOURNEY.length - 1;
              return (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {step.state === "done" && (
                      <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-success text-[11px] font-bold text-white">
                        ✓
                      </span>
                    )}
                    {step.state === "current" && (
                      <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-blue-primary text-[10px] font-bold text-white shadow-[0_0_0_4px_#EAF2FC]">
                        ●
                      </span>
                    )}
                    {step.state === "future" && (
                      <span className="h-[22px] w-[22px] flex-none rounded-full border-2 border-[#E2E8F0]" />
                    )}
                    {!last && (
                      <div
                        className="min-h-[26px] w-0.5 flex-1"
                        style={{ background: step.lineColor }}
                      />
                    )}
                  </div>
                  <div className={last ? "" : "pb-[18px]"}>
                    <div
                      className={
                        "text-[14px] font-bold " +
                        (step.state === "current"
                          ? "text-blue-primary"
                          : step.state === "future"
                            ? "text-ink-400"
                            : "text-ink-900")
                      }
                    >
                      {step.title}
                    </div>
                    <div
                      className={
                        "text-[12px] " +
                        (step.state === "future" ? "text-ink-400" : "text-ink-600")
                      }
                    >
                      {step.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
