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

const TABS = ["Journey", "Courses", "Mentorship", "Balances", "Consent"] as const;
type Tab = (typeof TABS)[number];

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

export default function ParticipantDetail({
  member,
  goParticipants,
  goGiving,
}: {
  member: AdminMember;
  goParticipants: () => void;
  goGiving: () => void;
}) {
  const [tab, setTab] = useState<Tab>("Journey");
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
          </div>
          <div className="mt-1 text-[13px] font-medium text-ink-600">
            Joined {joined} ·{" "}
            {member.mentorName
              ? `mentor ${member.mentorName}`
              : "no mentor yet"}{" "}
            · {member.points.toLocaleString("en-US")} pts
          </div>
        </div>
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

      {/* MY PLAN (docs/14) - recovery goals, milestones, funding. LIVE. Sits
          right under the journey ribbon, always visible above the tabs. */}
      <MyPlanCard memberId={member.id} />

      {/* RÉSUMÉ + BARC TREND (docs/13/14) - paired. Both are member-private
          surfaces, now LIVE for staff via GET /api/staff/participant, gated on
          an active continuum consent grant to this center. No consent → a
          respectful "not shared" state, never the data. */}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <ResumeCard data={participant} memberName={member.name} />
        <BarcCard data={participant} memberName={member.name} />
      </div>

      {/* Tabs */}
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

      {tab !== "Journey" ? (
        <div className={CARD + " px-[30px] py-[26px]"}>
          <div className="text-[15px] font-bold text-ink-900">{tab}</div>
          <div className="mt-2 text-[13px] text-ink-600">
            {tab} view is a stub in this prototype - the Journey tab shows the
            working record, including balances and consent.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1.4fr_1fr] gap-[18px]">
          {/* Left column - journey timeline (demo) + real support requests */}
          <div className="flex flex-col gap-[18px]">
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

            {/* Support requests - LIVE */}
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
                    reentry fund
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

            {/* Recent sessions - LIVE */}
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
