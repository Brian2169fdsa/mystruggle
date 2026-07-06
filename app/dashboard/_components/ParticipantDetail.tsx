"use client";

import { useEffect, useState } from "react";
import { CARD, SKELETON, fmtMoney, relTime } from "./types";
import type { AdminMember } from "./types";
import ContinuumRibbon from "./ContinuumRibbon";

/** One row of GET /api/sessions?memberId=… */
type SessionRow = {
  id: string;
  mode: "in-person" | "phone" | "video";
  minutes: number;
  note?: string;
  createdAt: number;
  mentorName: string | null;
};

const SESSION_MODE_LABEL: Record<SessionRow["mode"], string> = {
  "in-person": "In person",
  phone: "Phone",
  video: "Video",
};

// ── CLIENT 360 (docs/16 Part B) - the tab strip. Every existing card kept:
// My Plan + Résumé live under Goals & Reentry; BARC trend, consent, recent
// mentor sessions live under Care & Support; balances + support requests live
// under Giving; the journey timeline lives under Engagement.
const TABS = [
  "Engagement",
  "Learning",
  "Community",
  "Goals & Reentry",
  "Giving",
  "Care & Support",
] as const;
type Tab = (typeof TABS)[number];

// ── GET /api/staff/client360?memberId=… response contract (defensive) ────
// Staff-only whole-person read model. PRIVACY: the payload NEVER contains
// journal entries, chat/DM content, BARC scores, or résumé content - see the
// route's negative guarantees. Community items are feed-visible posts only.
type C360Trend = "rising" | "steady" | "dipping";
type C360TouchKind =
  | "kudos"
  | "nudge"
  | "checkin"
  | "session_note"
  | "call"
  | "hallway";
type Client360 = {
  header: {
    name: string;
    memberNumber: string;
    avatarColor: string;
    phase: string | null;
    loc: string | null;
    continuumScore: number;
    trend: C360Trend;
    risk: "ok" | "watch";
  };
  engagement: {
    bySource: Record<string, number>;
    daily: { day: string; count: number }[];
    streak: number;
  };
  learning: {
    programs: { title: string; status: string; progressPct: number }[];
    attendance: {
      present: number;
      absent: number;
      excused: number;
      remote: number;
    };
    courses: { title: string; pct: number }[];
  };
  community: {
    postCount: number;
    circleCount: number;
    recentPublicPosts: { id: string; excerpt: string; createdAt: number }[];
  };
  goalsReentry: {
    goals: {
      title: string;
      domain: string;
      milestonesDone: number;
      milestonesTotal: number;
    }[];
    jobApps: number;
    resumeExists: boolean;
  };
  giving: {
    cash: number;
    credits: number;
    weeklyProgress: { raised: number; target: number; pct: number };
  };
  care: {
    team: { staffName: string; role: string; isPrimary: boolean }[];
    engagements: {
      kind: C360TouchKind;
      body?: string;
      mood?: number;
      occurredAt: number;
      staffName: string;
    }[];
    sessionsCount: number;
    followUps: { dueDay: number; status: string }[];
  };
};

const C360_PHASE_LABEL: Record<string, string> = {
  pre_care: "Pre-care",
  intake: "Intake",
  in_program: "In-program",
  transition: "Transition",
  continuing: "Continuing",
};

const C360_SOURCE_LABEL: Record<string, string> = {
  community: "Community",
  lms: "Learning",
  goal: "Goals",
  giving: "Giving",
  mentorship: "Mentorship",
  session: "Sessions",
  checkin: "Check-ins",
  phase: "Phase",
};

// Trend arrow next to the continuum score. A dip is amber - concern, never
// red on a person.
const C360_TREND: Record<C360Trend, { arrow: string; cls: string }> = {
  rising: { arrow: "↑", cls: "text-success" },
  steady: { arrow: "→", cls: "text-blue-primary" },
  dipping: { arrow: "↓", cls: "text-[#B54708]" },
};

// Care-touch kind icons - kudos gets the warm heart.
const TOUCH_ICON: Record<C360TouchKind, string> = {
  kudos: "💛",
  nudge: "🔔",
  checkin: "📍",
  session_note: "🗒",
  call: "📞",
  hallway: "👋",
};
const TOUCH_LABEL: Record<C360TouchKind, string> = {
  kudos: "Kudos",
  nudge: "Nudge",
  checkin: "Check-in",
  session_note: "Session note",
  call: "Call",
  hallway: "Hallway hello",
};

const CARE_ROLE_LABEL: Record<string, string> = {
  case_manager: "Case manager",
  counselor: "Counselor",
  peer_support: "Peer support",
  tech: "Tech",
  facilitator: "Facilitator",
};

// ── MY PLAN (docs/14) - GET /api/recovery-goals?memberId=… is staff-readable.
// Code the enriched response shape defensively.
type PlanMilestone = { id: string; title: string; done: boolean };
type PlanLinkedRequest = {
  label: string;
  raised: number;
  weeklyTarget: number;
  status: string;
} | null;
type PlanGoal = {
  id: string;
  title: string;
  domain: string;
  why?: string;
  status: "active" | "achieved" | "paused" | "archived";
  progressPct: number;
  milestones: PlanMilestone[];
  linkedRequest: PlanLinkedRequest;
};

// The nine recovery domains (docs/14). Drives the coverage strip.
const RECOVERY_DOMAINS = [
  "housing",
  "employment",
  "education",
  "health",
  "relationships",
  "legal",
  "financial",
  "transportation",
  "other",
] as const;

function domainLabel(d: string): string {
  return d ? d[0].toUpperCase() + d.slice(1) : d;
}

const GOAL_STATUS_CHIP: Record<PlanGoal["status"], string> = {
  active: "bg-sky-tint text-blue-primary",
  achieved: "bg-[#E8F8F0] text-success",
  paused: "bg-[#FFF7EA] text-[#B54708]", // amber - concern, never red
  archived: "bg-canvas text-ink-400",
};

const GOAL_STATUS_LABEL: Record<PlanGoal["status"], string> = {
  active: "Active",
  achieved: "✓ Achieved",
  paused: "Paused",
  archived: "Archived",
};

// Journey timeline stays the styled demo - journey stages aren't in the
// data model yet.
const TIMELINE = [
  {
    title: "Outreach - met Laveen team",
    date: <>Oct 12, 2025</>,
    done: true,
    lineColor: "#12B76A",
  },
  {
    title: "Stabilization - matched with mentor, IOP intake",
    date: <>Nov 3, 2025</>,
    done: true,
    lineColor: "#12B76A",
  },
  {
    title: "In Program - GED earned, first job at ABC Painting",
    date: (
      <>
        Feb 20, 2026 ·{" "}
        <span className="font-bold text-gold-ink">◆ GED badge</span>
      </>
    ),
    done: true,
    lineColor: "#2E7CD6",
  },
  {
    title: "Transitional - hallway house, weekly goal live",
    date: <>May 4, 2026 · current stage</>,
    done: false,
    lineColor: null,
  },
];

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle?: () => void;
}) {
  return (
    <span
      onClick={onToggle}
      className={
        "relative h-[26px] w-11 rounded-full transition-colors duration-200 " +
        (onToggle ? "cursor-pointer " : "") +
        (on ? "bg-success" : "bg-[#E2E8F0]")
      }
    >
      <span
        className={
          "absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-[left] duration-200 " +
          (on ? "left-5" : "left-0.5")
        }
      />
    </span>
  );
}

/** MY PLAN - the member's recovery goals, milestones, progress + linked
 *  funding. LIVE for staff via GET /api/recovery-goals?memberId=… */
function MyPlanCard({ memberId }: { memberId: string }) {
  const [goals, setGoals] = useState<PlanGoal[] | null>(null);

  useEffect(() => {
    let alive = true;
    setGoals(null);
    fetch(`/api/recovery-goals?memberId=${memberId}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setGoals((d?.goals as PlanGoal[]) ?? []);
      })
      .catch(() => {
        if (alive) setGoals([]);
      });
    return () => {
      alive = false;
    };
  }, [memberId]);

  // Which of the nine domains this member has a goal in - drives the strip.
  const covered = new Set((goals ?? []).map((g) => g.domain));

  return (
    <div className={CARD + " px-[30px] py-[26px]"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[15px] font-bold text-ink-900">My Plan</div>
        {goals && goals.length > 0 && (
          <span className="text-[11px] font-semibold text-ink-400">
            {covered.size} of {RECOVERY_DOMAINS.length} life domains active
          </span>
        )}
      </div>

      {goals === null ? (
        <div className="mt-4 flex flex-col gap-2.5">
          <div className={SKELETON + " h-16"} />
          <div className={SKELETON + " h-16"} />
        </div>
      ) : goals.length === 0 ? (
        <div className="mt-3 text-[13px] text-ink-600">
          No recovery goals yet.
        </div>
      ) : (
        <>
          {/* Nine-domain coverage strip */}
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {RECOVERY_DOMAINS.map((d) => {
              const on = covered.has(d);
              return (
                <span
                  key={d}
                  title={domainLabel(d)}
                  className={
                    "inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold " +
                    (on
                      ? "bg-blue-primary text-white"
                      : "bg-sky-tint text-ink-400")
                  }
                >
                  {domainLabel(d)}
                </span>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-[18px]">
            {goals.map((g) => {
              const done = g.milestones.filter((m) => m.done).length;
              const achieved = g.status === "achieved";
              const req = g.linkedRequest;
              const reqPct = req
                ? Math.min(
                    100,
                    Math.round((req.raised / req.weeklyTarget) * 100)
                  )
                : 0;
              const reqFunded = req?.status === "funded";
              return (
                <div
                  key={g.id}
                  className="rounded-xl border border-canvas px-4 py-3.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-bold uppercase tracking-[0.03em] text-blue-primary">
                      {domainLabel(g.domain)}
                    </span>
                    <span
                      className={
                        "inline-flex h-[22px] items-center rounded-full px-2.5 text-[10px] font-bold " +
                        (GOAL_STATUS_CHIP[g.status] ??
                          "bg-sky-tint text-blue-primary")
                      }
                    >
                      {GOAL_STATUS_LABEL[g.status] ?? g.status}
                    </span>
                  </div>

                  <div className="mt-2 text-[15px] font-bold text-ink-900">
                    {g.title}
                  </div>
                  {g.why && (
                    <div className="mt-0.5 text-[13px] italic text-ink-600">
                      “{g.why}”
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2.5 flex-1 rounded-full bg-sky-tint">
                      <div
                        className={
                          "h-full rounded-full " +
                          (achieved ? "bg-success" : "bg-blue-primary")
                        }
                        style={{
                          width: `${Math.max(0, Math.min(100, g.progressPct))}%`,
                        }}
                      />
                    </div>
                    <span className="tnum flex-none text-[11px] font-bold text-ink-600">
                      {g.progressPct}%
                    </span>
                  </div>

                  {/* Milestone checklist - read-only ticks */}
                  {g.milestones.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {g.milestones.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2.5 text-[13px]"
                        >
                          <span
                            className={
                              "inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[10px] font-bold " +
                              (m.done
                                ? "bg-success text-white"
                                : "border-[1.5px] border-sky-tint-2 text-transparent")
                            }
                          >
                            ✓
                          </span>
                          <span
                            className={
                              m.done
                                ? "text-ink-600 line-through"
                                : "text-ink-900"
                            }
                          >
                            {m.title}
                          </span>
                        </div>
                      ))}
                      <div className="mt-0.5 text-[11px] font-semibold text-ink-400">
                        {done} of {g.milestones.length} milestones
                      </div>
                    </div>
                  )}

                  {/* Linked funding request */}
                  {req && (
                    <div className="mt-3 rounded-lg bg-sky-tint/60 px-3 py-2.5">
                      <div className="flex items-center justify-between text-[12px] font-semibold text-ink-900">
                        <span className="flex items-center gap-2">
                          <span className="text-ink-400">Funding ·</span>{" "}
                          {req.label}
                          {reqFunded && (
                            <span className="inline-flex h-[20px] items-center rounded-full bg-[#E8F8F0] px-2 text-[10px] font-extrabold text-success">
                              ✓ Funded
                            </span>
                          )}
                        </span>
                        <span className="tnum text-ink-600">
                          {fmtMoney(req.raised)} of {fmtMoney(req.weeklyTarget)}
                          /wk
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 rounded-full bg-white">
                        <div
                          className={
                            "h-full rounded-full " +
                            (reqFunded ? "bg-success" : "bg-blue-primary")
                          }
                          style={{ width: `${reqPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── CONSENT-GATED staff read (GET /api/staff/participant?memberId=…) ──────
// A member's BARC-10 trend + résumé are member-private. Staff see them ONLY
// when the member has an active continuum consent grant to this center. The
// route returns { consent:false, … } - never the data - when consent is
// absent. Code the response shape defensively.
type BarcTrendPoint = { takenAt: number; total: number };
type StaffResume = {
  fullName: string;
  headline?: string;
  summary?: string;
  contact?: { phone?: string; city?: string };
  template: string;
  updatedAt: number;
  sections: {
    id: string;
    kind: string;
    content: Record<string, unknown>;
    sort: number;
  }[];
};
type StaffParticipant = {
  consent: boolean;
  barc: { trend: BarcTrendPoint[] } | null;
  resume: StaffResume | null;
};

const RESUME_SECTION_LABEL: Record<string, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  volunteer: "Volunteer",
  references: "References",
  projects: "Projects",
};

/** BARC total is 0–50 (10 domains × 0–5). Read the last two totals as a warm,
 *  never-clinical direction - amber for a dip (concern, never red). */
function barcRead(trend: BarcTrendPoint[]): {
  label: string;
  chip: string; // tailwind classes for the direction chip
  bar: string; // bar fill color class
} {
  if (trend.length < 2)
    return {
      label: "First self-check on record",
      chip: "bg-sky-tint text-blue-primary",
      bar: "bg-blue-primary",
    };
  const delta = trend[trend.length - 1].total - trend[trend.length - 2].total;
  if (delta >= 3)
    return {
      label: "Trending up",
      chip: "bg-[#E8F8F0] text-success",
      bar: "bg-success",
    };
  if (delta <= -3)
    return {
      label: "Could use extra support",
      chip: "bg-[#FFF7EA] text-[#B54708]", // amber - concern, never red
      bar: "bg-[#E9A23B]",
    };
  return {
    label: "Holding steady",
    chip: "bg-sky-tint text-blue-primary",
    bar: "bg-blue-primary",
  };
}

/** The respectful "not shared" state - shown for both cards when the member
 *  hasn't granted this center continuum consent. Never shows data. */
function GatedNote({ what }: { what: string }) {
  return (
    <div className="mt-3.5 flex items-start gap-3 rounded-xl bg-sky-tint px-4 py-3.5">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white text-[15px] font-extrabold text-blue-primary">
        ♡
      </span>
      <div className="text-[13px]/[1.55] text-ink-600">
        This member hasn&apos;t shared their {what} with the center yet - ask
        them in your next session if they&apos;d like to.
      </div>
    </div>
  );
}

/** RÉSUMÉ - LIVE, consent-gated. Shows the member's résumé projection when
 *  they've granted this center continuum consent; a warm gated note otherwise.
 *  Read-only - the dashboard never edits a member's résumé. */
function ResumeCard({
  data,
  memberName,
}: {
  data: StaffParticipant | null;
  memberName: string;
}) {
  const resume = data?.resume ?? null;
  return (
    <div className={CARD + " flex flex-col px-[26px] py-[22px]"}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-ink-900">Résumé</div>
        {data?.consent && resume && (
          <span className="inline-flex h-[22px] items-center rounded-full bg-[#E8F8F0] px-2.5 text-[11px] font-bold text-success">
            Shared with center
          </span>
        )}
      </div>

      {data === null ? (
        <div className="mt-3.5 flex flex-col gap-2.5">
          <div className={SKELETON + " h-9"} />
          <div className={SKELETON + " h-16"} />
        </div>
      ) : !data.consent ? (
        <GatedNote what="résumé" />
      ) : !resume ? (
        <div className="mt-3.5 text-[13px] text-ink-600">
          {memberName} hasn&apos;t built a résumé yet. When they do, it&apos;ll
          appear here.
        </div>
      ) : (
        <>
          <div className="mt-3.5 rounded-xl bg-sky-tint px-4 py-3.5">
            <div className="text-[15px] font-bold text-ink-900">
              {resume.fullName}
            </div>
            {resume.headline && (
              <div className="mt-0.5 text-[13px] font-semibold text-blue-primary">
                {resume.headline}
              </div>
            )}
            {resume.summary && (
              <div className="mt-2 text-[12px]/[1.6] text-ink-600">
                {resume.summary}
              </div>
            )}
          </div>

          {resume.sections.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {resume.sections.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex h-6 items-center rounded-full bg-[#DDEBFB] px-2.5 text-[10px] font-bold text-blue-primary"
                >
                  {RESUME_SECTION_LABEL[s.kind] ?? s.kind}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 text-[11px]/[1.5] text-ink-400">
            Read-only - {memberName}&apos;s résumé, shared with the center.
            Edits happen in their app&apos;s Résumé Builder.
          </div>
        </>
      )}
    </div>
  );
}

/** BARC TREND - LIVE, consent-gated. BARC-10 self-checks are member-private;
 *  staff see totals-over-time ONLY with an active consent grant. Never a
 *  diagnosis; amber for a dip, never red. */
function BarcCard({
  data,
  memberName,
}: {
  data: StaffParticipant | null;
  memberName: string;
}) {
  const trend = data?.barc?.trend ?? [];
  const read = barcRead(trend);
  const latest = trend.length ? trend[trend.length - 1] : null;

  return (
    <div className={CARD + " flex flex-col px-[26px] py-[22px]"}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-ink-900">BARC trend</div>
        {data?.consent && trend.length > 0 && (
          <span
            className={
              "inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-bold " +
              read.chip
            }
          >
            {read.label}
          </span>
        )}
      </div>

      {data === null ? (
        <div className="mt-3.5 flex flex-col gap-2.5">
          <div className={SKELETON + " h-14"} />
          <div className={SKELETON + " h-9"} />
        </div>
      ) : !data.consent ? (
        <GatedNote what="self-checks" />
      ) : trend.length === 0 ? (
        <div className="mt-3.5 text-[13px] text-ink-600">
          {memberName} hasn&apos;t recorded a self-check yet. When they do, the
          trend shows up here.
        </div>
      ) : (
        <>
          {/* Real mini-trend - check-in totals over time (each bar = one
              self-check, 0–50). */}
          <div className="mt-3.5 flex h-16 items-end gap-1.5 rounded-xl bg-sky-tint px-4 py-3">
            {trend.map((p) => (
              <div
                key={p.takenAt}
                title={`${p.total}/50 · ${new Date(
                  p.takenAt
                ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                className={"flex-1 rounded-sm " + read.bar}
                style={{ height: `${Math.max(8, (p.total / 50) * 100)}%` }}
              />
            ))}
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="tnum text-[22px] font-extrabold text-ink-900">
              {latest?.total}
            </span>
            <span className="text-[12px] font-semibold text-ink-400">
              / 50 latest · {trend.length} check-in
              {trend.length === 1 ? "" : "s"} on record
            </span>
          </div>

          <div className="mt-2 text-[11px]/[1.5] text-ink-400">
            Self-reflection, shared by {memberName} - never a diagnosis. Totals
            over time only; the ten domain details stay with the member.
          </div>
        </>
      )}
    </div>
  );
}

/** Shared pending/offline body for Client 360 cards. */
function C360Pending({ state }: { state: null | "offline" }) {
  if (state === "offline") {
    return (
      <div className="mt-3 flex items-center gap-3 text-[13px] text-ink-600">
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-blue-primary/50" />
        Client 360 coming online…
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <div className={SKELETON + " h-9"} />
      <div className={SKELETON + " h-16"} />
    </div>
  );
}

/** ENGAGEMENT - per-source count chips, a 28-day activity bar strip, streak.
 *  Staff-only cohort comparison is a labeled placeholder until mv rollups
 *  land; nothing comparative is ever member-facing (docs/07 anti-toxicity). */
function EngagementCard({ c360 }: { c360: Client360 | null | "offline" }) {
  const data = c360 && c360 !== "offline" ? c360 : null;
  const daily = data?.engagement.daily ?? [];
  const maxDay = daily.reduce((m, d) => Math.max(m, d.count), 0) || 1;
  const sources = Object.entries(data?.engagement.bySource ?? {}).sort(
    (a, b) => b[1] - a[1]
  );
  return (
    <div className={CARD + " px-[30px] py-[26px]"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[15px] font-bold text-ink-900">
          Engagement · last 30 days
        </div>
        {data && (
          <span className="inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[11px] font-bold text-blue-primary">
            {data.engagement.streak} day streak
          </span>
        )}
      </div>

      {!data ? (
        <C360Pending state={c360 === "offline" ? "offline" : null} />
      ) : (
        <>
          {sources.length === 0 ? (
            <div className="mt-3 text-[13px] text-ink-600">
              No engagement signals in the last 30 days.
            </div>
          ) : (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {sources.map(([s, n]) => (
                <span
                  key={s}
                  className="inline-flex h-6 items-center gap-1.5 rounded-full bg-sky-tint px-2.5 text-[11px] font-bold text-blue-primary"
                >
                  {C360_SOURCE_LABEL[s] ?? s}
                  <span className="tnum text-ink-600">{n}</span>
                </span>
              ))}
            </div>
          )}

          {/* 28-day activity strip - one bar per day */}
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">
              Daily activity · last 28 days
            </div>
            <div className="mt-2 flex h-12 items-end gap-[3px] rounded-xl bg-sky-tint/50 px-2.5 py-2">
              {daily.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.count} action${
                    d.count === 1 ? "" : "s"
                  }`}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${Math.max(8, (d.count / maxDay) * 100)}%`,
                    background: d.count > 0 ? "#2E7CD6" : "#DDEBFB",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Cohort comparison - STAFF-ONLY surface. Placeholder until the mv
              rollups land; never shown to members. */}
          <div className="mt-3 text-[11px] italic text-ink-400">
            Cohort compare: staff-only, coming with mv rollups.
          </div>
        </>
      )}
    </div>
  );
}

/** LEARNING - program progress bars, session attendance summary, courses. */
function LearningCard({ c360 }: { c360: Client360 | null | "offline" }) {
  const data = c360 && c360 !== "offline" ? c360 : null;
  const att = data?.learning.attendance;
  const attTotal = att ? att.present + att.absent + att.excused + att.remote : 0;
  return (
    <div className={CARD + " px-[30px] py-[26px]"}>
      <div className="text-[15px] font-bold text-ink-900">Learning</div>
      {!data ? (
        <C360Pending state={c360 === "offline" ? "offline" : null} />
      ) : (
        <>
          {/* Programs */}
          {data.learning.programs.length === 0 ? (
            <div className="mt-3 text-[13px] text-ink-600">
              Not enrolled in a program yet.
            </div>
          ) : (
            <div className="mt-3.5 flex flex-col gap-3">
              {data.learning.programs.map((p, i) => (
                <div key={p.title + i}>
                  <div className="flex items-center justify-between text-[13px] font-semibold text-ink-900">
                    <span className="flex items-center gap-2">
                      {p.title}
                      <span
                        className={
                          "inline-flex h-[20px] items-center rounded-full px-2 text-[10px] font-bold " +
                          (p.status === "completed"
                            ? "bg-[#E8F8F0] text-success"
                            : p.status === "withdrawn"
                            ? "bg-canvas text-ink-400"
                            : "bg-sky-tint text-blue-primary")
                        }
                      >
                        {p.status}
                      </span>
                    </span>
                    <span className="tnum text-[11px] font-bold text-ink-600">
                      {p.progressPct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 rounded-full bg-sky-tint">
                    <div
                      className={
                        "h-full rounded-full " +
                        (p.status === "completed"
                          ? "bg-success"
                          : "bg-blue-primary")
                      }
                      style={{ width: `${p.progressPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Attendance summary */}
          {attTotal > 0 && att && (
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">
                Session attendance
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ["Present", att.present, "text-success"],
                    ["Remote", att.remote, "text-blue-primary"],
                    ["Excused", att.excused, "text-ink-600"],
                    ["Absent", att.absent, "text-[#B54708]"],
                  ] as const
                ).map(([label, n, cls]) => (
                  <div key={label} className="rounded-xl bg-sky-tint/60 py-2">
                    <div className={"tnum text-[18px] font-extrabold " + cls}>
                      {n}
                    </div>
                    <div className="text-[10px] font-semibold text-ink-600">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {data.learning.courses.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-400">
                Courses
              </div>
              <div className="mt-2 flex flex-col gap-2.5">
                {data.learning.courses.map((c, i) => (
                  <div key={c.title + i}>
                    <div className="flex items-center justify-between text-[12px] font-semibold text-ink-900">
                      <span>{c.title}</span>
                      <span className="tnum text-[11px] font-bold text-ink-600">
                        {c.pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-sky-tint">
                      <div
                        className={
                          "h-full rounded-full " +
                          (c.pct >= 100 ? "bg-success" : "bg-indigo-brand")
                        }
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** COMMUNITY - activity counts + the member's FEED-VISIBLE posts only. The
 *  API guarantees: approved AND not hidden - never journals, never chat or
 *  mentor DMs, never crisis-held items. Staff see what peers already see. */
function CommunityCard({ c360 }: { c360: Client360 | null | "offline" }) {
  const data = c360 && c360 !== "offline" ? c360 : null;
  return (
    <div className={CARD + " px-[30px] py-[26px]"}>
      <div className="text-[15px] font-bold text-ink-900">Community</div>
      {!data ? (
        <C360Pending state={c360 === "offline" ? "offline" : null} />
      ) : (
        <>
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-center">
            <div className="rounded-xl bg-sky-tint/60 py-3">
              <div className="tnum text-[22px] font-extrabold text-blue-primary">
                {data.community.postCount}
              </div>
              <div className="text-[11px] font-semibold text-ink-600">
                public posts
              </div>
            </div>
            <div className="rounded-xl bg-sky-tint/60 py-3">
              <div className="tnum text-[22px] font-extrabold text-indigo-brand">
                {data.community.circleCount}
              </div>
              <div className="text-[11px] font-semibold text-ink-600">
                circles joined
              </div>
            </div>
          </div>

          {data.community.recentPublicPosts.length === 0 ? (
            <div className="mt-3 text-[13px] text-ink-600">
              No public posts yet.
            </div>
          ) : (
            <div className="mt-3 flex flex-col">
              {data.community.recentPublicPosts.map((p, i) => (
                <div
                  key={p.id}
                  className={
                    "py-2.5" + (i > 0 ? " border-t border-canvas" : "")
                  }
                >
                  <div className="text-[13px]/[1.55] text-ink-900">
                    {p.excerpt}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-400">
                    {relTime(p.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-[11px]/[1.5] text-ink-400">
            Feed-visible posts only - private journals, chats, and mentor
            messages are never shown here.
          </div>
        </>
      )}
    </div>
  );
}

/** GOALS & REENTRY snapshot - goal progress rows + job applications + résumé
 *  yes/no. résumé CONTENT stays on the consent-gated card below this one. */
function GoalsSnapshotCard({ c360 }: { c360: Client360 | null | "offline" }) {
  const data = c360 && c360 !== "offline" ? c360 : null;
  return (
    <div className={CARD + " px-[30px] py-[26px]"}>
      <div className="text-[15px] font-bold text-ink-900">
        Reentry snapshot
      </div>
      {!data ? (
        <C360Pending state={c360 === "offline" ? "offline" : null} />
      ) : (
        <>
          {data.goalsReentry.goals.length === 0 ? (
            <div className="mt-3 text-[13px] text-ink-600">
              No recovery goals yet.
            </div>
          ) : (
            <div className="mt-3.5 flex flex-col gap-2.5">
              {data.goalsReentry.goals.map((g, i) => {
                const pct = g.milestonesTotal
                  ? Math.round((100 * g.milestonesDone) / g.milestonesTotal)
                  : 0;
                return (
                  <div key={g.title + i}>
                    <div className="flex items-center justify-between text-[13px] font-semibold text-ink-900">
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-[20px] items-center rounded-full bg-sky-tint px-2 text-[10px] font-bold uppercase text-blue-primary">
                          {domainLabel(g.domain)}
                        </span>
                        {g.title}
                      </span>
                      <span className="tnum text-[11px] font-bold text-ink-600">
                        {g.milestonesDone}/{g.milestonesTotal}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-sky-tint">
                      <div
                        className={
                          "h-full rounded-full " +
                          (pct >= 100 ? "bg-success" : "bg-blue-primary")
                        }
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2.5 text-center">
            <div className="rounded-xl bg-sky-tint/60 py-3">
              <div className="tnum text-[22px] font-extrabold text-blue-primary">
                {data.goalsReentry.jobApps}
              </div>
              <div className="text-[11px] font-semibold text-ink-600">
                job applications
              </div>
            </div>
            <div className="rounded-xl bg-sky-tint/60 py-3">
              <div
                className={
                  "text-[22px] font-extrabold " +
                  (data.goalsReentry.resumeExists
                    ? "text-success"
                    : "text-ink-400")
                }
              >
                {data.goalsReentry.resumeExists ? "Yes" : "Not yet"}
              </div>
              <div className="text-[11px] font-semibold text-ink-600">
                résumé on file
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** GIVING - weekly funding progress across active support requests. Balances
 *  render in the existing (kept) Balances card next to this one. */
function WeeklyGivingCard({ c360 }: { c360: Client360 | null | "offline" }) {
  const data = c360 && c360 !== "offline" ? c360 : null;
  const wp = data?.giving.weeklyProgress;
  return (
    <div className={CARD + " px-[26px] py-[22px]"}>
      <div className="text-[15px] font-bold text-ink-900">
        Weekly giving progress
      </div>
      {!data || !wp ? (
        <C360Pending state={c360 === "offline" ? "offline" : null} />
      ) : wp.target === 0 ? (
        <div className="mt-3 text-[13px] text-ink-600">
          No active weekly funding goals.
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between text-[13px] font-semibold text-ink-900">
            <span>
              {fmtMoney(wp.raised)}{" "}
              <span className="font-medium text-ink-600">
                of {fmtMoney(wp.target)}/wk
              </span>
            </span>
            <span className="tnum text-[11px] font-bold text-ink-600">
              {wp.pct}%
            </span>
          </div>
          <div className="mt-1.5 h-3 rounded-full bg-sky-tint">
            <div
              className={
                "h-full rounded-full " +
                (wp.pct >= 100 ? "bg-success" : "bg-blue-primary")
              }
              style={{ width: `${wp.pct}%` }}
            />
          </div>
          <div className="mt-3 text-[11px] text-ink-400">
            Cash {fmtMoney(data.giving.cash)} · Reentry Fund{" "}
            {fmtMoney(data.giving.credits)}
          </div>
        </>
      )}
    </div>
  );
}

/** CARE TEAM - who's working with this member (docs/16 Part C). */
function CareTeamCard({ c360 }: { c360: Client360 | null | "offline" }) {
  const data = c360 && c360 !== "offline" ? c360 : null;
  return (
    <div className={CARD + " px-[26px] py-[22px]"}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-ink-900">Care team</div>
        {data && (
          <span className="tnum text-[11px] font-semibold text-ink-400">
            {data.care.sessionsCount} mentor session
            {data.care.sessionsCount === 1 ? "" : "s"} logged
          </span>
        )}
      </div>
      {!data ? (
        <C360Pending state={c360 === "offline" ? "offline" : null} />
      ) : data.care.team.length === 0 ? (
        <div className="mt-3 text-[13px] text-ink-600">
          No care team assigned yet.
        </div>
      ) : (
        <div className="mt-2.5 flex flex-col">
          {data.care.team.map((t, i) => (
            <div
              key={t.staffName + i}
              className={
                "flex items-center justify-between gap-3 py-2.5" +
                (i > 0 ? " border-t border-canvas" : "")
              }
            >
              <div className="text-[13px] font-semibold text-ink-900">
                {t.staffName}
                {t.isPrimary && (
                  <span className="ml-2 inline-flex h-[20px] items-center rounded-full bg-[#DDEBFB] px-2 text-[10px] font-bold text-blue-primary">
                    Primary
                  </span>
                )}
              </div>
              <span className="flex-none text-[11px] font-semibold text-ink-600">
                {CARE_ROLE_LABEL[t.role] ?? t.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** LATEST TOUCHES - the staff-engagement timeline (kudos 💛, nudges, check-ins,
 *  calls, hallway hellos). Engagement comms only - never clinical notes. */
function TouchesCard({ c360 }: { c360: Client360 | null | "offline" }) {
  const data = c360 && c360 !== "offline" ? c360 : null;
  return (
    <div className={CARD + " px-[26px] py-[22px]"}>
      <div className="text-[15px] font-bold text-ink-900">Latest touches</div>
      {!data ? (
        <C360Pending state={c360 === "offline" ? "offline" : null} />
      ) : data.care.engagements.length === 0 ? (
        <div className="mt-3 text-[13px] text-ink-600">
          No staff touches logged yet.
        </div>
      ) : (
        <div className="mt-2.5 flex flex-col">
          {data.care.engagements.map((e, i) => (
            <div
              key={e.occurredAt + e.kind + i}
              className={
                "flex items-start gap-3 py-2.5" +
                (i > 0 ? " border-t border-canvas" : "")
              }
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-sky-tint text-[15px]">
                {TOUCH_ICON[e.kind] ?? "•"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink-900">
                  {TOUCH_LABEL[e.kind] ?? e.kind}
                  <span className="font-medium text-ink-600">
                    {" "}
                    · {e.staffName}
                  </span>
                  {typeof e.mood === "number" && (
                    <span className="ml-2 text-[11px] font-bold text-blue-primary">
                      mood {e.mood}/5
                    </span>
                  )}
                </div>
                {e.body && (
                  <div className="mt-0.5 text-[12px]/[1.5] text-ink-600">
                    {e.body}
                  </div>
                )}
              </div>
              <span className="tnum flex-none text-[11px] text-ink-400">
                {relTime(e.occurredAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** FOLLOW-UP CADENCE - the 30/60/90/180/365d post-discharge touchpoints. A
 *  missed touch is amber - concern, never red. */
function FollowUpsCard({ c360 }: { c360: Client360 | null | "offline" }) {
  const data = c360 && c360 !== "offline" ? c360 : null;
  return (
    <div className={CARD + " px-[26px] py-[22px]"}>
      <div className="text-[15px] font-bold text-ink-900">
        Follow-up cadence
      </div>
      {!data ? (
        <C360Pending state={c360 === "offline" ? "offline" : null} />
      ) : data.care.followUps.length === 0 ? (
        <div className="mt-3 text-[13px] text-ink-600">
          No follow-up cadence scheduled - starts at discharge.
        </div>
      ) : (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {data.care.followUps.map((f) => (
            <span
              key={f.dueDay}
              className={
                "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold " +
                (f.status === "done"
                  ? "bg-[#E8F8F0] text-success"
                  : f.status === "missed"
                  ? "bg-[#FFF7EA] text-[#B54708]"
                  : "bg-sky-tint text-blue-primary")
              }
            >
              {f.status === "done" ? "✓" : f.status === "missed" ? "○" : "◷"}{" "}
              {f.dueDay}d
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParticipantDetail({
  member,
  goParticipants,
  goGiving,
}: {
  member: AdminMember;
  goParticipants: () => void;
  goGiving: () => void;
}) {
  const [tab, setTab] = useState<Tab>("Engagement");
  // "Public giving page" is LIVE - POST /api/admin/consent, optimistic flip
  // with revert on failure. Photo + milestone toggles stay local-only: there
  // is no data model for them yet (they still need the signed consent form).
  const [pagePublic, setPagePublic] = useState(member.consentPublic);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [photoPublic, setPhotoPublic] = useState(false);

  // Re-sync when the detail view is reused for a different member.
  useEffect(() => {
    setPagePublic(member.consentPublic);
    setConsentSaving(false);
    setConsentError(null);
  }, [member.id, member.consentPublic]);

  async function togglePagePublic() {
    if (consentSaving) return;
    const next = !pagePublic;
    setPagePublic(next); // optimistic
    setConsentSaving(true);
    setConsentError(null);
    try {
      const r = await fetch("/api/admin/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, consentPublic: next }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error("save failed");
      setPagePublic(Boolean(d.consentPublic));
    } catch {
      setPagePublic(!next); // revert - the page is unchanged
      setConsentError(
        "We couldn't save that just now, so nothing changed on the public page. Please try again in a moment."
      );
    } finally {
      setConsentSaving(false);
    }
  }

  // Recent mentor sessions - LIVE. null = loading.
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    setSessions(null);
    fetch(`/api/sessions?memberId=${member.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setSessions((d?.sessions as SessionRow[]) ?? []);
      })
      .catch(() => {
        if (alive) setSessions([]);
      });
    return () => {
      alive = false;
    };
  }, [member.id]);

  // CONSENT-GATED BARC trend + résumé - LIVE. null = loading. The route
  // returns { consent:false, barc:null, resume:null } (never the data) unless
  // this member granted the center continuum consent; the cards render a
  // respectful gated state in that case.
  const [participant, setParticipant] = useState<StaffParticipant | null>(null);
  useEffect(() => {
    let alive = true;
    setParticipant(null);
    fetch(`/api/staff/participant?memberId=${member.id}`)
      .then((r) => r.json())
      .then((d: StaffParticipant) => {
        if (alive)
          setParticipant({
            consent: Boolean(d?.consent),
            barc: d?.barc ?? null,
            resume: d?.resume ?? null,
          });
      })
      .catch(() => {
        // On failure, fail CLOSED - treat as not-shared, never guess data.
        if (alive) setParticipant({ consent: false, barc: null, resume: null });
      });
    return () => {
      alive = false;
    };
  }, [member.id]);

  // CLIENT 360 - the whole-person read model, one staff-only fetch
  // (GET /api/staff/client360). null = loading; "offline" = the API isn't
  // reachable yet (concurrent modules still landing) - cards show a quiet
  // coming-online state, never guessed data.
  const [c360, setC360] = useState<Client360 | null | "offline">(null);
  useEffect(() => {
    let alive = true;
    setC360(null);
    fetch(`/api/staff/client360?memberId=${member.id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: Client360) => {
        if (alive) setC360(d);
      })
      .catch(() => {
        if (alive) setC360("offline");
      });
    return () => {
      alive = false;
    };
  }, [member.id]);

  const h360 = c360 && c360 !== "offline" ? c360.header : null;

  const joined = new Date(member.joinedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[13px] font-semibold text-ink-600">
        <button
          type="button"
          onClick={goParticipants}
          className="cursor-pointer text-[13px] font-semibold text-blue-primary"
        >
          Participants
        </button>{" "}
        / <span className="font-bold text-ink-900">{member.name}</span>
      </div>

      {/* Header card */}
      <div className={CARD + " flex flex-wrap items-center gap-[22px] px-[30px] py-[26px]"}>
        <div
          className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full text-[28px] font-extrabold text-white"
          style={{ background: member.avatarColor }}
        >
          {member.name[0]}
        </div>
        <div className="min-w-[260px] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
              {member.name}
            </div>
            <span className="inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
              #{member.memberNumber}
            </span>
            <span className="inline-flex h-[26px] items-center rounded-full bg-[#DDEBFB] px-3 text-[11px] font-bold text-blue-primary">
              {member.level}
            </span>
            {/* CLIENT 360 band - phase + LOC chip and risk flag. The risk
                flag is amber, never red on a person. */}
            {h360?.phase && (
              <span className="inline-flex h-[26px] items-center rounded-full bg-blue-primary px-3 text-[11px] font-bold uppercase tracking-[0.03em] text-white">
                {C360_PHASE_LABEL[h360.phase] ?? h360.phase}
                {h360.loc ? ` · ${h360.loc.toUpperCase()}` : ""}
              </span>
            )}
            {h360 &&
              (h360.risk === "watch" ? (
                <span className="inline-flex h-[26px] items-center rounded-full bg-[#FFF7EA] px-3 text-[11px] font-bold text-[#B54708]">
                  Extra support
                </span>
              ) : (
                <span className="inline-flex h-[26px] items-center rounded-full bg-[#E8F8F0] px-3 text-[11px] font-bold text-success">
                  On track
                </span>
              ))}
          </div>
          <div className="mt-1 text-[13px] font-medium text-ink-600">
            Joined {joined} ·{" "}
            {member.mentorName
              ? `mentor ${member.mentorName}`
              : "no mentor yet"}{" "}
            · {member.points.toLocaleString("en-US")} pts
          </div>
        </div>
        {/* Continuum score + 30-day trend arrow - same normalizer as the
            ribbon, so the two numbers agree. */}
        {h360 && (
          <div className="flex-none text-center">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="tnum text-[34px] font-extrabold leading-none text-blue-primary">
                {h360.continuumScore}
              </span>
              <span
                className={
                  "text-[20px] font-extrabold leading-none " +
                  C360_TREND[h360.trend].cls
                }
                title={`30-day trend: ${h360.trend}`}
              >
                {C360_TREND[h360.trend].arrow}
              </span>
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-400">
              Continuum · {h360.trend}
            </div>
          </div>
        )}
        <button
          type="button"
          className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-[22px] text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
        >
          Print ID card
        </button>
        <button
          type="button"
          onClick={goGiving}
          className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-[22px] text-[13px] font-bold text-white hover:bg-blue-hover"
        >
          Record redemption
        </button>
      </div>

      {/* CONTINUUM - the continuum-of-care ribbon (docs/14). Top of the pane,
          above balances. */}
      <ContinuumRibbon memberId={member.id} />

      {/* Tabs - the Client 360 strip (docs/16 Part B). Every pre-existing
          card is KEPT and re-homed: journey timeline → Engagement; My Plan +
          Résumé → Goals & Reentry; balances + support requests → Giving;
          BARC + consent + recent mentor sessions → Care & Support. */}
      <div className="flex gap-2.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "inline-flex h-[38px] cursor-pointer items-center rounded-full px-[18px] text-[13px] " +
              (tab === t
                ? "bg-blue-primary font-bold text-white"
                : "border-[1.5px] border-sky-tint bg-white font-semibold text-ink-600 hover:bg-sky-tint")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Engagement" && (
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
          {/* Engagement section - source chips + 28-day strip + streak */}
          <EngagementCard c360={c360} />

          {/* Journey timeline - kept (styled demo; journey stages aren't in
              the data model yet). */}
          <div className={CARD + " px-[30px] py-[26px]"}>
              <div className="text-[15px] font-bold text-ink-900">
                Journey timeline
              </div>
              <div className="mt-4 flex flex-col">
                {TIMELINE.map((t) => (
                  <div key={t.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {t.done ? (
                        <span className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success text-[10px] font-bold text-white">
                          ✓
                        </span>
                      ) : (
                        <span className="h-5 w-5 flex-none rounded-full bg-blue-primary shadow-[0_0_0_4px_#EAF2FC]" />
                      )}
                      {t.lineColor && (
                        <div
                          className="w-0.5 flex-1"
                          style={{ minHeight: 22, background: t.lineColor }}
                        />
                      )}
                    </div>
                    <div className={t.done ? "pb-3.5" : ""}>
                      <div
                        className={
                          "text-[13px] font-bold " +
                          (t.done ? "text-ink-900" : "text-blue-primary")
                        }
                      >
                        {t.title}
                      </div>
                      <div className="text-xs text-ink-600">{t.date}</div>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        </div>
      )}

      {tab === "Learning" && <LearningCard c360={c360} />}

      {tab === "Community" && <CommunityCard c360={c360} />}

      {tab === "Goals & Reentry" && (
        <>
          {/* Snapshot - goal rows + job apps + résumé yes/no (Client 360) */}
          <GoalsSnapshotCard c360={c360} />

          {/* MY PLAN (docs/14) - kept, re-homed to this tab. */}
          <MyPlanCard memberId={member.id} />

          {/* RÉSUMÉ (docs/13) - kept; full content stays consent-gated via
              GET /api/staff/participant (the Client 360 payload only carries
              a resumeExists boolean). */}
          <ResumeCard data={participant} memberName={member.name} />
        </>
      )}

      {tab === "Giving" && (
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
          <div className="flex flex-col gap-[18px]">
            {/* Support requests - LIVE (kept) */}
            <div className={CARD + " px-[30px] py-[26px]"}>
              <div className="text-[15px] font-bold text-ink-900">
                Support requests
              </div>
              {member.requests.length === 0 ? (
                <div className="mt-3 text-[13px] text-ink-600">
                  No support requests yet.
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  {member.requests.map((r) => {
                    const funded = r.status === "funded";
                    const pct = Math.min(
                      100,
                      Math.round((r.raised / r.weeklyTarget) * 100)
                    );
                    return (
                      <div key={r.id}>
                        <div className="flex items-center justify-between text-[13px] font-semibold text-ink-900">
                          <span className="flex items-center gap-2.5">
                            {r.label}
                            {funded && (
                              <span className="inline-flex h-[22px] items-center rounded-full bg-[#E8F8F0] px-2.5 text-[11px] font-extrabold text-success">
                                ✓ Funded
                              </span>
                            )}
                          </span>
                          <span className="tnum text-ink-600">
                            {fmtMoney(r.raised)} of {fmtMoney(r.weeklyTarget)}
                            /wk
                          </span>
                        </div>
                        <div className="mt-1.5 h-3 rounded-full bg-sky-tint">
                          <div
                            className={
                              "h-full rounded-full " +
                              (funded ? "bg-success" : "bg-blue-primary")
                            }
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[18px]">
            {/* Balances - LIVE */}
            <div className={CARD + " px-[26px] py-[22px]"}>
              <div className="text-[15px] font-bold text-ink-900">Balances</div>
              <div className="mt-3.5 grid grid-cols-3 gap-2.5 text-center">
                <div>
                  <div className="tnum text-[22px] font-extrabold text-blue-primary">
                    {fmtMoney(member.balances.cash)}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    cash
                  </div>
                </div>
                <div>
                  <div className="tnum text-[22px] font-extrabold text-indigo-brand">
                    {fmtMoney(member.balances.credits)}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    Reentry Fund
                  </div>
                </div>
                <div>
                  <div className="tnum text-[22px] font-extrabold text-success">
                    {fmtMoney(member.balances.savings)}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    savings
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center text-[11px] text-ink-400">
                Daily cash cap $100 · redeem at the giving desk
              </div>
            </div>

            {/* Weekly funding progress - Client 360 giving section */}
            <WeeklyGivingCard c360={c360} />
          </div>
        </div>
      )}

      {tab === "Care & Support" && (
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
          <div className="flex flex-col gap-[18px]">
            {/* Care team + latest touches + follow-up cadence (docs/16 C) */}
            <CareTeamCard c360={c360} />
            <TouchesCard c360={c360} />
            <FollowUpsCard c360={c360} />
          </div>

          <div className="flex flex-col gap-[18px]">
            {/* BARC TREND (docs/14) - kept; consent-gated via
                GET /api/staff/participant, never in the Client 360 payload. */}
            <BarcCard data={participant} memberName={member.name} />

            {/* Recent sessions - LIVE (kept) */}
            <div className={CARD + " px-[26px] py-[22px]"}>
              <div className="text-[15px] font-bold text-ink-900">
                Recent sessions
              </div>
              {sessions === null ? (
                <div className="mt-3.5 flex flex-col gap-2.5">
                  <div className={SKELETON + " h-9"} />
                  <div className={SKELETON + " h-9"} />
                  <div className={SKELETON + " h-9"} />
                </div>
              ) : sessions.length === 0 ? (
                <div className="mt-3 text-[13px] text-ink-600">
                  No sessions logged yet.
                </div>
              ) : (
                <div className="mt-2.5 flex flex-col">
                  {sessions.slice(0, 5).map((s, i) => (
                    <div
                      key={s.id}
                      className={
                        "flex items-center justify-between gap-3 py-2.5" +
                        (i > 0 ? " border-t border-canvas" : "")
                      }
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-ink-900">
                          {SESSION_MODE_LABEL[s.mode]} · {s.minutes} min
                        </div>
                        <div className="text-[11px] text-ink-600">
                          {s.mentorName
                            ? `with ${s.mentorName}`
                            : "mentor unassigned"}
                        </div>
                      </div>
                      <span className="tnum flex-none text-[11px] font-medium text-ink-400">
                        {relTime(s.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consent - public-page toggle is LIVE (POST /api/admin/consent);
                photo + milestone toggles are local-only, no data model yet. */}
            <div className={CARD + " px-[26px] py-[22px]"}>
              <div className="text-[15px] font-bold text-ink-900">Consent</div>
              <div className="mt-3 flex flex-col gap-2.5 text-[13px] font-semibold text-ink-900">
                <div
                  className={
                    "flex items-center justify-between transition-opacity duration-200" +
                    (consentSaving ? " opacity-60" : "")
                  }
                >
                  <span>
                    Public giving page
                    {consentSaving && (
                      <span className="ml-2 text-[11px] font-semibold text-ink-400">
                        Saving…
                      </span>
                    )}
                  </span>
                  <Toggle on={pagePublic} onToggle={togglePagePublic} />
                </div>
                {consentError && (
                  <div className="rounded-xl bg-[#FFF7EA] px-3 py-2 text-[11px]/[1.5] font-semibold text-[#B54708]">
                    {consentError}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  Story approved
                  <span className="text-xs font-bold text-success">
                    ✓ Jun 2, 2026
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  Photo on page
                  <Toggle
                    on={photoPublic}
                    onToggle={() => setPhotoPublic((v) => !v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  Milestone updates to donors
                  <Toggle on />
                </div>
              </div>
              <div className="mt-3 text-[11px]/[1.5] text-ink-400">
                {pagePublic
                  ? `Public page is ON - give.my-struggle.org/p/${member.slug}. Revoking flips it to the generic org-giving state immediately.`
                  : `Public page is OFF - give.my-struggle.org/p/${member.slug} now shows the generic org-giving state.`}
                <br />
                Photo and milestone changes require the member&apos;s signed
                consent form.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
