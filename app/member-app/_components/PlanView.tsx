"use client";

// My Plan - the member's recovery goals (docs/13 Part C): goal cards with
// milestone checklists, linked QR funding, the 9-domain progress strip, and
// the job-application tracker for employment goals. Opens full-screen inside
// the phone shell (MemberApp planOpen), same pattern as the lesson player.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RECOVERY_DOMAINS,
  type GoalMilestone,
  type JobApplication,
  type JobAppStatus,
  type RecoveryDomain,
  type RecoveryGoal,
  type SafeUser,
} from "@/app/lib/types";

/** Enriched goal shape returned by GET /api/recovery-goals. */
export type PlanGoal = RecoveryGoal & {
  milestones: GoalMilestone[];
  progressPct: number;
  linkedRequest: {
    label: string;
    raised: number;
    weeklyTarget: number;
    status: string;
  } | null;
};

export const DOMAIN_LABELS: Record<RecoveryDomain, string> = {
  housing: "Housing",
  employment: "Work",
  education: "School",
  health: "Health",
  relationships: "Family",
  legal: "Legal",
  financial: "Money",
  transportation: "Transit",
  other: "Other",
};

const JOB_STATUS_STYLE: Record<JobAppStatus, string> = {
  applied: "bg-sky-tint text-blue-primary",
  interview: "bg-[#EDEFF7] text-indigo-brand",
  offer: "bg-[#E7F8F0] text-success",
  closed: "bg-canvas text-ink-400",
};

const NEXT_STATUSES: Record<JobAppStatus, JobAppStatus[]> = {
  applied: ["interview", "closed"],
  interview: ["offer", "closed"],
  offer: ["closed"],
  closed: [],
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DomainChip({ domain }: { domain: RecoveryDomain }) {
  return (
    <span className="inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-extrabold tracking-[.08em] text-blue-primary">
      {DOMAIN_LABELS[domain].toUpperCase()}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sky-tint">
      <div
        className="h-full rounded-full bg-blue-primary"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

/** 9-domain summary strip - a mini ring per recovery-capital domain. */
function DomainStrip({ goals }: { goals: PlanGoal[] }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="text-[12px] font-bold tracking-[.12em] text-indigo-brand">
        RECOVERY DOMAINS
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {RECOVERY_DOMAINS.map((domain) => {
          const inDomain = goals.filter(
            (g) => g.domain === domain && g.status !== "archived"
          );
          const active = inDomain.length > 0;
          const pct = active
            ? Math.round(
                inDomain.reduce((s, g) => s + g.progressPct, 0) /
                  inDomain.length
              )
            : 0;
          return (
            <div
              key={domain}
              className="flex min-w-[52px] flex-none flex-col items-center gap-1"
            >
              <div
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full"
                style={{
                  background: active
                    ? `conic-gradient(#2E7CD6 0 ${pct}%, #EAF2FC ${pct}% 100%)`
                    : "#EAF2FC",
                }}
              >
                <div
                  className={
                    "tnum flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white text-[10px] font-extrabold " +
                    (active ? "text-blue-primary" : "text-ink-400")
                  }
                >
                  {active ? `${pct}%` : "–"}
                </div>
              </div>
              <div
                className={
                  "text-[10px] font-bold " +
                  (active ? "text-ink-900" : "text-ink-400")
                }
              >
                {DOMAIN_LABELS[domain]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlanView({
  close,
  user,
  goals,
  setGoals,
  onPoints,
}: {
  close: () => void;
  user: SafeUser | null;
  goals: PlanGoal[] | null;
  setGoals: (goals: PlanGoal[]) => void;
  /** Bubble a points/level award up so Me + Home stay current. */
  onPoints: (points: number, level: string) => void;
}) {
  const [justAchieved, setJustAchieved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // New-goal form
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<RecoveryDomain | null>(null);
  const [why, setWhy] = useState("");
  const [fundLabel, setFundLabel] = useState("");
  const [fundTarget, setFundTarget] = useState("");
  // Per-goal add-milestone drafts
  const [milestoneDrafts, setMilestoneDrafts] = useState<
    Record<string, string>
  >({});
  // Job applications
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [staleCount, setStaleCount] = useState(0);
  const [appCompany, setAppCompany] = useState("");
  const [appRole, setAppRole] = useState("");
  const [appNext, setAppNext] = useState("");

  const visibleGoals = (goals ?? []).filter((g) => g.status !== "archived");
  const hasJobGoal = visibleGoals.some((g) => g.domain === "employment");

  const loadApps = async () => {
    try {
      const res = await fetch("/api/job-applications");
      if (!res.ok) return;
      const data = await res.json();
      setApps(data.applications ?? []);
      setStaleCount(data.staleCount ?? 0);
    } catch {
      // offline - keep whatever we have
    }
  };

  useEffect(() => {
    if (user) void loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const patchGoal = (goal: PlanGoal) =>
    setGoals((goals ?? []).map((g) => (g.id === goal.id ? goal : g)));

  const toggleMilestone = async (m: GoalMilestone) => {
    try {
      const res = await fetch("/api/recovery-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId: m.id, done: !m.done }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.goal) patchGoal(data.goal);
    } catch {
      // offline - leave as-is
    }
  };

  const addMilestone = async (goalId: string) => {
    const draft = (milestoneDrafts[goalId] ?? "").trim();
    if (!draft) return;
    try {
      const res = await fetch("/api/recovery-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, milestone: { title: draft } }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.goal) patchGoal(data.goal);
      setMilestoneDrafts((d) => ({ ...d, [goalId]: "" }));
    } catch {
      // offline
    }
  };

  const goalAction = async (
    goalId: string,
    action: "achieve" | "pause" | "resume" | "archive"
  ) => {
    try {
      const res = await fetch("/api/recovery-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, action }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (action === "archive") {
        setGoals((goals ?? []).filter((g) => g.id !== goalId));
      } else if (data.goal) {
        patchGoal(data.goal);
      }
      if (action === "achieve" && data.awarded) {
        setJustAchieved(goalId);
        onPoints(data.points, data.level);
      }
    } catch {
      // offline
    }
  };

  const createGoal = async () => {
    if (!title.trim() || !domain || busy) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        domain,
        why: why.trim() || undefined,
      };
      const target = Math.floor(Number(fundTarget));
      if (fundLabel.trim() && target > 0) {
        body.createRequest = { label: fundLabel.trim(), weeklyTarget: target };
      }
      const res = await fetch("/api/recovery-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.goal) setGoals([...(goals ?? []), data.goal]);
        setTitle("");
        setDomain(null);
        setWhy("");
        setFundLabel("");
        setFundTarget("");
        setFormOpen(false);
      }
    } catch {
      // offline
    } finally {
      setBusy(false);
    }
  };

  const addApp = async () => {
    if (!appCompany.trim() || !appRole.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: appCompany.trim(),
          role: appRole.trim(),
          nextActionDate: appNext || undefined,
        }),
      });
      if (res.ok) {
        setAppCompany("");
        setAppRole("");
        setAppNext("");
        await loadApps();
      }
    } catch {
      // offline
    } finally {
      setBusy(false);
    }
  };

  const advanceApp = async (id: string, status: JobAppStatus) => {
    try {
      const res = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await loadApps();
    } catch {
      // offline
    }
  };

  const today = todayIso();

  return (
    <div className="flex flex-1 flex-col pb-20">
      {/* Navy header - same full-screen-in-shell pattern as the lesson player */}
      <div className="flex items-center justify-between bg-navy-deep px-5 py-3.5">
        <button
          type="button"
          onClick={close}
          className="min-h-[44px] min-w-[44px] cursor-pointer text-left text-[20px] font-bold text-white"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-[14px] font-bold text-white">My Plan</div>
          <div className="text-[11px] font-medium text-[#8FBCF0]">
            Goals, milestones &amp; progress
          </div>
        </div>
        <span className="min-w-[44px]" />
      </div>

      {!user ? (
        /* Signed out - warm invitation, no demo data behind it */
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="rounded-2xl bg-white px-6 py-9 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-tint text-[26px]">
              🌱
            </div>
            <div className="mt-4 text-[20px] font-extrabold tracking-[-0.02em] text-ink-900">
              Your plan lives here
            </div>
            <div className="mx-auto mt-2 max-w-[280px] text-[14px]/[1.6] font-medium text-ink-600">
              Set the goals that matter to you - housing, work, family - break
              them into steps, and watch your progress grow. Sign in to start
              your plan.
            </div>
            <Link
              href="/login"
              className="mt-5 inline-flex h-[48px] items-center justify-center rounded-full bg-blue-primary px-8 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.35)] hover:bg-blue-hover"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 p-5">
          {/* 9-domain progress strip */}
          <DomainStrip goals={goals ?? []} />

          {/* Goal cards */}
          {visibleGoals.length === 0 && (
            <div className="rounded-2xl bg-white px-5 py-7 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <div className="text-[15px] font-bold text-ink-900">
                No goals yet
              </div>
              <div className="mt-1 text-[13px] font-medium text-ink-600">
                Start with one thing that matters to you.
              </div>
            </div>
          )}

          {visibleGoals.map((goal) => {
            const doneCount = goal.milestones.filter((m) => m.done).length;
            const req = goal.linkedRequest;
            return (
              <div
                key={goal.id}
                className={
                  "rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)] " +
                  (goal.status === "achieved"
                    ? "border-[1.5px] border-gold-border"
                    : "")
                }
              >
                <div className="flex items-center gap-2">
                  <DomainChip domain={goal.domain} />
                  {goal.status === "achieved" && (
                    <span className="inline-flex h-[22px] items-center rounded-full bg-gold-bg px-2.5 text-[10px] font-extrabold text-gold-ink">
                      ◆ ACHIEVED
                    </span>
                  )}
                  {goal.status === "paused" && (
                    <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[10px] font-extrabold text-ink-400">
                      PAUSED
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[17px] font-extrabold tracking-[-0.01em] text-ink-900">
                  {goal.title}
                </div>
                {goal.why && (
                  <div className="mt-1.5 border-l-[3px] border-sky-tint-2 pl-3 text-[13px]/[1.55] font-medium italic text-ink-600">
                    &ldquo;{goal.why}&rdquo;
                  </div>
                )}

                {/* Progress */}
                <div className="mt-3.5">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-ink-600">
                      {doneCount} of {goal.milestones.length} milestones
                    </span>
                    <span className="tnum text-blue-primary">
                      {goal.progressPct}%
                    </span>
                  </div>
                  <ProgressBar pct={goal.progressPct} />
                </div>

                {/* Milestone checklist - one-tap toggles like the tracker */}
                {goal.milestones.length > 0 && (
                  <div className="mt-2.5 flex flex-col">
                    {goal.milestones.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMilestone(m)}
                        className="flex min-h-[46px] cursor-pointer items-center gap-3 border-b border-canvas text-left"
                      >
                        <span
                          className={
                            "inline-flex h-[24px] w-[24px] flex-none items-center justify-center rounded-lg border-2 text-[13px] font-bold text-white " +
                            (m.done
                              ? "border-success bg-success"
                              : "border-[#C7DBF4] bg-white")
                          }
                        >
                          {m.done ? "✓" : ""}
                        </span>
                        <span
                          className={
                            "text-[14px] font-medium " +
                            (m.done
                              ? "text-ink-400 line-through"
                              : "text-ink-900")
                          }
                        >
                          {m.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Add milestone */}
                {goal.status !== "achieved" && (
                  <div className="mt-2.5 flex gap-2">
                    <input
                      value={milestoneDrafts[goal.id] ?? ""}
                      onChange={(e) =>
                        setMilestoneDrafts((d) => ({
                          ...d,
                          [goal.id]: e.target.value,
                        }))
                      }
                      placeholder="Add a step…"
                      className="h-[40px] min-w-0 flex-1 rounded-full border-[1.5px] border-sky-tint-2 bg-white px-4 text-[13px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
                    />
                    <button
                      type="button"
                      onClick={() => addMilestone(goal.id)}
                      className="inline-flex h-[40px] flex-none cursor-pointer items-center rounded-full bg-sky-tint px-4 text-[13px] font-bold text-blue-primary"
                    >
                      + Add
                    </button>
                  </div>
                )}

                {/* Linked funding */}
                {req && (
                  <div className="mt-3.5 rounded-xl bg-sky-tint px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-[.1em] text-blue-primary">
                        LINKED FUNDING
                      </span>
                      <span
                        className={
                          "text-[11px] font-extrabold " +
                          (req.status === "funded"
                            ? "text-success"
                            : "text-blue-primary")
                        }
                      >
                        {req.status === "funded" ? "✓ FUNDED" : "ACTIVE"}
                      </span>
                    </div>
                    <div className="mt-1 text-[14px] font-bold text-ink-900">
                      {req.label}
                    </div>
                    <div className="tnum mt-0.5 text-[13px] font-semibold text-ink-600">
                      ${req.raised} of ${req.weeklyTarget} this week
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-blue-primary"
                        style={{
                          width: `${Math.min(100, Math.round((req.raised / req.weeklyTarget) * 100))}%`,
                        }}
                      />
                    </div>
                    {user.slug && (
                      <Link
                        href={`/p/${user.slug}`}
                        className="mt-2.5 inline-flex min-h-[32px] items-center text-[13px] font-bold text-blue-primary"
                      >
                        Share my page →
                      </Link>
                    )}
                  </div>
                )}

                {/* Achieve celebration - inline warm card, no overlay needed */}
                {goal.status === "achieved" ? (
                  <div className="mt-3.5 rounded-xl bg-gold-bg px-4 py-3.5 text-center">
                    <div className="text-[15px] font-extrabold text-gold-ink">
                      ◆ Goal achieved!
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold text-ink-600">
                      {justAchieved === goal.id ? (
                        <>
                          <span className="font-extrabold text-blue-primary">
                            +25 points
                          </span>{" "}
                          - this is what showing up looks like.
                        </>
                      ) : (
                        "One more brick in the foundation."
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2.5">
                    {goal.status === "active" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => goalAction(goal.id, "achieve")}
                          className="inline-flex h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full bg-blue-primary text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.35)] hover:bg-blue-hover"
                        >
                          ◆ Mark achieved
                        </button>
                        <button
                          type="button"
                          onClick={() => goalAction(goal.id, "pause")}
                          className="inline-flex h-[44px] cursor-pointer items-center rounded-full border-[1.5px] border-[#E2E8F0] px-4 text-[13px] font-bold text-ink-600"
                        >
                          Pause
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => goalAction(goal.id, "resume")}
                        className="inline-flex h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full bg-sky-tint text-[14px] font-bold text-blue-primary"
                      >
                        Resume this goal
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* New goal */}
          {!formOpen ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex h-[52px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-dashed border-[#C7DBF4] text-[15px] font-bold text-blue-primary"
            >
              + New goal
            </button>
          ) : (
            <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <div className="text-[12px] font-bold tracking-[.12em] text-indigo-brand">
                NEW GOAL
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="I plan to…"
                className="mt-3 h-[46px] w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 text-[15px] font-semibold text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {RECOVERY_DOMAINS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDomain(d)}
                    className={
                      "inline-flex h-[34px] cursor-pointer items-center rounded-full px-3.5 text-[12px] font-bold " +
                      (domain === d
                        ? "bg-blue-primary text-white"
                        : "bg-sky-tint text-blue-primary")
                    }
                  >
                    {DOMAIN_LABELS[d]}
                  </button>
                ))}
              </div>
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Why does this matter to you?"
                rows={3}
                className="mt-3 w-full resize-none rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 py-3 text-[14px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
              />
              <div className="mt-3 rounded-xl bg-canvas px-4 py-3">
                <div className="text-[11px] font-bold tracking-[.1em] text-blue-primary">
                  ASK FOR WEEKLY SUPPORT (OPTIONAL)
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={fundLabel}
                    onChange={(e) => setFundLabel(e.target.value)}
                    placeholder="What for? e.g. First week's rent"
                    className="h-[40px] min-w-0 flex-1 rounded-full border-[1.5px] border-sky-tint-2 bg-white px-4 text-[13px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
                  />
                  <input
                    value={fundTarget}
                    onChange={(e) => setFundTarget(e.target.value)}
                    placeholder="$/wk"
                    inputMode="numeric"
                    className="tnum h-[40px] w-[76px] flex-none rounded-full border-[1.5px] border-sky-tint-2 bg-white px-3 text-[13px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
                  />
                </div>
                <div className="mt-1.5 text-[11px] font-medium text-ink-400">
                  Creates a giving goal on your public page.
                </div>
              </div>
              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={createGoal}
                  disabled={!title.trim() || !domain || busy}
                  className="inline-flex h-[48px] flex-1 cursor-pointer items-center justify-center rounded-full bg-blue-primary text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.35)] hover:bg-blue-hover disabled:cursor-default disabled:opacity-50"
                >
                  Create goal
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="inline-flex h-[48px] cursor-pointer items-center rounded-full border-[1.5px] border-[#E2E8F0] px-5 text-[14px] font-bold text-ink-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Job search - first-class when an employment goal exists */}
          {hasJobGoal && (
            <>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
                  JOB SEARCH
                </span>
                {staleCount > 0 && (
                  <span className="inline-flex h-[24px] items-center rounded-full bg-amber-bg px-3 text-[11px] font-extrabold text-amber-ink">
                    {staleCount} to follow up
                  </span>
                )}
              </div>
              <div className="rounded-2xl bg-white px-5 py-2 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
                {apps.length === 0 && (
                  <div className="py-4 text-center text-[13px] font-medium text-ink-600">
                    No applications yet - log your first one below.
                  </div>
                )}
                {apps.map((a) => {
                  const overdue =
                    a.nextActionDate &&
                    a.nextActionDate < today &&
                    a.status !== "closed" &&
                    a.status !== "offer";
                  return (
                    <div
                      key={a.id}
                      className="border-b border-canvas py-3 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[14px] font-bold text-ink-900">
                            {a.company}
                          </span>
                          <span className="text-[13px] font-medium text-ink-600">
                            {" "}
                            · {a.role}
                          </span>
                        </div>
                        <span
                          className={
                            "inline-flex h-[22px] flex-none items-center rounded-full px-2.5 text-[10px] font-extrabold " +
                            JOB_STATUS_STYLE[a.status]
                          }
                        >
                          {a.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span
                          className={
                            "text-[12px] font-semibold " +
                            (overdue ? "text-amber-ink" : "text-ink-400")
                          }
                        >
                          {a.nextActionDate
                            ? overdue
                              ? `Follow up - was due ${fmtDate(a.nextActionDate)}`
                              : `Next: ${fmtDate(a.nextActionDate)}`
                            : ""}
                        </span>
                        <span className="flex flex-none gap-1.5">
                          {NEXT_STATUSES[a.status].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => advanceApp(a.id, s)}
                              className={
                                "inline-flex h-[28px] cursor-pointer items-center rounded-full px-2.5 text-[11px] font-bold " +
                                (s === "closed"
                                  ? "bg-canvas text-ink-600"
                                  : "bg-sky-tint text-blue-primary")
                              }
                            >
                              {s === "closed" ? "Close" : `→ ${s}`}
                            </button>
                          ))}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {/* Add application */}
                <div className="flex flex-col gap-2 border-t border-canvas py-3">
                  <div className="flex gap-2">
                    <input
                      value={appCompany}
                      onChange={(e) => setAppCompany(e.target.value)}
                      placeholder="Company"
                      className="h-[40px] min-w-0 flex-1 rounded-full border-[1.5px] border-sky-tint-2 bg-white px-4 text-[13px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
                    />
                    <input
                      value={appRole}
                      onChange={(e) => setAppRole(e.target.value)}
                      placeholder="Role"
                      className="h-[40px] min-w-0 flex-1 rounded-full border-[1.5px] border-sky-tint-2 bg-white px-4 text-[13px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={appNext}
                      onChange={(e) => setAppNext(e.target.value)}
                      className="h-[40px] min-w-0 flex-1 rounded-full border-[1.5px] border-sky-tint-2 bg-white px-4 text-[13px] font-medium text-ink-600 outline-none focus:border-blue-primary"
                    />
                    <button
                      type="button"
                      onClick={addApp}
                      disabled={!appCompany.trim() || !appRole.trim() || busy}
                      className="inline-flex h-[40px] flex-none cursor-pointer items-center rounded-full bg-blue-primary px-5 text-[13px] font-bold text-white disabled:cursor-default disabled:opacity-50"
                    >
                      + Log application
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
