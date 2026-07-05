import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";

export const metadata = {
  title: "For Recovery Centers — My Struggle",
  description:
    "Member engagement, mentorship, learning programs, and accountable giving — the platform behind My Struggle's centers, built for yours.",
};

/* ---------------------------------------------------------------- */
/* Pure-CSS UI vignettes for the four pillar cards                   */
/* ---------------------------------------------------------------- */

/** Chat bubble pair — member↔mentor messaging. */
function VignetteChat() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-5">
      <div className="max-w-[78%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[12px]/[1.5] font-medium text-ink-900 shadow-[0_1px_3px_rgba(11,37,69,.08)]">
        Rough morning. Made it to group anyway.
      </div>
      <div className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-blue-primary px-3.5 py-2 text-[12px]/[1.5] font-medium text-white shadow-[0_2px_6px_rgba(46,124,214,.3)]">
        That&apos;s the whole job — showing up. Proud of you.
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 self-start text-[10px] font-bold tracking-[.04em] text-indigo-brand">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
        MOOD CHECK-IN · OK TODAY
      </div>
    </div>
  );
}

/** Course completion ring — programs and lessons. */
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

/** KPI row — dashboard at a glance. */
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

/** Moderation queue card — a held post awaiting staff review. */
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
    desc: "Secure member-to-mentor messaging with mood check-ins built into every conversation — and quiet concern escalation straight to your care team when something feels off.",
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
    desc: "Build curricula, track completion, and award points and levels — every completion updates the member's journey automatically, no spreadsheet in sight.",
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
/* Continuum of care — phases + blind spots                          */
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
    copy: "No one sees the runway into treatment — we measure recovery capital before day one.",
  },
  {
    tag: "After",
    copy: "Outcomes tracking dies at discharge — our community keeps the record alive for years.",
  },
  {
    tag: "Engagement = efficacy",
    copy: "Live engagement signals are the earliest relapse warning that exists.",
  },
];

/** Horizontal before/during/after ribbon — five connected phase segments. */
function ContinuumRibbon() {
  return (
    <div className="w-full">
      <div
        className="flex w-full overflow-hidden rounded-full"
        role="img"
        aria-label="The continuum of care: Pre-care, Intake, In-program, Transition, and Continuing — one connected timeline"
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
    desc: "A 30-minute call. Tell us about your center, your programs, and the people you serve — we'll show you exactly how the platform fits.",
  },
  {
    n: "02",
    title: "We set up your center",
    desc: "Your programs, your mentors, your branding inside the platform. We load your curricula and train your staff on the dashboard.",
  },
  {
    n: "03",
    title: "Your clients sign up in minutes",
    desc: "QR giving pages, courses, and mentors from day one. No downloads, no IT project — just a link and a welcome.",
  },
];

export default function Centers() {
  return (
    <>
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
              giving — the platform behind My Struggle&apos;s centers, built
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
              The same software our own outreach centers run every day —
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
              their reentry — released directly the day they step back into
              society.
            </p>
            <p className="text-[17px]/[1.75] text-ink-600">
              Your giving desk verifies every redemption, and every dollar is
              accounted for in the dashboard — accountable for donors,
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
            Your clients join a moderated, recovery-first social feed — wins,
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
            One call is all it takes to see it working — with your programs and
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
