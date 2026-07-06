import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";
import LeadForm from "./_components/LeadForm";

export const metadata = {
  title: "For Recovery Centers - My Struggle",
  description:
    "Member engagement, mentorship, learning programs, and accountable giving - the platform behind My Struggle's centers, built for yours.",
};

/* ---------------------------------------------------------------- */
/* Pure-CSS UI vignettes for the four pillar cards                   */
/* ---------------------------------------------------------------- */

/** Chat bubble pair - member↔mentor messaging. */
function VignetteChat() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-5">
      <div className="max-w-[78%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[12px]/[1.5] font-medium text-ink-900 shadow-[0_1px_3px_rgba(11,37,69,.08)]">
        Rough morning. Made it to group anyway.
      </div>
      <div className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-blue-primary px-3.5 py-2 text-[12px]/[1.5] font-medium text-white shadow-[0_2px_6px_rgba(46,124,214,.3)]">
        That&apos;s the whole job - showing up. Proud of you.
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 self-start text-[10px] font-bold tracking-[.04em] text-indigo-brand">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
        MOOD CHECK-IN · OK TODAY
      </div>
    </div>
  );
}

/** Course completion ring - programs and lessons. */
function VignetteCourse() {
  return (
    <div className="flex h-full items-center justify-center gap-4 px-5">
      <div
        className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full"
        style={{
          background: "conic-gradient(#2E7CD6 0 65%, #DFEAF9 65% 100%)",
        }}
      >
        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white text-[14px] font-extrabold text-blue-primary">
          65%
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex gap-1.5">
          <span className="inline-flex h-5 items-center rounded-full bg-white px-2 text-[10px] font-extrabold text-blue-primary">
            PON
          </span>
          <span className="inline-flex h-5 items-center rounded-full bg-white px-2 text-[10px] font-extrabold text-indigo-brand">
            ISE
          </span>
        </div>
        <div className="mt-1.5 text-[13px] font-bold text-ink-900">
          Internal Self Evaluation
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-ink-600">
          Lesson 5 of 8 · journal + quiz
        </div>
      </div>
    </div>
  );
}

/** KPI row - dashboard at a glance. */
function VignetteKpis() {
  const kpis = [
    { chip: "PON", n: "128", indigo: false },
    { chip: "VOC", n: "64", indigo: true },
    { chip: "IOP", n: "43", indigo: false },
    { chip: "NAV", n: "87", indigo: true },
  ];
  return (
    <div className="flex h-full items-center px-5">
      <div className="grid w-full grid-cols-4 gap-2">
        {kpis.map((k) => (
          <div
            key={k.chip}
            className="rounded-xl bg-white px-2 py-2.5 text-center shadow-[0_1px_3px_rgba(11,37,69,.08)]"
          >
            <div
              className={
                "text-[9px] font-extrabold tracking-[.06em] " +
                (k.indigo ? "text-indigo-brand" : "text-blue-primary")
              }
            >
              {k.chip}
            </div>
            <div className="tnum mt-1 text-[18px] font-extrabold text-ink-900">
              {k.n}
            </div>
            <div className="mx-auto mt-1.5 h-1 w-7 rounded-full bg-sky-tint-2">
              <div
                className={
                  "h-full rounded-full " +
                  (k.indigo ? "w-2/3 bg-indigo-brand" : "w-4/5 bg-blue-primary")
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Moderation queue card - a held post awaiting staff review. */
function VignetteModeration() {
  return (
    <div className="flex h-full items-center px-5">
      <div className="w-full rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(11,37,69,.08)]">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-sky-tint text-[9px] font-extrabold text-indigo-brand">
            JR
          </span>
          <div className="text-[11px] font-bold text-ink-900">James R.</div>
          <span className="ml-auto inline-flex h-[18px] items-center rounded-full bg-amber-bg px-2 text-[9px] font-extrabold tracking-[.06em] text-amber-ink">
            HELD FOR REVIEW
          </span>
        </div>
        <div className="mt-2 h-2 w-11/12 rounded-full bg-sky-tint" />
        <div className="mt-1.5 h-2 w-3/5 rounded-full bg-sky-tint" />
        <div className="mt-2.5 flex gap-1.5">
          <span className="inline-flex h-6 items-center rounded-full bg-blue-primary px-3 text-[10px] font-bold text-white">
            Approve
          </span>
          <span className="inline-flex h-6 items-center rounded-full border border-sky-tint-2 px-3 text-[10px] font-bold text-ink-600">
            Reach out first
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

const PILLARS = [
  {
    title: "Stay close to every client",
    desc: "Secure member-to-mentor messaging with mood check-ins built into every conversation - and quiet concern escalation straight to your care team when something feels off.",
    href: "/mentor-app",
    vignette: <VignetteChat />,
  },
  {
    title: "Deliver your programming",
    desc: "Courses organized by program (PON · VOC · IOP · NAV), lessons with journals and quizzes, and streaks and milestones that keep people coming back tomorrow.",
    href: "/member-app",
    vignette: <VignetteCourse />,
  },
  {
    title: "Your learning management system",
    desc: "Build curricula, track completion, and award points and levels - every completion updates the member's journey automatically, no spreadsheet in sight.",
    href: "/member-app",
    vignette: <VignetteKpis />,
  },
  {
    title: "Run it all from one dashboard",
    desc: "Live KPIs, participant roster, a giving desk with verified cash redemption, a moderation queue with crisis handling, and retention reports your board will love.",
    href: "/dashboard",
    vignette: <VignetteModeration />,
  },
];

/* ---------------------------------------------------------------- */
/* Continuum of care - phases + blind spots                          */
/* ---------------------------------------------------------------- */

const PHASES = [
  { label: "Pre-care", color: "#DFEAF9" },
  { label: "Intake", color: "#A7C9EF" },
  { label: "In-program", color: "#2E7CD6" },
  { label: "Transition", color: "#3D6DBB" },
  { label: "Continuing", color: "#4E5B9B", live: true },
];

const BLIND_SPOTS = [
  {
    tag: "Before",
    copy: "No one sees the runway into treatment - we measure recovery capital before day one.",
  },
  {
    tag: "After",
    copy: "Outcomes tracking dies at discharge - our community keeps the record alive for years.",
  },
  {
    tag: "Engagement = efficacy",
    copy: "Live engagement signals are the earliest relapse warning that exists.",
  },
];

/** Horizontal before/during/after ribbon - five connected phase segments. */
function ContinuumRibbon() {
  return (
    <div className="w-full">
      <div
        className="flex w-full overflow-hidden rounded-full"
        role="img"
        aria-label="The continuum of care: Pre-care, Intake, In-program, Transition, and Continuing - one connected timeline"
      >
        {PHASES.map((p) => (
          <div
            key={p.label}
            className="relative h-3 flex-1 lg:h-3.5"
            style={{ backgroundColor: p.color }}
          >
            {p.live && (
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute inline-flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-white/70 lg:h-5 lg:w-5" />
                <span className="absolute inline-flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,.9)]" />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex w-full">
        {PHASES.map((p) => (
          <div
            key={p.label}
            className={
              "flex-1 text-center text-[10px] font-bold tracking-[.04em] sm:text-[12px] lg:tracking-[.08em] " +
              (p.live ? "text-white" : "text-white/65")
            }
          >
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}

const ONBOARDING = [
  {
    n: "01",
    title: "Talk to us",
    desc: "A 30-minute call. Tell us about your center, your programs, and the people you serve - we'll show you exactly how the platform fits.",
  },
  {
    n: "02",
    title: "We set up your center",
    desc: "Your programs, your mentors, your branding inside the platform. We load your curricula and train your staff on the dashboard.",
  },
  {
    n: "03",
    title: "Your clients sign up in minutes",
    desc: "QR giving pages, courses, and mentors from day one. No downloads, no IT project - just a link and a welcome.",
  },
];

/* ---------------------------------------------------------------- */
/* Keyframes for the engagement-curve draw + reveal (pure CSS)       */
/* ---------------------------------------------------------------- */

function CentersStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@keyframes ms-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
@keyframes ms-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes ms-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.ms-curve-line { stroke-dasharray: 100; stroke-dashoffset: 100; animation: ms-draw 2.6s ease-out .2s forwards; }
.ms-curve-dot { opacity: 0; animation: ms-rise .5s ease-out forwards; }
.ms-curve-area { opacity: 0; animation: ms-rise 1.4s ease-out 1.2s forwards; }
.ms-bar-fill { transform-origin: left; animation: ms-grow 1.1s ease-out .2s both; }
@media (prefers-reduced-motion: reduce) {
  .ms-curve-line, .ms-curve-dot, .ms-curve-area, .ms-bar-fill {
    animation: none; stroke-dashoffset: 0; opacity: 1; transform: none;
  }
}
`,
      }}
    />
  );
}

/* Reusable section eyebrow. */
function Eyebrow({
  children,
  light = false,
}: {
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <div
      className={
        "text-[12px] font-bold uppercase tracking-[.12em] lg:text-[13px] " +
        (light ? "text-[#8FBCF0]" : "text-blue-primary")
      }
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 1 - The engagement curve (the money section)                      */
/* ---------------------------------------------------------------- */

/** Relapse-risk-over-time descending curve, drawn in pure SVG. */
function EngagementCurve() {
  // year 1..5 → risk %, mapped into the SVG plot area (see below).
  const pts = [
    { x: 70, y: 83, yr: "Yr 1", r: "~50%" },
    { x: 200, y: 135, yr: "Yr 2", r: "38%" },
    { x: 330, y: 187, yr: "Yr 3", r: "26%" },
    { x: 460, y: 222, yr: "Yr 4", r: "18%" },
    { x: 590, y: 248, yr: "Yr 5", r: "<15%" },
  ];
  const line =
    "M70,83 C135,83 135,135 200,135 C265,135 265,187 330,187 " +
    "C395,187 395,222 460,222 C525,222 525,248 590,248";
  const area = line + " L590,300 L70,300 Z";
  const gridY = [40, 105, 170, 235, 300]; // 60% → 0%

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-sky-tint bg-white p-4 shadow-[0_2px_10px_rgba(11,37,69,.08)] lg:p-6">
      <svg
        viewBox="0 0 640 340"
        className="h-auto w-full"
        role="img"
        aria-label="Relapse risk falls from about 50% in year one toward under 15% by year five of continuous engagement."
      >
        <defs>
          <linearGradient id="ms-curve-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E7CD6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2E7CD6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {gridY.map((gy, i) => (
          <g key={gy}>
            <line
              x1="70"
              y1={gy}
              x2="600"
              y2={gy}
              stroke="#EAF2FC"
              strokeWidth="1.5"
            />
            <text
              x="58"
              y={gy + 4}
              textAnchor="end"
              className="fill-ink-400"
              style={{ font: "600 11px var(--font-montserrat)" }}
            >
              {[60, 45, 30, 15, 0][i]}%
            </text>
          </g>
        ))}

        {/* filled area under the curve */}
        <path d={area} fill="url(#ms-curve-fill)" className="ms-curve-area" />

        {/* the drawn line */}
        <path
          d={line}
          fill="none"
          stroke="#2E7CD6"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={100}
          className="ms-curve-line"
        />

        {/* points + year/risk labels */}
        {pts.map((p, i) => (
          <g
            key={p.yr}
            className="ms-curve-dot"
            style={{ animationDelay: `${0.6 + i * 0.35}s` }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r="6"
              fill="#fff"
              stroke="#2E7CD6"
              strokeWidth="3"
            />
            <text
              x={p.x}
              y={p.y - 16}
              textAnchor="middle"
              className="fill-ink-900"
              style={{ font: "800 14px var(--font-montserrat)" }}
            >
              {p.r}
            </text>
            <text
              x={p.x}
              y="326"
              textAnchor="middle"
              className="fill-ink-600"
              style={{ font: "700 12px var(--font-montserrat)" }}
            >
              {p.yr}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 2 - Cited stat spine                                              */
/* ---------------------------------------------------------------- */

const STATS: {
  big: React.ReactNode;
  label: string;
  note: number;
  tip: string;
}[] = [
  {
    big: (
      <>
        40–60% <span className="text-ink-400">→</span>{" "}
        <span className="text-success">&lt;15%</span>
      </>
    ),
    label:
      "First-year relapse runs 40–60%. After five years of continuous recovery, risk drops below 15% - some studies as low as 7%.",
    note: 1,
    tip: "NIDA; Betty Ford Institute Consensus Panel - five-year sustained recovery approaches the general-population baseline.",
  },
  {
    big: <>Years 1–2</>,
    label:
      "Relapse risk is highest in the first one to two years - exactly the window most centers lose visibility after discharge.",
    note: 2,
    tip: "Longitudinal relapse-risk reviews - risk concentrated in years 1–2, declining through years 3–5.",
  },
  {
    big: (
      <>
        12<span className="text-ink-400">+</span> mo
      </>
    ),
    label:
      "Continuing care lasting 12 months or longer, with active efforts to keep people engaged, produces more consistently positive outcomes.",
    note: 3,
    tip: "McKay et al., continuing-care review - longer, actively engaged care outperforms shorter or passive follow-up.",
  },
  {
    big: (
      <>
        &gt;80<span className="text-ink-400">%</span>
      </>
    ),
    label:
      "Over 80% of long-term relapses are preceded by a gradual drop in recovery-activity engagement - an early, measurable warning.",
    note: 4,
    tip: "Kelly et al., 2026 - engagement decline precedes the large majority of long-term relapses.",
  },
  {
    big: <>Recovery capital</>,
    label:
      "Growth in recovery capital - employment, social support, recovery-group involvement - predicts retention and better outcomes.",
    note: 5,
    tip: "REC-CAP / BARC-10 longitudinal studies - the platform is built to grow exactly these.",
  },
  {
    big: <>Goals + milestones</>,
    label:
      "People who set structured goals are meaningfully more likely to maintain sobriety at one year; celebrated milestones lower relapse.",
    note: 6,
    tip: "Multiple studies - structured goal-setting and milestone celebration are associated with better one-year outcomes.",
  },
];

const FOOTNOTES = [
  "NIDA; Betty Ford Institute Consensus Panel - first-year relapse 40–60%; five-year sustained recovery approaches the general-population baseline.",
  "Longitudinal relapse-risk reviews - risk concentrated in years 1–2, declining through years 3–5.",
  "McKay et al., continuing-care review - care lasting ≥12 months with active engagement efforts yields more consistently positive outcomes.",
  "Kelly et al., 2026 - over 80% of long-term relapses are preceded by a gradual decline in recovery-activity engagement.",
  "REC-CAP / BARC-10 longitudinal studies - recovery-capital growth predicts retention and outcomes.",
  "Multiple studies - structured goal-setting and celebrated milestones associated with higher one-year sobriety.",
];

function StatSpine() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {STATS.map((s) => (
          <div
            key={s.note}
            className="flex flex-col rounded-2xl border border-sky-tint bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
          >
            <div className="text-[28px]/[1.1] font-extrabold tracking-[-0.02em] text-blue-primary lg:text-[32px]">
              {s.big}
              <sup
                title={s.tip}
                className="ml-0.5 cursor-help align-super text-[13px] font-bold text-indigo-brand"
              >
                {s.note}
              </sup>
            </div>
            <p className="mt-3 text-[14px]/[1.6] text-ink-600">{s.label}</p>
          </div>
        ))}
      </div>

      <ol className="mt-8 space-y-1.5 border-t border-sky-tint-2 pt-6 text-[12px]/[1.6] text-ink-400">
        {FOOTNOTES.map((f, i) => (
          <li key={i}>
            <span className="font-bold text-ink-600">{i + 1}.</span> {f}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 4 - Deliver your programming: LMS vignettes                       */
/* ---------------------------------------------------------------- */

function ProgrammingVignettes() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Course ring */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-sky-tint bg-white p-6 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div
          className="flex h-[84px] w-[84px] items-center justify-center rounded-full"
          style={{ background: "conic-gradient(#2E7CD6 0 72%, #DFEAF9 72% 100%)" }}
        >
          <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-white text-[16px] font-extrabold text-blue-primary">
            72%
          </div>
        </div>
        <div className="text-[14px] font-bold text-ink-900">
          ISE · Course progress
        </div>
        <div className="text-[12px] font-medium text-ink-600">
          Lesson 6 of 8 · journal + quiz
        </div>
      </div>

      {/* Streak chip */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-sky-tint bg-white p-6 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-sky-tint px-4 text-[16px] font-extrabold text-blue-primary">
          <span className="text-[18px]">🔥</span> 14-day streak
        </span>
        <div className="text-[14px] font-bold text-ink-900">
          Momentum you can see
        </div>
        <div className="text-[12px] font-medium text-ink-600">
          Daily check-ins that keep people coming back tomorrow
        </div>
      </div>

      {/* Badge */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-sky-tint bg-white p-6 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div className="flex h-[70px] w-[70px] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4E5B9B,#2E7CD6)] text-[30px] shadow-[0_6px_16px_rgba(46,124,214,.3)]">
          🏅
        </div>
        <div className="text-[14px] font-bold text-ink-900">
          Milestone unlocked
        </div>
        <div className="text-[12px] font-medium text-ink-600">
          90 days · celebrated in front of the community
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 5 - Follow-up cadence timeline                                    */
/* ---------------------------------------------------------------- */

const CADENCE = ["30", "60", "90", "180", "365"];

/* ---------------------------------------------------------------- */
/* 8 - How it all connects: Danielle's five phases                   */
/* ---------------------------------------------------------------- */

const DANIELLE_PHASES = [
  {
    phase: "Pre-care",
    line: "A mentor meets Danielle before intake and logs her starting recovery capital.",
    systems: ["Community", "Goals"],
  },
  {
    phase: "Intake",
    line: "She's enrolled in the ISE and PON tracks and paired with a peer mentor.",
    systems: ["LMS", "Community"],
  },
  {
    phase: "In-program",
    line: "Daily check-ins, course streaks, and her first QR giving page fund a bus pass.",
    systems: ["LMS", "Giving", "Goals"],
  },
  {
    phase: "Transition",
    line: "GED earned, first job started - milestones celebrated in the community feed.",
    systems: ["Goals", "Community"],
  },
  {
    phase: "Continuing",
    line: "A year past discharge, still engaged - her engagement trend is the center's outcome data.",
    systems: ["Community", "Goals", "LMS"],
  },
];

/* ---------------------------------------------------------------- */
/* 9 - Pricing tiers                                                 */
/* ---------------------------------------------------------------- */

const TIERS = [
  {
    name: "Platform",
    price: "Custom, based on your census",
    tagline: "Deliver your programming and run your center.",
    features: [
      "LMS + level-of-care curricula (ISE/PON, IOP, vocational)",
      "In-facility + remote delivery",
      "Gamified engagement - streaks, badges, goals",
      "Member ↔ mentor messaging with mood check-ins",
      "Center dashboard, roster & moderation",
    ],
    featured: false,
  },
  {
    name: "Platform + Continuum",
    price: "Custom",
    tagline: "Stay connected before, during, and long after care.",
    features: [
      "Everything in Platform",
      "Program group channels + 1:1 client messaging",
      "Follow-up cadence (30 / 60 / 90 / 180 / 365 days)",
      "Relapse early-warning from engagement signals",
      "Continuum score + retention curves",
    ],
    featured: true,
  },
  {
    name: "Enterprise + Outcomes Licensing",
    price: "Let's talk",
    tagline: "Prove what works to funders and partners.",
    features: [
      "Everything in Platform + Continuum",
      "Recovery-capital deltas + grant-ready reports",
      "Multi-site rollups & administration",
      "De-identified outcomes data licensing",
      "Dedicated onboarding & support",
    ],
    featured: false,
  },
];

/* ---------------------------------------------------------------- */
/* Center Operations showcase (docs/16 Part G) - program builder,     */
/* Client 360, care team, client portal, and the ROI calculator.      */
/* ---------------------------------------------------------------- */

/** Starter program templates centers clone + customize (docs/16 Part A). */
const PROGRAM_TEMPLATES = [
  {
    tag: "ISE",
    name: "ISE 12-Step",
    desc: "Internal Self Evaluation - the flagship 12-step track, journals and quizzes included.",
    meta: "12 weeks · residential / IOP",
  },
  {
    tag: "IOP",
    name: "IOP Core",
    desc: "Intensive-outpatient curriculum with a weekly session series and daily check-ins.",
    meta: "8 weeks · in-facility or hybrid",
  },
  {
    tag: "VOC",
    name: "Vocational Readiness",
    desc: "Resume building, interview practice, and the fair-chance job pipeline.",
    meta: "6 weeks · any level of care",
  },
  {
    tag: "NAV",
    name: "Reentry Navigation",
    desc: "ID, documents, housing, benefits - the reentry task packs, pre-built.",
    meta: "10 weeks · transition / continuing",
  },
];

/** The composer story - what building a program actually feels like. */
const COMPOSER_STEPS = [
  "Pick a level of care and delivery - in-facility, remote, or hybrid",
  "Drag in courses from your library, or start from a template above",
  "Add a weekly session series - the schedule generates itself",
  'Attach task packs and milestones ("Week 4: first family session")',
  "Set the program badge and completion certificate, then publish to your cohort",
];

/** Client 360 tab rail - the one-screen promise. */
const C360_TABS = [
  "Engagement",
  "Learning",
  "Community",
  "Goals & Reentry",
  "Giving",
  "Care & Support",
];

/** Care-team roles on every episode (docs/16 Part C). */
const CARE_ROLES = ["Case manager", "Counselor", "Peer support", "Tech"];

/* ---------------------------------------------------------------- */
/* Interactive ROI calculator - server-rendered markup + a small     */
/* vanilla script so the page keeps its metadata export (no "use     */
/* client" needed). Same math shape as the dashboard ROI block:      */
/* your inputs x published case-study deltas, honestly footnoted.    */
/* ---------------------------------------------------------------- */

const ROI_CALC_JS = `
(function () {
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  var ids = ["ms-roi-census", "ms-roi-rate", "ms-roi-rev", "ms-roi-hrs"];
  function calc() {
    var census = +$("ms-roi-census").value;
    var rate = +$("ms-roi-rate").value;
    var rev = +$("ms-roi-rev").value;
    var hrs = +$("ms-roi-hrs").value;
    // Case-study delta: completion 50% -> 65% (+15 pts), capped at 95%.
    var improved = Math.min(rate + 15, 95);
    // Assumes census turns over roughly once per year (footnoted).
    var added = census * (improved - rate) / 100;
    var completionImpact = added * rev;
    // Case-study delta: ~2 hrs saved per 8-hr clinician day = 25% of hours.
    var hoursSaved = hrs * 0.25 * 52;
    var timeImpact = hoursSaved * 85; // clinician time valued at $85/hr
    $("ms-roi-census-v").textContent = census + " clients";
    $("ms-roi-rate-v").textContent = rate + "%";
    $("ms-roi-rev-v").textContent = fmt(rev);
    $("ms-roi-hrs-v").textContent = hrs + " hrs/week";
    $("ms-roi-improved").textContent = rate + "% \\u2192 " + improved + "%";
    $("ms-roi-added").textContent = String(Math.round(added));
    $("ms-roi-completion").textContent = fmt(completionImpact);
    $("ms-roi-hours-saved").textContent =
      Math.round(hoursSaved).toLocaleString("en-US") + " hrs";
    $("ms-roi-time").textContent = fmt(timeImpact);
    $("ms-roi-total").textContent = fmt(completionImpact + timeImpact);
  }
  ids.forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener("input", calc);
  });
  calc();
})();
`;

/** One slider row - label, live value, range input. */
function RoiSlider({
  id,
  label,
  min,
  max,
  step,
  defaultValue,
  defaultLabel,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  defaultLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[13px] font-bold text-ink-900"
        >
          {label}
        </label>
        <span
          id={id + "-v"}
          className="tnum text-[14px] font-extrabold text-blue-primary"
        >
          {defaultLabel}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full cursor-pointer"
        style={{ accentColor: "#2E7CD6" }}
      />
    </div>
  );
}

/** One result line in the calculator's "math shown" panel. */
function RoiLine({
  label,
  id,
  value,
  strong = false,
}: {
  label: string;
  id: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-sky-tint py-2.5 first:border-t-0">
      <span
        className={
          strong
            ? "text-[14px] font-extrabold text-ink-900"
            : "text-[13px] font-medium text-ink-600"
        }
      >
        {label}
      </span>
      <span
        id={id}
        className={
          "tnum flex-none " +
          (strong
            ? "text-[24px] font-extrabold text-blue-primary"
            : "text-[15px] font-extrabold text-ink-900")
        }
      >
        {value}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export default function Centers() {
  return (
    <>
      <CentersStyles />
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="absolute -top-6 right-0 hidden whitespace-nowrap text-[190px]/[1] font-extrabold tracking-[-0.02em] text-white/[.04] lg:block">
          CENTERS
        </div>
        <div className="relative mx-auto w-full max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="flex max-w-[760px] flex-col gap-5 lg:gap-[26px]">
            <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
              FOR RECOVERY CENTERS · SHELTERS · REENTRY PROGRAMS
            </div>
            <h1 className="text-[clamp(38px,4.8vw,62px)]/[1.07] font-extrabold tracking-[-0.02em] text-white">
              Everything your center needs, in one{" "}
              <span className="script text-[1.24em] text-[#A9B4E8]">place</span>.
            </h1>
            <p className="max-w-[580px] text-[16px]/[1.65] font-medium text-white/[.88] lg:text-[19px]">
              Member engagement, mentorship, learning programs, and accountable
              giving - the platform behind My Struggle&apos;s centers, built
              for yours.
            </p>
            <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/dashboard"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
              >
                See the dashboard
              </Link>
              <a
                href="mailto:info@themystruggles.com"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-white/85 bg-[rgba(11,37,69,.35)] px-[34px] text-base font-bold text-white hover:bg-white/[.12] sm:w-auto"
              >
                Talk to us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ENGAGEMENT CURVE - the money section */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Eyebrow>The engagement argument</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              Every month of engagement moves someone down this{" "}
              <span className="script text-[44px] lg:text-[60px]">curve</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[620px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              What research shows: relapse risk is highest right after
              treatment and falls the longer someone stays engaged in recovery.
              The single strongest lever a center has on outcomes is keeping a
              person engaged for the year-plus that changes the odds.
            </p>
          </div>

          <div className="mt-10 lg:mt-[52px]">
            <EngagementCurve />
            <p className="mx-auto mt-6 max-w-[680px] text-center text-[17px]/[1.6] font-semibold text-ink-900 lg:text-[19px]">
              &ldquo;Every month of engagement moves someone down this curve. We
              keep them on it.&rdquo;
            </p>
            <p className="mx-auto mt-3 max-w-[620px] text-center text-[13px]/[1.6] text-ink-400">
              Population-level findings; individual outcomes vary and recovery
              isn&apos;t linear. Sources on the stat cards below.
            </p>
          </div>
        </div>
      </section>

      {/* CITED STAT SPINE */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[680px] text-center">
            <Eyebrow>What the research shows</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              The numbers behind the{" "}
              <span className="script text-[42px] lg:text-[56px]">approach</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[600px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              Every claim is cited and framed honestly - hover a footnote marker
              for the source. These are population-level findings, not
              guarantees.
            </p>
          </div>
          <div className="mt-10 lg:mt-[56px]">
            <StatSpine />
          </div>
        </div>
      </section>

      {/* THREE BLIND SPOTS + continuum ribbon */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Eyebrow light>The three blind spots</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-white lg:text-[44px]/[1.1]">
              Treatment ends. The continuum{" "}
              <span className="script text-[42px] text-[#A9B4E8] lg:text-[56px]">
                doesn&apos;t
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[600px] text-base/[1.7] text-white/75 lg:text-[17px]">
              Centers are blind in three places the outcome data actually lives.
              The platform fills each one.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-[860px] lg:mt-[52px]">
            <ContinuumRibbon />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3 lg:gap-6">
            {BLIND_SPOTS.map((b) => (
              <div
                key={b.tag}
                className="rounded-2xl border border-white/10 bg-white/[.06] p-6"
              >
                <div className="text-[12px] font-extrabold uppercase tracking-[.1em] text-[#8FBCF0]">
                  {b.tag}
                </div>
                <p className="mt-2.5 text-[15px]/[1.65] text-white/85">
                  {b.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUR PILLARS */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[680px] text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              The platform
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              Four tools, one{" "}
              <span className="script text-[44px] lg:text-[60px]">team</span>
            </h2>
            <p className="mt-4 text-base/[1.7] text-ink-600 lg:text-[17px]">
              The same software our own outreach centers run every day -
              messaging, learning, giving, and operations that talk to each
              other.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-[60px] lg:grid-cols-2 lg:gap-7">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="flex flex-col overflow-hidden rounded-2xl border border-sky-tint bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]"
              >
                <div className="h-[168px] flex-none border-b border-sky-tint bg-sky-tint py-4">
                  {p.vignette}
                </div>
                <div className="flex flex-1 flex-col px-6 pb-7 pt-6 lg:px-8">
                  <div className="text-[21px] font-bold text-ink-900 lg:text-[22px]">
                    {p.title}
                  </div>
                  <div className="mt-2.5 text-[15px]/[1.7] text-ink-600">
                    {p.desc}
                  </div>
                  <div className="mt-4 lg:mt-auto lg:pt-4">
                    <Link
                      href={p.href}
                      className="inline-flex min-h-[44px] items-center text-[15px] font-bold text-blue-primary hover:text-blue-hover"
                    >
                      See it live →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DELIVER YOUR PROGRAMMING */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow>Deliver your programming</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Your curriculum, built to keep them coming{" "}
              <span className="script text-[42px] lg:text-[56px]">back</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[620px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              A learning management system organized by level of care. Assign the
              ISE / PON, IOP, and vocational tracks; deliver in-facility and
              remote; and let streaks, badges, and milestones do the work of
              engagement - the mechanic the research says moves outcomes.
            </p>
          </div>
          <div className="mt-10 lg:mt-[52px]">
            <ProgrammingVignettes />
          </div>
        </div>
      </section>

      {/* BUILD YOUR PROGRAMMING, YOUR WAY - program builder showcase */}
      <section id="program-builder" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow>Build your programming, your way</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              From template to enrolled cohort in an{" "}
              <span className="script text-[42px] lg:text-[56px]">
                afternoon
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[620px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              Programs sit above your courses: curriculum, session schedule,
              task packs, milestones, and gamification, packaged for a level of
              care. Start from a template or build your own - then publish and
              enroll your cohort.
            </p>
          </div>

          {/* template gallery */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-[52px] lg:grid-cols-4">
            {PROGRAM_TEMPLATES.map((t) => (
              <div
                key={t.tag}
                className="flex flex-col rounded-2xl border border-sky-tint bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-extrabold text-blue-primary">
                    {t.tag}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-full bg-[#F0EDFB] px-2.5 text-[10px] font-extrabold text-indigo-brand">
                    TEMPLATE
                  </span>
                </div>
                <div className="mt-3 text-[16px] font-bold text-ink-900">
                  {t.name}
                </div>
                <p className="mt-1.5 flex-1 text-[13px]/[1.6] text-ink-600">
                  {t.desc}
                </p>
                <div className="mt-3 text-[11px] font-bold text-ink-400">
                  {t.meta}
                </div>
              </div>
            ))}
          </div>

          {/* composer story */}
          <div className="mx-auto mt-8 max-w-[760px] rounded-2xl border border-sky-tint bg-canvas p-6 lg:p-8">
            <div className="text-[12px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
              The composer
            </div>
            <ol className="mt-4 flex flex-col gap-3">
              {COMPOSER_STEPS.map((s, i) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-blue-primary text-[12px] font-extrabold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-[14px]/[1.6] text-ink-900">
                    {s}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[13px]/[1.6] text-ink-600">
              Every program auto-creates its own group channel and dashboard
              cockpit - and you can preview it exactly as a client will see it
              before you publish.
            </p>
          </div>
        </div>
      </section>

      {/* SEE THE WHOLE PERSON - Client 360 showcase */}
      <section id="client-360" className="scroll-mt-20 bg-canvas">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(320px,480px)] lg:gap-[64px] lg:px-6 lg:py-[110px]">
          <div className="flex flex-col gap-5">
            <Eyebrow>See the whole person</Eyebrow>
            <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              One screen, from first contact to year{" "}
              <span className="script text-[42px] lg:text-[56px]">two</span>
            </h2>
            <p className="text-[17px]/[1.75] text-ink-600">
              Client 360 is a single pane of glass per person: the recovery
              capital they arrived with, everything they do in your building,
              and the years of engagement after they leave - one connected
              timeline, before, during, and after.
            </p>
            <p className="text-[17px]/[1.75] text-ink-600">
              Engagement sparklines, program progress, session attendance,
              goals and reentry tasks, giving, and the care team around them -
              every widget deep-links to its module. Private journals and
              mentor DMs stay private, always.
            </p>
          </div>

          {/* Client 360 mini-mock */}
          <div className="mx-auto w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(11,37,69,.08)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sky-tint text-[13px] font-extrabold text-indigo-brand">
                DM
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-ink-900">
                  Danielle M.
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="inline-flex h-[18px] items-center rounded-full bg-sky-tint px-2 text-[9px] font-extrabold tracking-[.06em] text-blue-primary">
                    IN-PROGRAM · IOP
                  </span>
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="tnum text-[22px] font-extrabold text-blue-primary">
                  78
                </div>
                <div className="text-[9px] font-extrabold tracking-[.06em] text-success">
                  ▲ CONTINUUM SCORE
                </div>
              </div>
            </div>

            {/* before / during / after mini-ribbon */}
            <div className="mt-5">
              <div className="flex w-full overflow-hidden rounded-full">
                <div className="h-2.5 flex-1 bg-[#DFEAF9]" />
                <div className="h-2.5 flex-[1.4] bg-blue-primary" />
                <div className="h-2.5 flex-1 bg-indigo-brand" />
              </div>
              <div className="mt-1.5 flex text-[9px] font-extrabold tracking-[.06em] text-ink-400">
                <span className="flex-1">BEFORE</span>
                <span className="flex-[1.4] text-center text-blue-primary">
                  DURING
                </span>
                <span className="flex-1 text-right">AFTER</span>
              </div>
            </div>

            {/* tab rail */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {C360_TABS.map((t, i) => (
                <span
                  key={t}
                  className={
                    "inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-extrabold " +
                    (i === 0
                      ? "bg-blue-primary text-white"
                      : "bg-sky-tint text-blue-primary")
                  }
                >
                  {t}
                </span>
              ))}
            </div>

            {/* engagement rows */}
            <div className="mt-4 flex flex-col gap-2.5 border-t border-sky-tint pt-4">
              {[
                { l: "IOP Core program", v: "Week 5 of 8 · 72%" },
                { l: "Session attendance", v: "11 of 12 present" },
                { l: "Reentry tasks", v: "4 done · 2 in motion" },
              ].map((r) => (
                <div
                  key={r.l}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-[12px] font-semibold text-ink-600">
                    {r.l}
                  </span>
                  <span className="tnum text-[12px] font-extrabold text-ink-900">
                    {r.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EVERY EMPLOYEE, ENGAGED - care team showcase */}
      <section id="care-team" className="scroll-mt-20 bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-[minmax(320px,460px)_1fr] lg:gap-[64px] lg:px-6 lg:py-[110px]">
          {/* caseload + kudos mock */}
          <div className="order-2 mx-auto w-full max-w-[440px] lg:order-1">
            <div className="rounded-2xl border border-sky-tint bg-canvas p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <div className="text-[11px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
                My caseload
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(11,37,69,.08)]">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sky-tint text-[11px] font-extrabold text-indigo-brand">
                  JR
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-ink-900">
                    James R.
                  </div>
                  <div className="text-[11px] font-medium text-ink-600">
                    IOP Core · Week 3
                  </div>
                </div>
                <span className="ml-auto inline-flex h-[20px] flex-none items-center rounded-full bg-amber-bg px-2 text-[9px] font-extrabold tracking-[.04em] text-amber-ink">
                  NO TOUCH IN 3 DAYS
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-3 rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(11,37,69,.08)]">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sky-tint text-[11px] font-extrabold text-indigo-brand">
                  DM
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-ink-900">
                    Danielle M.
                  </div>
                  <div className="text-[11px] font-medium text-ink-600">
                    IOP Core · Week 5 · 14-day streak
                  </div>
                </div>
                <span className="ml-auto inline-flex h-7 flex-none items-center rounded-full bg-blue-primary px-3 text-[10px] font-bold text-white">
                  Send kudos
                </span>
              </div>
            </div>

            {/* kudos landing as the client sees it */}
            <div className="mt-4 rounded-2xl border-[1.5px] border-blue-primary/40 bg-sky-tint p-4">
              <div className="text-[10px] font-extrabold tracking-[.08em] text-blue-primary">
                KUDOS · HOW IT LANDS
              </div>
              <p className="mt-1.5 text-[13px]/[1.6] font-medium text-ink-900">
                &ldquo;Marcus noticed your streak - 14 days strong. The whole
                team sees you showing up.&rdquo;
              </p>
            </div>
          </div>

          <div className="order-1 flex flex-col gap-5 lg:order-2">
            <Eyebrow>Every employee, engaged</Eyebrow>
            <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Your whole team, part of the{" "}
              <span className="script text-[42px] lg:text-[56px]">outcome</span>
            </h2>
            <p className="text-[17px]/[1.75] text-ink-600">
              Every episode gets a care team - and every member of it works
              from a My Caseload view sorted by risk and last-touch recency, so
              nobody goes unnoticed for three days.
            </p>
            <p className="text-[17px]/[1.75] text-ink-600">
              Kudos, nudges, and check-ins take one tap from anywhere - and
              every touch is logged as an engagement signal. Your techs and
              peer supports become measurable parts of the outcome, not
              invisible ones.
            </p>
            <div className="flex flex-wrap gap-2">
              {CARE_ROLES.map((r) => (
                <span
                  key={r}
                  className="inline-flex h-8 items-center rounded-full bg-sky-tint px-3.5 text-[12px] font-extrabold text-blue-primary"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* A PORTAL YOUR CLIENTS ACTUALLY USE */}
      <section id="client-portal" className="scroll-mt-20 bg-canvas">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow>A portal your clients actually use</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Treatment that feels like{" "}
              <span className="script text-[42px] lg:text-[56px]">
                momentum
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[620px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              Not a second app - the same member app they keep after discharge,
              with a My Program panel while they&apos;re with you. Streaks,
              points, and badges carry straight through, so the habit that
              forms in your building follows them home.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:mt-[52px]">
            {/* Today view */}
            <div className="rounded-2xl border border-sky-tint bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <div className="text-[11px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
                Today
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  { t: "9:00a", l: "Group session · Room B · Marcus" },
                  { t: "1:00p", l: "Lesson 6: Boundaries (journal)" },
                  { t: "Task", l: "Call about the MVD appointment" },
                ].map((r) => (
                  <div
                    key={r.l}
                    className="flex items-start gap-2.5 rounded-xl bg-canvas px-3 py-2.5"
                  >
                    <span className="tnum flex-none pt-px text-[10px] font-extrabold text-blue-primary">
                      {r.t}
                    </span>
                    <span className="text-[12px]/[1.5] font-semibold text-ink-900">
                      {r.l}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px]/[1.5] text-ink-400">
                Sessions, assignments, and tasks - one glance.
              </p>
            </div>

            {/* Reentry plan */}
            <div className="rounded-2xl border border-sky-tint bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <div className="text-[11px] font-extrabold uppercase tracking-[.1em] text-indigo-brand">
                My reentry plan
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  { done: true, l: "Get my ID and Social Security card" },
                  { done: true, l: "Start the GED track" },
                  { done: false, l: "Find housing - 2 applications in" },
                  { done: false, l: "Get my license back" },
                ].map((r) => (
                  <div key={r.l} className="flex items-start gap-2.5">
                    <span
                      className={
                        "mt-px flex h-4.5 w-4.5 flex-none items-center justify-center rounded-full text-[9px] font-extrabold " +
                        (r.done
                          ? "bg-success text-white"
                          : "border-[1.5px] border-sky-tint-2 text-transparent")
                      }
                    >
                      ✓
                    </span>
                    <span
                      className={
                        "text-[12px]/[1.5] font-semibold " +
                        (r.done ? "text-ink-400 line-through" : "text-ink-900")
                      }
                    >
                      {r.l}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px]/[1.5] text-ink-400">
                Clients set their own goals; staff see and co-plan.
              </p>
            </div>

            {/* Gamification continuity */}
            <div className="rounded-2xl border border-sky-tint bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <div className="text-[11px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
                Continuity
              </div>
              <div className="mt-3 flex flex-col items-start gap-2.5">
                <span className="inline-flex h-9 items-center gap-2 rounded-full bg-sky-tint px-3.5 text-[13px] font-extrabold text-blue-primary">
                  <span>🔥</span> 14-day streak
                </span>
                <span className="inline-flex h-9 items-center gap-2 rounded-full bg-[#F0EDFB] px-3.5 text-[13px] font-extrabold text-indigo-brand">
                  <span>🏅</span> IOP Core badge · 72%
                </span>
              </div>
              <p className="mt-3 text-[12px]/[1.6] text-ink-600">
                The same streaks, points, and program badge run in-facility and
                after discharge - continuity with the outside world is the
                point. Shared facility devices get kiosk mode: PIN quick-login,
                auto-logout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STAY CONNECTED ACROSS THE CONTINUUM */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(320px,460px)] lg:gap-[64px] lg:px-6 lg:py-[110px]">
          <div className="flex flex-col gap-5">
            <Eyebrow>Stay connected across the continuum</Eyebrow>
            <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              The relationship doesn&apos;t end at{" "}
              <span className="script text-[42px] lg:text-[56px]">discharge</span>
            </h2>
            <p className="text-[17px]/[1.75] text-ink-600">
              Program group channels keep cohorts together. Secure 1:1 client
              messaging keeps a mentor a text away. And a structured follow-up
              cadence brings alumni back at the moments that matter most.
            </p>

            {/* Follow-up cadence timeline */}
            <div className="mt-1.5">
              <div className="text-[12px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
                Alumni follow-up cadence
              </div>
              <div className="mt-4 flex items-center">
                {CADENCE.map((d, i) => (
                  <div key={d} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sky-tint text-[13px] font-extrabold text-blue-primary">
                        {d}
                      </span>
                      <span className="text-[10px] font-bold tracking-[.04em] text-ink-400">
                        DAYS
                      </span>
                    </div>
                    {i < CADENCE.length - 1 && (
                      <div className="mb-4 h-[3px] flex-1 rounded-full bg-sky-tint-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Relapse early-warning card */}
          <div className="rounded-2xl border border-sky-tint bg-canvas p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-[22px] items-center rounded-full bg-amber-bg px-2.5 text-[10px] font-extrabold tracking-[.06em] text-amber-ink">
                EARLY WARNING
              </span>
              <span className="ml-auto text-[11px] font-semibold text-ink-400">
                Continuing phase
              </span>
            </div>
            <div className="mt-4 text-[15px] font-bold text-ink-900">
              Engagement is trending down
            </div>
            <p className="mt-1.5 text-[13px]/[1.6] text-ink-600">
              Check-ins, course activity, and community presence have softened
              over three weeks - the earliest measurable relapse signal there is.
            </p>

            {/* declining engagement bars */}
            <div className="mt-5 flex h-24 items-end gap-2">
              {[80, 74, 66, 55, 47, 40, 34].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 overflow-hidden rounded-t-md bg-sky-tint-2"
                  style={{ height: `${h}%` }}
                >
                  <div
                    className="ms-bar-fill h-full w-full rounded-t-md"
                    style={{
                      background:
                        i > 3
                          ? "linear-gradient(180deg,#F5B54B,#E89A2B)"
                          : "linear-gradient(180deg,#4E5B9B,#2E7CD6)",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex min-h-[44px] items-center rounded-full bg-blue-primary px-4 text-[13px] font-bold text-white">
                Assign a mentor check-in
              </span>
            </div>
            <p className="mt-3 text-[11px]/[1.5] text-ink-400">
              A prompt to reach out - never an automated clinical decision.
              Recovery isn&apos;t linear.
            </p>
          </div>
        </div>
      </section>

      {/* GIVING FOR YOUR CLIENTS */}
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(300px,420px)] lg:gap-[72px] lg:px-6 lg:py-[110px]">
          <div className="flex flex-col gap-5">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Giving for your clients
            </div>
            <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              A giving page for every{" "}
              <span className="script text-[42px] lg:text-[56px]">journey</span>
            </h2>
            <p className="text-[17px]/[1.75] text-ink-600">
              Every client gets a personal QR giving page. Half of each gift
              reaches them immediately as cash at your center; half is held for
              their reentry - released directly the day they step back into
              society.
            </p>
            <p className="text-[17px]/[1.75] text-ink-600">
              Your giving desk verifies every redemption, and every dollar is
              accounted for in the dashboard - accountable for donors,
              dignified for the person receiving it.
            </p>
            <Link
              href="/giving"
              className="inline-flex min-h-[44px] items-center text-[16px] font-bold text-blue-primary hover:text-blue-hover"
            >
              How giving works →
            </Link>
          </div>

          {/* QR giving page mini-mock */}
          <div className="mx-auto w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(11,37,69,.08)] lg:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sky-tint text-[13px] font-extrabold text-indigo-brand">
                DM
              </span>
              <div>
                <div className="text-[15px] font-bold text-ink-900">
                  Danielle M.
                </div>
                <div className="text-[11px] font-semibold text-ink-400">
                  Member #039521464
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-sky-tint px-3 py-3.5 text-center">
                <div className="text-[10px] font-extrabold tracking-[.06em] text-blue-primary">
                  CASH NOW
                </div>
                <div className="tnum mt-1 text-[20px] font-extrabold text-ink-900">
                  50%
                </div>
                <div className="text-[10px] font-medium text-ink-600">
                  redeemed at your center
                </div>
              </div>
              <div className="rounded-xl bg-sky-tint px-3 py-3.5 text-center">
                <div className="text-[10px] font-extrabold tracking-[.06em] text-indigo-brand">
                  HELD FOR REENTRY
                </div>
                <div className="tnum mt-1 text-[20px] font-extrabold text-ink-900">
                  50%
                </div>
                <div className="text-[10px] font-medium text-ink-600">
                  released on their first day back
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-tint-2 px-3.5 py-3">
              <div className="grid h-10 w-10 flex-none grid-cols-3 grid-rows-3 gap-[2px] rounded-[6px] bg-white p-[3px] outline outline-2 outline-navy-deep">
                {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((on, i) => (
                  <span
                    key={i}
                    className={
                      "rounded-[1px] " + (on ? "bg-navy-deep" : "bg-sky-tint")
                    }
                  />
                ))}
              </div>
              <div className="text-[12px]/[1.5] font-semibold text-ink-600">
                Scan to give directly to Danielle&apos;s journey
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE COMMUNITY */}
      <section className="bg-white">
        <div className="mx-auto flex max-w-[820px] flex-col items-center gap-4 px-5 py-16 text-center lg:px-6 lg:py-[90px]">
          <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
            The community
          </div>
          <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
            A feed that&apos;s safe to{" "}
            <span className="script text-[42px] lg:text-[56px]">join</span>
          </h2>
          <p className="max-w-[640px] text-[17px]/[1.75] text-ink-600">
            Your clients join a moderated, recovery-first social feed - wins,
            jobs, and support requests. Crisis language is held automatically,
            and your staff approve what goes public.
          </p>
          <Link
            href="/community"
            className="inline-flex min-h-[44px] items-center text-[16px] font-bold text-blue-primary hover:text-blue-hover"
          >
            Visit the community →
          </Link>
        </div>
      </section>

      {/* REACH THE COMMUNITY - the ad product */}
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(320px,440px)] lg:gap-[64px] lg:px-6 lg:py-[110px]">
          <div className="flex flex-col gap-5">
            <Eyebrow>Reach the community</Eyebrow>
            <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Your next client is already in the{" "}
              <span className="script text-[42px] lg:text-[56px]">community</span>
            </h2>
            <p className="text-[17px]/[1.75] text-ink-600">
              Promote your services, alumni events, and openings with sponsored
              placements in the community feed - member-safe by design, because
              trust is the whole product.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Recovery-relevant only - services, alumni events, fair-chance jobs, programs.",
                "Clearly labeled as sponsored - never disguised as a peer post.",
                "Frequency-capped and spaced, so the feed stays a recovery space first.",
                "Coarse, non-clinical targeting only - metro, care phase, interests. Never diagnosis or health status.",
                "Member controls - dismiss, report, and reduce sponsored content anytime.",
                "Aggregate analytics only - impressions, clicks, CTR. Never per-member profiles.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[15px]/[1.6] text-ink-600">
                  <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-blue-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-[13px]/[1.6] text-ink-400">
              Members in a flagged or at-risk state are never served sponsored
              content - they see support resources instead.
            </p>
          </div>

          {/* Sponsored placement preview */}
          <div className="mx-auto w-full max-w-[380px]">
            <div className="text-center text-[11px] font-bold uppercase tracking-[.1em] text-ink-400">
              In-feed preview
            </div>
            <div className="mt-3 rounded-2xl border-[1.5px] border-blue-primary/40 bg-sky-tint p-5 shadow-[0_2px_10px_rgba(46,124,214,.14)]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white text-[13px] font-extrabold text-indigo-brand shadow-[0_1px_3px_rgba(11,37,69,.08)]">
                  YC
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-ink-900">
                    Sponsored by [Your Center]
                  </div>
                  <div className="text-[11px] font-semibold text-blue-primary">
                    Alumni event
                  </div>
                </div>
                <span className="ml-auto inline-flex h-[20px] items-center rounded-full bg-blue-primary px-2.5 text-[9px] font-extrabold tracking-[.08em] text-white">
                  SPONSORED
                </span>
              </div>
              <div className="mt-3 text-[14px]/[1.6] font-medium text-ink-900">
                One year, one room, one thousand comebacks. Join our alumni
                dinner - dinner&apos;s on us, and so is the ride.
              </div>
              <div className="mt-3 aspect-[16/9] rounded-xl bg-[linear-gradient(135deg,#4E5B9B,#2E7CD6)]" />
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex min-h-[36px] items-center rounded-full bg-blue-primary px-4 text-[12px] font-bold text-white">
                  RSVP
                </span>
                <span className="ml-auto text-[11px] font-semibold text-ink-400">
                  Hide · Report
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROVE YOUR OUTCOMES */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow light>Prove your outcomes</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-white lg:text-[44px]/[1.1]">
              Show funders what{" "}
              <span className="script text-[42px] text-[#A9B4E8] lg:text-[56px]">
                works
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[600px] text-base/[1.7] text-white/75 lg:text-[17px]">
              The engagement your members live becomes the evidence your board
              and your grants need - measured over the year-plus that counts.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-[52px] lg:grid-cols-4 lg:gap-6">
            {[
              {
                t: "Continuum score",
                d: "A single measure of how engaged each cohort stays across every phase.",
              },
              {
                t: "Retention curves",
                d: "See how many alumni are still engaged at 90, 180, and 365 days.",
              },
              {
                t: "Recovery-capital deltas",
                d: "Track growth in employment, housing, and social support over time.",
              },
              {
                t: "Grant-ready reports",
                d: "Export de-identified, funder-ready summaries in a click.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-2xl border border-white/10 bg-white/[.06] p-6"
              >
                <div className="text-[16px] font-bold text-white">{c.t}</div>
                <p className="mt-2 text-[13px]/[1.6] text-white/70">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT ALL CONNECTS - Danielle across five phases */}
      <section className="bg-white">
        <div className="mx-auto max-w-[860px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow>How it all connects</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              One member, five phases, one{" "}
              <span className="script text-[42px] lg:text-[56px]">record</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[580px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              Danielle&apos;s community life, goals, giving, and learning all
              become your center&apos;s outcome data - automatically.
            </p>
          </div>

          <ol className="mt-10 flex flex-col gap-4 lg:mt-[52px]">
            {DANIELLE_PHASES.map((p, i) => (
              <li
                key={p.phase}
                className="flex gap-4 rounded-2xl border border-sky-tint bg-canvas p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:p-6"
              >
                <div className="flex flex-none flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-primary text-[13px] font-extrabold text-white">
                    {i + 1}
                  </span>
                  {i < DANIELLE_PHASES.length - 1 && (
                    <span className="mt-1.5 w-[2px] flex-1 rounded-full bg-sky-tint-2" />
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="text-[15px] font-extrabold uppercase tracking-[.06em] text-indigo-brand">
                    {p.phase}
                  </div>
                  <p className="mt-1.5 text-[15px]/[1.6] text-ink-900">
                    {p.line}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {p.systems.map((s) => (
                      <span
                        key={s}
                        className="inline-flex h-6 items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-extrabold tracking-[.04em] text-blue-primary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* HOW ONBOARDING WORKS */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Onboarding
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              Up and running in three{" "}
              <span className="script text-[44px] lg:text-[60px]">steps</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-[60px] lg:grid-cols-3 lg:gap-7">
            {ONBOARDING.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl bg-white px-8 pb-9 pt-10 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
              >
                <div className="absolute left-[22px] top-2.5 text-[96px]/[1] font-extrabold text-[rgba(78,91,155,.1)]">
                  {s.n}
                </div>
                <div className="relative pt-14 text-[21px] font-bold text-ink-900">
                  {s.title}
                </div>
                <div className="relative mt-2.5 text-[15px]/[1.7] text-ink-600">
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE ROI CALCULATOR - same math shape as the dashboard ROI
          block: your inputs x published case-study deltas, honestly footnoted */}
      <section id="roi-calculator" className="scroll-mt-20 bg-navy-deep">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow light>Estimate your impact</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-white lg:text-[44px]/[1.1]">
              Run your own{" "}
              <span className="script text-[42px] text-[#A9B4E8] lg:text-[56px]">
                numbers
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[600px] text-base/[1.7] text-white/75 lg:text-[17px]">
              Move the sliders to your center&apos;s reality. The math is the
              same transparent model the dashboard uses - your inputs times
              published case-study benchmarks.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-[52px] lg:grid-cols-[1fr_1.1fr] lg:gap-8">
            {/* sliders */}
            <div className="rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(11,37,69,.25)] lg:p-8">
              <div className="text-[12px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
                Your inputs
              </div>
              <div className="mt-5 flex flex-col gap-5">
                <RoiSlider
                  id="ms-roi-census"
                  label="Census"
                  min={10}
                  max={200}
                  step={5}
                  defaultValue={60}
                  defaultLabel="60 clients"
                />
                <RoiSlider
                  id="ms-roi-rate"
                  label="Current completion rate"
                  min={20}
                  max={80}
                  step={1}
                  defaultValue={45}
                  defaultLabel="45%"
                />
                <RoiSlider
                  id="ms-roi-rev"
                  label="Avg revenue per completed episode"
                  min={3000}
                  max={30000}
                  step={500}
                  defaultValue={9000}
                  defaultLabel="$9,000"
                />
                <RoiSlider
                  id="ms-roi-hrs"
                  label="Clinician hours per week"
                  min={10}
                  max={60}
                  step={1}
                  defaultValue={40}
                  defaultLabel="40 hrs/week"
                />
              </div>
            </div>

            {/* results - the math shown */}
            <div className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(11,37,69,.25)] lg:p-8">
              <div className="text-[12px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
                Estimated annual impact
              </div>
              <div className="mt-4">
                <RoiLine
                  label="Completion rate with case-study delta (+15 pts)"
                  id="ms-roi-improved"
                  value="45% → 60%"
                />
                <RoiLine
                  label="Additional completions per year"
                  id="ms-roi-added"
                  value="9"
                />
                <RoiLine
                  label="Completion revenue impact"
                  id="ms-roi-completion"
                  value="$81,000"
                />
                <RoiLine
                  label="Clinician hours saved per year (~2 hrs per 8-hr day)"
                  id="ms-roi-hours-saved"
                  value="520 hrs"
                />
                <RoiLine
                  label="Staff time value at $85/hr"
                  id="ms-roi-time"
                  value="$44,200"
                />
                <RoiLine
                  label="Estimated annual impact"
                  id="ms-roi-total"
                  value="$125,200"
                  strong
                />
              </div>
              <p className="mt-4 text-[11px]/[1.6] text-ink-400">
                Estimate based on your inputs plus published case-study
                benchmarks (published case study: completion 50% to 65%, about
                2 hours
                saved per clinician per 8-hour day) - not a guarantee. Assumes
                your census turns over roughly once per year and clinician time
                valued at $85/hr.
              </p>
              <a
                href="#request-demo"
                className="mt-5 inline-flex h-[52px] items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover"
              >
                Get your full ROI analysis
              </a>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: ROI_CALC_JS }} />
      </section>

      {/* PRICING TIERS */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[680px] text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              One subscription, priced to your{" "}
              <span className="script text-[42px] lg:text-[56px]">census</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              Every center is different, so pricing is custom. Tell us your size
              and your programs and we&apos;ll build a plan that fits.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-[56px] lg:grid-cols-3 lg:gap-7">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={
                  "flex flex-col rounded-2xl p-7 lg:p-8 " +
                  (t.featured
                    ? "bg-navy-deep shadow-[0_10px_30px_rgba(11,37,69,.2)]"
                    : "border border-sky-tint bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]")
                }
              >
                {t.featured && (
                  <span className="mb-3 inline-flex h-6 w-fit items-center rounded-full bg-blue-primary px-3 text-[10px] font-extrabold tracking-[.08em] text-white">
                    MOST POPULAR
                  </span>
                )}
                <div
                  className={
                    "text-[20px] font-extrabold tracking-[-0.01em] " +
                    (t.featured ? "text-white" : "text-ink-900")
                  }
                >
                  {t.name}
                </div>
                <div
                  className={
                    "mt-2 text-[15px]/[1.5] font-semibold " +
                    (t.featured ? "text-[#A9B4E8]" : "text-blue-primary")
                  }
                >
                  {t.price}
                </div>
                <p
                  className={
                    "mt-2 text-[14px]/[1.6] " +
                    (t.featured ? "text-white/70" : "text-ink-600")
                  }
                >
                  {t.tagline}
                </p>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className={
                        "flex gap-2.5 text-[13px]/[1.55] " +
                        (t.featured ? "text-white/85" : "text-ink-600")
                      }
                    >
                      <span
                        className={
                          "mt-[3px] flex-none text-[12px] font-extrabold " +
                          (t.featured ? "text-[#8FBCF0]" : "text-blue-primary")
                        }
                      >
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#request-demo"
                  className={
                    "mt-7 inline-flex h-[52px] items-center justify-center rounded-full px-6 text-[15px] font-bold " +
                    (t.featured
                      ? "bg-blue-primary text-white hover:bg-blue-hover"
                      : "border-[1.5px] border-blue-primary text-blue-primary hover:bg-sky-tint")
                  }
                >
                  Talk to us
                </a>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-[760px] rounded-2xl border border-sky-tint bg-canvas p-6 text-center">
            <div className="text-[12px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
              Add-ons
            </div>
            <p className="mt-2 text-[15px]/[1.7] text-ink-600">
              <span className="font-bold text-ink-900">
                Community ad product
              </span>{" "}
              (sponsored placements) and{" "}
              <span className="font-bold text-ink-900">
                outcomes-data licensing
              </span>{" "}
              are available as add-ons to any tier. Pricing is custom - ask us.
            </p>
          </div>
        </div>
      </section>

      {/* TRUST & PRIVACY */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow>Trust &amp; privacy</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Built so a clinical buyer can say{" "}
              <span className="script text-[42px] lg:text-[56px]">yes</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-[52px] lg:gap-6">
            {[
              {
                t: "Consent-first",
                d: "Members opt in to what they share. Nothing is published without their say - and staff approve what goes public.",
              },
              {
                t: "De-identified outcomes",
                d: "Analytics and licensed data are aggregate and de-identified. No individual health profile is ever exposed.",
              },
              {
                t: "Not an EHR",
                d: "This is an engagement and community platform, not a system of record for clinical documentation.",
              },
              {
                t: "HIPAA-adjacency posture",
                d: "Built to sit alongside your clinical systems with careful data handling, access controls, and audit logging.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-2xl border border-sky-tint bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
              >
                <div className="text-[17px] font-bold text-ink-900">{c.t}</div>
                <p className="mt-2 text-[14px]/[1.65] text-ink-600">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO REQUEST LEAD CAPTURE */}
      <section id="request-demo" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-[820px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <Eyebrow>Request a demo</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              See it with your programs in{" "}
              <span className="script text-[42px] lg:text-[56px]">mind</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[540px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              Tell us about your center and we&apos;ll set up a walkthrough. No
              pressure, no obligation - just a look at what the platform can do.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border border-sky-tint bg-canvas p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:mt-[52px] lg:p-9">
            <LeadForm />
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="bg-navy-deep">
        <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 px-5 py-16 text-center lg:px-6 lg:py-[100px]">
          <h2 className="text-[32px]/[1.15] font-extrabold tracking-[-0.02em] text-white lg:text-[44px]/[1.1]">
            Bring the platform to your{" "}
            <span className="script text-[40px] text-[#A9B4E8] lg:text-[56px]">
              center
            </span>
            .
          </h2>
          <p className="max-w-[560px] text-[16px]/[1.7] text-white/75 lg:text-[18px]">
            One call is all it takes to see it working - with your programs and
            your people in mind.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <a
              href="mailto:info@themystruggles.com"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
            >
              Email info@themystruggles.com
            </a>
            <Link
              href="/dashboard"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-white/85 px-[34px] text-base font-bold text-white hover:bg-white/[.12] sm:w-auto"
            >
              Try the demo dashboard →
            </Link>
          </div>
          <div className="text-[13px] font-medium text-white/60">
            Demo login: sarah@themystruggles.com · password{" "}
            <span className="font-bold text-white/80">mystruggle</span>
          </div>
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
