import Link from "next/link";
import {
  Activity,
  ArrowRight,
  HeartHandshake,
  Landmark,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";

export const metadata = {
  title: "For Employers - My Struggle",
  description:
    "Hire people with something to prove - and a community behind them. Fair-chance hiring with supported candidates, honest retention data, and a simple pipeline.",
};

/* ---------------------------------------------------------------- */
/* Reusable section eyebrow (matches /centers)                       */
/* ---------------------------------------------------------------- */

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
/* Value props                                                       */
/* ---------------------------------------------------------------- */

const VALUE_PROPS = [
  {
    icon: HeartHandshake,
    title: "Candidates with a community behind them",
    desc: "Every candidate arrives with an active support system - a peer mentor, a care team, and a 24/7 AI companion for job coaching and interview practice. You're not hiring someone alone; you're hiring a supported person.",
    note: null as string | null,
  },
  {
    icon: Activity,
    title: "Retention data, reported honestly",
    desc: "Simple 30, 90, and 180-day retention check-ins build a track record you can point to. We publish retention numbers from platform data as it accrues - never projections, never guesses.",
    note: null,
  },
  {
    icon: Landmark,
    title: "Real hiring incentives",
    desc: "Fair-chance hiring can come with meaningful federal programs: the Work Opportunity Tax Credit (WOTC) and the Federal Bonding Program. We surface plain-language explainers so you know what to ask your advisors about.",
    note: "Informational, not tax or legal advice.",
  },
  {
    icon: ListChecks,
    title: "A simple pipeline",
    desc: "Post a role, review applications with a resume attached, and move candidates through a clear stage board - applied, screening, interview, offer, hired. No new software to learn, no spreadsheet to babysit.",
    note: null,
  },
];

/* ---------------------------------------------------------------- */
/* Fair-Chance Pledge points                                         */
/* ---------------------------------------------------------------- */

const PLEDGE_POINTS = [
  "We hire based on qualifications - skills, experience, and readiness for the role.",
  "Records are considered individually, consistent with EEOC individualized-assessment guidance - never as a blanket exclusion.",
  "We never require candidates to disclose recovery or justice history beyond the lawful background-check process.",
];

/** Tasteful Fair-Chance Verified badge mock - shield + check, blue/navy. */
function FairChanceBadge() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-[0_10px_30px_rgba(11,37,69,.25)] lg:p-10">
      <svg
        viewBox="0 0 96 96"
        className="h-[120px] w-[120px] lg:h-[140px] lg:w-[140px]"
        role="img"
        aria-label="Fair-Chance Verified badge - a shield with a check mark"
      >
        <defs>
          <linearGradient id="ms-fcv-shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4E5B9B" />
            <stop offset="100%" stopColor="#2E7CD6" />
          </linearGradient>
        </defs>
        {/* outer ring */}
        <circle
          cx="48"
          cy="48"
          r="45"
          fill="none"
          stroke="#DFEAF9"
          strokeWidth="3"
        />
        {/* shield */}
        <path
          d="M48 16 L74 26 v20 c0 16-11 26-26 33 C33 72 22 62 22 46 V26 Z"
          fill="url(#ms-fcv-shield)"
        />
        <path
          d="M48 22 L69 30 v16 c0 13-9 21.5-21 27.5 C36 67.5 27 59 27 46 V30 Z"
          fill="none"
          stroke="rgba(255,255,255,.35)"
          strokeWidth="1.5"
        />
        {/* check */}
        <path
          d="M37 47 L45 55 L60 38"
          fill="none"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="text-center">
        <div className="text-[13px] font-extrabold uppercase tracking-[.16em] text-indigo-brand">
          Fair-Chance
        </div>
        <div className="text-[24px] font-extrabold tracking-[-0.01em] text-navy-deep">
          Verified
        </div>
      </div>
      <p className="max-w-[260px] text-center text-[12px]/[1.6] text-ink-400">
        The mark verified employers can display on postings, career pages, and
        storefronts.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Honest stat spine (footnote style matches /centers)               */
/* ---------------------------------------------------------------- */

const STATS: { big: string; label: string; note: number | null }[] = [
  {
    big: "Top predictor",
    label:
      "Recovery-capital research consistently identifies employment among the strongest community-capital predictors of sustained recovery. A job isn't a nice-to-have; it's part of the treatment.",
    note: 1,
  },
  {
    big: "Both directions",
    label:
      "Work builds the recovery capital that predicts staying in recovery - and the same support systems that sustain recovery help people stay in the job. Employers and members win together.",
    note: 1,
  },
  {
    big: "As it accrues",
    label:
      "Retention numbers on this platform come from real hires and real check-ins, published as the data accrues. We won't quote a retention rate before it exists.",
    note: 2,
  },
];

const FOOTNOTES = [
  "Recovery capital research - longitudinal studies of community capital consistently rank employment among the strongest predictors of sustained recovery. Population-level findings, not guarantees.",
  "Platform retention data is reported transparently as it accumulates from 30/90/180-day check-ins; no projected or modeled figures are published.",
];

function StatSpine() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:gap-6">
        {STATS.map((s, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-sky-tint bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
          >
            <div className="text-[26px]/[1.15] font-extrabold tracking-[-0.02em] text-blue-primary lg:text-[30px]">
              {s.big}
              {s.note && (
                <sup className="ml-0.5 align-super text-[13px] font-bold text-indigo-brand">
                  {s.note}
                </sup>
              )}
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
/* How it works - five steps                                         */
/* ---------------------------------------------------------------- */

const STEPS = [
  {
    title: "Post",
    desc: "Apply once, get verified, then post roles in minutes - title, pay, location, and what makes the role fair-chance friendly.",
  },
  {
    title: "Review",
    desc: "Every posting passes a quick content review so members only see legitimate, non-predatory opportunities. Yours goes live fast.",
  },
  {
    title: "Pipeline",
    desc: "Candidates apply with a resume in one tap. You see chosen name, resume, and application answers - and move people through clear stages.",
  },
  {
    title: "Hire",
    desc: "Mark the hire and the platform celebrates with them - the same moment counts toward their recovery goals and their community's outcomes.",
  },
  {
    title: "Retention check-ins",
    desc: "Quick 30/90/180-day confirms - still employed? Each one builds the retention record both of us can point to.",
  },
];

/* ---------------------------------------------------------------- */
/* Employer application form - server-rendered markup + a small      */
/* vanilla script (same pattern as the /centers ROI calculator) so   */
/* the page keeps its metadata export. Submits to the existing       */
/* /api/leads queue with source "employers-page" and an              */
/* "EMPLOYER APPLICATION" message body.                              */
/* ---------------------------------------------------------------- */

const APPLY_JS = `
(function () {
  function $(id) { return document.getElementById(id); }
  var form = $("ms-emp-form");
  if (!form) return;
  var fields = ["company", "contact", "email", "pledge"];
  function setErr(key, msg) {
    var el = $("ms-emp-" + key + "-err");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var company = $("ms-emp-company").value.trim();
    var contact = $("ms-emp-contact").value.trim();
    var email = $("ms-emp-email").value.trim();
    var phone = $("ms-emp-phone").value.trim();
    var roles = $("ms-emp-roles").value.trim();
    var pledge = $("ms-emp-pledge").checked;

    var ok = true;
    setErr("company", company ? "" : "Tell us your company name.");
    setErr("contact", contact ? "" : "Who should we reach out to?");
    var emailOk = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email);
    setErr("email", emailOk ? "" : "Please enter a valid work email.");
    setErr("pledge", pledge ? "" : "The Fair-Chance Pledge is required to apply.");
    if (!company || !contact || !emailOk || !pledge) return;

    var message =
      "EMPLOYER APPLICATION" +
      "\\nRoles we typically hire: " + (roles || "(not specified)") +
      "\\nFair-Chance Pledge: accepted at submission.";

    var btn = $("ms-emp-submit");
    btn.disabled = true;
    btn.textContent = "Sending application…";
    $("ms-emp-fail").hidden = true;

    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgName: company,
        contactName: contact,
        email: email,
        phone: phone || undefined,
        message: message,
        source: "employers-page",
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then(function (json) {
        if (!json || !json.ok) throw new Error("Not acknowledged");
        form.hidden = true;
        $("ms-emp-success").hidden = false;
      })
      .catch(function () {
        $("ms-emp-fail").hidden = false;
        btn.disabled = false;
        btn.textContent = "Submit application";
      });
  });
})();
`;

const FIELD_CLS =
  "h-[52px] w-full rounded-xl border border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25";

function FieldError({ id }: { id: string }) {
  return (
    <span
      id={id}
      hidden
      className="text-[12px] font-semibold text-heart-red"
      aria-live="polite"
    />
  );
}

function ApplyForm() {
  return (
    <>
      {/* success state - revealed by the script on 200 OK */}
      <div
        id="ms-emp-success"
        hidden
        className="flex flex-col items-center gap-3 rounded-2xl border border-sky-tint-2 bg-sky-tint px-6 py-12 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-primary text-[26px] font-extrabold text-white">
          ✓
        </div>
        <div className="text-[22px] font-bold text-ink-900">
          Application received - welcome aboard.
        </div>
        <p className="max-w-[460px] text-[15px]/[1.7] text-ink-600">
          Our team reviews every employer application before postings go live.
          We&apos;ll reach out within two business days to verify your company
          and get your first role posted.
        </p>
      </div>

      <form id="ms-emp-form" noValidate className="flex flex-col gap-4">
        <div
          id="ms-emp-fail"
          hidden
          className="rounded-xl border border-amber-bg bg-amber-bg px-4 py-3.5 text-[14px]/[1.6] font-semibold text-amber-ink"
          role="alert"
        >
          Something went wrong sending your application. Please email us
          directly at{" "}
          <a
            href="mailto:info@themystruggles.com?subject=Fair-chance%20employer%20application"
            className="font-bold underline"
          >
            info@themystruggles.com
          </a>{" "}
          and we&apos;ll take it from there.
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink-900">
              Company name
            </span>
            <input
              id="ms-emp-company"
              name="company"
              type="text"
              autoComplete="organization"
              placeholder="e.g. Desert Peak Logistics"
              className={FIELD_CLS}
            />
            <FieldError id="ms-emp-company-err" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink-900">
              Contact name
            </span>
            <input
              id="ms-emp-contact"
              name="contact"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              className={FIELD_CLS}
            />
            <FieldError id="ms-emp-contact-err" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink-900">
              Work email
            </span>
            <input
              id="ms-emp-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@yourcompany.com"
              className={FIELD_CLS}
            />
            <FieldError id="ms-emp-email-err" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink-900">
              Phone{" "}
              <span className="font-medium text-ink-400">(optional)</span>
            </span>
            <input
              id="ms-emp-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="(555) 555-5555"
              className={FIELD_CLS}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">
            Roles you typically hire
          </span>
          <textarea
            id="ms-emp-roles"
            name="roles"
            rows={4}
            placeholder="e.g. warehouse associates, line cooks, apprentice electricians - full-time and part-time, Phoenix metro"
            className="w-full rounded-xl border border-sky-tint-2 bg-white px-4 py-3 text-[15px]/[1.6] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25"
          />
        </label>

        {/* Fair-Chance Pledge - required */}
        <div className="rounded-2xl border-[1.5px] border-blue-primary/35 bg-sky-tint p-5">
          <label className="flex cursor-pointer items-start gap-3.5">
            <input
              id="ms-emp-pledge"
              name="pledge"
              type="checkbox"
              className="mt-1 h-6 w-6 flex-none cursor-pointer rounded accent-[#2E7CD6]"
            />
            <span className="text-[14px]/[1.65] font-medium text-ink-900">
              <span className="font-extrabold">The Fair-Chance Pledge.</span>{" "}
              We hire based on qualifications. We consider records individually,
              consistent with EEOC guidance, and never as a blanket exclusion.
              We will not require candidates to disclose recovery or justice
              history beyond the lawful background-check process.
            </span>
          </label>
          <div className="mt-2 pl-[38px]">
            <FieldError id="ms-emp-pledge-err" />
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <button
            id="ms-emp-submit"
            type="submit"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover disabled:opacity-70 sm:w-auto"
          >
            Submit application
          </button>
          <span className="text-[13px] font-medium text-ink-600">
            Prefer email?{" "}
            <a
              href="mailto:info@themystruggles.com?subject=Fair-chance%20employer%20application"
              className="font-bold text-blue-primary"
            >
              info@themystruggles.com
            </a>
          </span>
        </div>
      </form>
    </>
  );
}

/* ---------------------------------------------------------------- */

export default function EmployersPage() {
  return (
    <>
      <Nav />

      {/* 1 - HERO */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="absolute -top-6 right-0 hidden whitespace-nowrap text-[190px]/[1] font-extrabold tracking-[-0.02em] text-white/[.04] lg:block">
          EMPLOYERS
        </div>
        <div className="relative mx-auto w-full max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="flex max-w-[780px] flex-col gap-5 lg:gap-[26px]">
            <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
              FOR FAIR-CHANCE EMPLOYERS
            </div>
            <h1 className="text-[clamp(38px,4.8vw,62px)]/[1.07] font-extrabold tracking-[-0.02em] text-white">
              Hire people with something to{" "}
              <span className="script text-[1.24em] text-[#A9B4E8]">prove</span>{" "}
              - and a community behind them.
            </h1>
            <p className="max-w-[600px] text-[16px]/[1.65] font-medium text-white/[.88] lg:text-[19px]">
              Motivated candidates who arrive with a mentor, a care team, and a
              plan - plus honest retention data and a hiring pipeline that
              takes minutes, not meetings.
            </p>
            <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <a
                href="#apply"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
              >
                Become a fair-chance employer
              </a>
              <Link
                href="/employer"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-white/85 bg-[rgba(11,37,69,.35)] px-[34px] text-base font-bold text-white hover:bg-white/[.12] sm:w-auto"
              >
                Post a job
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2 - VALUE PROPS */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[700px] text-center">
            <Eyebrow>Why hire here</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              A hire with a whole team{" "}
              <span className="script text-[44px] lg:text-[60px]">behind</span>{" "}
              them
            </h2>
            <p className="mx-auto mt-4 max-w-[620px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              Members on this platform aren&apos;t job-searching alone. They
              bring a support system to work with them - and that changes what
              a first year on the job looks like.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-[60px] lg:grid-cols-2 lg:gap-7">
            {VALUE_PROPS.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="flex flex-col rounded-2xl border border-sky-tint bg-white p-7 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:p-8"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-tint text-blue-primary">
                    <Icon size={24} strokeWidth={2} />
                  </span>
                  <div className="mt-4 text-[20px] font-bold text-ink-900 lg:text-[21px]">
                    {v.title}
                  </div>
                  <p className="mt-2.5 flex-1 text-[15px]/[1.7] text-ink-600">
                    {v.desc}
                  </p>
                  {v.note && (
                    <div className="mt-4 inline-flex w-fit items-center rounded-full bg-canvas px-3 py-1.5 text-[11px] font-bold tracking-[.02em] text-ink-400">
                      {v.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 - FAIR-CHANCE VERIFIED */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(300px,380px)] lg:gap-[72px] lg:px-6 lg:py-[110px]">
          <div className="flex flex-col gap-5">
            <Eyebrow light>The pledge, worn proudly</Eyebrow>
            <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-white lg:text-[44px]/[1.1]">
              Fair-Chance Verified - a badge of{" "}
              <span className="script text-[42px] text-[#A9B4E8] lg:text-[56px]">
                honor
              </span>
            </h2>
            <p className="text-[16px]/[1.75] text-white/80 lg:text-[17px]">
              Verification isn&apos;t paperwork; it&apos;s a promise. Employers
              who sign the Fair-Chance Pledge commit to three things, and the
              community sees the mark on every posting they make.
            </p>
            <ul className="flex flex-col gap-3.5">
              {PLEDGE_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-white/10 text-[#8FBCF0]">
                    <ShieldCheck size={16} />
                  </span>
                  <span className="text-[15px]/[1.65] text-white/85">{p}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px]/[1.6] text-white/55">
              Candidates always choose what to share. Applying through the
              platform never forces anyone to disclose their story.
            </p>
          </div>

          <div className="mx-auto w-full max-w-[360px]">
            <FairChanceBadge />
          </div>
        </div>
      </section>

      {/* 4 - HONEST STAT SPINE */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[680px] text-center">
            <Eyebrow>What the research shows</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Employment is part of the{" "}
              <span className="script text-[42px] lg:text-[56px]">
                recovery
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[600px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              We frame every claim honestly - population-level research
              findings, not guarantees, with sources footnoted below.
            </p>
          </div>
          <div className="mt-10 lg:mt-[56px]">
            <StatSpine />
          </div>
        </div>
      </section>

      {/* 5 - HOW IT WORKS */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1100px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              Five steps, start to{" "}
              <span className="script text-[44px] lg:text-[60px]">finish</span>
            </h2>
          </div>

          <ol className="mt-10 flex flex-col gap-4 lg:mt-[56px]">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-4 rounded-2xl border border-sky-tint bg-canvas p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:p-6"
              >
                <div className="flex flex-none flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-primary text-[13px] font-extrabold text-white">
                    {i + 1}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="mt-1.5 w-[2px] flex-1 rounded-full bg-sky-tint-2" />
                  )}
                </div>
                <div className="min-w-0 pb-1">
                  <div className="text-[17px] font-extrabold text-ink-900 lg:text-[18px]">
                    {s.title}
                  </div>
                  <p className="mt-1.5 text-[15px]/[1.65] text-ink-600">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 - PRICING PLACEHOLDER */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[820px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Early partners post for{" "}
              <span className="script text-[42px] lg:text-[56px]">free</span>
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-[560px] rounded-2xl bg-navy-deep p-8 text-center shadow-[0_10px_30px_rgba(11,37,69,.2)] lg:mt-[52px] lg:p-10">
            <span className="inline-flex h-6 items-center rounded-full bg-blue-primary px-3 text-[10px] font-extrabold tracking-[.08em] text-white">
              FOUNDING EMPLOYERS
            </span>
            <div className="mt-4 text-[28px] font-extrabold tracking-[-0.01em] text-white lg:text-[32px]">
              Free while we seed the marketplace
            </div>
            <p className="mx-auto mt-3 max-w-[420px] text-[15px]/[1.7] text-white/75">
              Unlimited postings, the full candidate pipeline, and the
              Fair-Chance Verified mark - no cost for founding employers while
              the community grows.
            </p>
            <a
              href="#apply"
              className="mt-6 inline-flex h-[52px] items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover"
            >
              Apply now
            </a>
            <p className="mt-4 text-[12px] font-medium text-white/50">
              Pricing to come as the marketplace matures - founding employers
              will hear it from us first.
            </p>
          </div>
        </div>
      </section>

      {/* 7 - APPLY */}
      <section id="apply" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-[820px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <Eyebrow>Employer application</Eyebrow>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Become a fair-chance{" "}
              <span className="script text-[42px] lg:text-[56px]">
                employer
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[540px] text-base/[1.7] text-ink-600 lg:text-[17px]">
              Tell us about your company and the roles you hire. We review
              every application, verify the company, and walk you through your
              first posting.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border border-sky-tint bg-canvas p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:mt-[52px] lg:p-9">
            <ApplyForm />
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: APPLY_JS }} />
      </section>

      {/* 8 - CROSS-LINK BAND */}
      <section className="bg-navy-deep">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-5 px-5 py-10 text-center sm:flex-row sm:text-left lg:px-6 lg:py-12">
          <p className="text-[15px]/[1.6] font-medium text-white/85 lg:text-[16px]">
            Need trained peer support on site? We also staff peer safety
            officers through{" "}
            <Link
              href="/about"
              className="font-bold text-white underline decoration-[#8FBCF0] underline-offset-4 hover:text-[#8FBCF0]"
            >
              My Safety
            </Link>
            .
          </p>
          <Link
            href="/jobs"
            className="inline-flex min-h-[44px] flex-none items-center gap-2 rounded-full border-[1.5px] border-white/70 px-6 text-[15px] font-bold text-white hover:bg-white/[.12]"
          >
            Browse open roles <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
