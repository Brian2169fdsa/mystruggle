"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  Heart,
  Laptop,
  MapPin,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { JOB_TYPES, type JobType } from "../lib/types";

/**
 * Public job board (docs/17). Client-rendered so members can filter, save
 * (heart), and apply in place - /api/jobs is the single source of truth and
 * only shows open postings from verified employers. The apply modal handles
 * the first-apply consent screen (HTTP 428) with the plain-language
 * disclosure and the always-available "export your resume and apply outside
 * the platform" alternative.
 */

const TYPE_LABEL: Record<JobType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  temporary: "Temporary",
  contract: "Contract",
  seasonal: "Seasonal",
};

/** A job as the public API projects it - expansion fields all optional. */
type BoardJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  metro?: string;
  remote?: boolean;
  type: JobType;
  payRange?: string;
  payMinCents?: number;
  payMaxCents?: number;
  description: string;
  fairChanceNotes?: string;
  createdAt: number;
  saved?: boolean;
};

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** $17/hr, $17.50/hr - whole dollars stay whole. */
const money = (cents: number) => {
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : d.toFixed(2)}`;
};

/** Prefer structured pay when present, else the employer's own words. */
function payLine(job: BoardJob): string | null {
  const { payMinCents: min, payMaxCents: max } = job;
  if (min && max) return `${money(min)}-${money(max)}/hr`;
  if (min) return `From ${money(min)}/hr`;
  if (max) return `Up to ${money(max)}/hr`;
  return job.payRange ?? null;
}

const FALLBACK_DISCLOSURE =
  "Applying through My Struggle shares your chosen name, your resume, and your note with this employer. It also lets them know you are part of a recovery community. You can always export your resume and apply outside the platform instead.";

type ApplyStep = "compose" | "consent" | "success" | "signin";

export default function JobsPage() {
  const [jobs, setJobs] = useState<BoardJob[] | null>(null);
  const [metros, setMetros] = useState<string[]>([]);

  // Filters
  const [q, setQ] = useState("");
  const [metro, setMetro] = useState("");
  const [type, setType] = useState("");
  const [remote, setRemote] = useState(false);

  // Save-heart sign-in nudge (shown once, inline above the grid)
  const [saveNudge, setSaveNudge] = useState(false);

  // Apply modal
  const [applyJob, setApplyJob] = useState<BoardJob | null>(null);
  const [step, setStep] = useState<ApplyStep>("compose");
  const [note, setNote] = useState("");
  const [disclosure, setDisclosure] = useState(FALLBACK_DISCLOSURE);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const seededMetros = useRef(false);

  useEffect(() => {
    document.title = "Recovery-Friendly Jobs - My Struggle";
  }, []);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (metro) params.set("metro", metro);
    if (type) params.set("type", type);
    if (remote) params.set("remote", "1");
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jobs${qs ? `?${qs}` : ""}`, {
          cache: "no-store",
        });
        if (!alive || !res.ok) return;
        const data = await res.json();
        const list: BoardJob[] = Array.isArray(data.jobs) ? data.jobs : [];
        setJobs(list);
        // Seed the metro dropdown from the first unfiltered load so options
        // don't vanish as filters narrow the list.
        if (!seededMetros.current && !qs) {
          seededMetros.current = true;
          setMetros(
            Array.from(
              new Set(list.map((j) => j.metro).filter((m): m is string => !!m))
            ).sort()
          );
        }
      } catch {
        // keep the last good list on network hiccups
      }
    }, q.trim() ? 250 : 0);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, metro, type, remote]);

  async function toggleSave(job: BoardJob) {
    const next = !job.saved;
    try {
      const res = await fetch(`/api/jobs/${job.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save: next }),
      });
      if (res.status === 401) {
        setSaveNudge(true);
        return;
      }
      if (res.ok) {
        setJobs((prev) =>
          prev
            ? prev.map((j) => (j.id === job.id ? { ...j, saved: next } : j))
            : prev
        );
      }
    } catch {
      // leave the heart as it was
    }
  }

  function openApply(job: BoardJob) {
    setApplyJob(job);
    setStep("compose");
    setNote("");
    setApplyError(null);
  }

  function closeApply() {
    setApplyJob(null);
    setApplyError(null);
    setBusy(false);
  }

  async function submitApply(consented: boolean) {
    if (!applyJob || busy) return;
    setBusy(true);
    setApplyError(null);
    try {
      const res = await fetch(`/api/jobs/${applyJob.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note.trim() || undefined,
          ...(consented ? { consentDisclosure: true } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setStep("signin");
      } else if (res.status === 428) {
        if (typeof data.disclosure === "string") setDisclosure(data.disclosure);
        setStep("consent");
      } else if (res.ok) {
        setStep("success");
      } else {
        setApplyError(
          typeof data.error === "string"
            ? data.error
            : "Something went wrong - please try again."
        );
      }
    } catch {
      setApplyError("Something went wrong - please try again.");
    } finally {
      setBusy(false);
    }
  }

  const count = jobs?.length ?? 0;
  const hasFilters = !!(q.trim() || metro || type || remote);
  const typeOptions = useMemo(() => JOB_TYPES, []);

  return (
    <>
      <Nav />
      <main className="bg-canvas">
        {/* HERO */}
        <section className="mx-auto max-w-[1000px] px-5 pb-6 pt-14 lg:pt-20">
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-sky-tint px-3.5 text-[12px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
            <Briefcase className="h-4 w-4" aria-hidden /> Recovery-friendly jobs
          </span>
          <h1 className="mt-4 max-w-[640px] text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.08]">
            Fair-chance work from employers who hire on{" "}
            <span className="script text-[52px] lg:text-[62px]">who you are</span>
          </h1>
          <p className="mt-4 max-w-[560px] text-[16px]/[1.7] font-medium text-ink-600">
            Every opening here is posted by a verified employer who welcomes
            members in recovery. Steady hours, real pay, and a fresh start.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="tnum text-[14px] font-bold text-ink-900">
              {jobs === null
                ? "Loading roles..."
                : `${count} open ${count === 1 ? "role" : "roles"}`}
            </span>
            <Link
              href="/employer"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-[13.5px] font-extrabold text-blue-primary shadow-[0_1px_3px_rgba(11,37,69,.1)] hover:bg-sky-tint"
            >
              Are you hiring? Post a job →
            </Link>
          </div>
        </section>

        {/* FILTER BAR */}
        <section className="mx-auto max-w-[1000px] px-5 pb-6">
          <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
              <label className="relative block">
                <span className="sr-only">Search title or company</span>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title or company"
                  className="h-11 w-full rounded-full border border-[#E3E9F2] bg-white pl-10 pr-4 text-[14px] font-semibold text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="sr-only">Metro area</span>
                <select
                  value={metro}
                  onChange={(e) => setMetro(e.target.value)}
                  className="h-11 w-full rounded-full border border-[#E3E9F2] bg-white px-4 text-[14px] font-semibold text-ink-900 focus:border-blue-primary focus:outline-none lg:w-[170px]"
                >
                  <option value="">All metros</option>
                  {metros.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="sr-only">Job type</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-11 w-full rounded-full border border-[#E3E9F2] bg-white px-4 text-[14px] font-semibold text-ink-900 focus:border-blue-primary focus:outline-none lg:w-[160px]"
                >
                  <option value="">All types</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setRemote((r) => !r)}
                aria-pressed={remote}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[13.5px] font-extrabold transition-colors ${
                  remote
                    ? "bg-blue-primary text-white"
                    : "border border-[#E3E9F2] bg-white text-ink-600 hover:bg-sky-tint"
                }`}
              >
                <Laptop className="h-4 w-4" aria-hidden /> Remote
              </button>
            </div>
          </div>
          {saveNudge && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-tint px-5 py-3.5">
              <p className="text-[13.5px] font-semibold text-ink-900">
                Sign in as a member to save jobs to your plan.
              </p>
              <span className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-blue-primary px-5 text-[13px] font-extrabold text-white hover:bg-blue-hover"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={() => setSaveNudge(false)}
                  aria-label="Dismiss"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-400 hover:text-ink-900"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </span>
            </div>
          )}
        </section>

        {/* LIST */}
        <section className="mx-auto max-w-[1000px] px-5 pb-20">
          {jobs !== null && jobs.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <p className="text-[15px] font-bold text-ink-900">
                {hasFilters ? "No roles match those filters" : "No open roles right now"}
              </p>
              <p className="mt-1.5 text-[14px]/[1.6] font-medium text-ink-600">
                {hasFilters
                  ? "Try widening your search - new openings are posted often."
                  : "Check back soon - new fair-chance openings are posted often."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(jobs ?? []).map((job) => {
                const pay = payLine(job);
                return (
                  <article
                    key={job.id}
                    className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-[24px] items-center rounded-full bg-[#E8F8F0] px-2.5 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-success">
                          Fair chance
                        </span>
                        <span className="text-[12px] font-semibold text-ink-400">
                          {TYPE_LABEL[job.type]}
                        </span>
                        {job.remote && (
                          <span className="inline-flex h-[24px] items-center gap-1 rounded-full bg-sky-tint px-2.5 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-blue-primary">
                            <Laptop className="h-3 w-3" aria-hidden /> Remote
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSave(job)}
                        aria-pressed={!!job.saved}
                        aria-label={job.saved ? "Unsave this job" : "Save this job"}
                        className={`-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                          job.saved
                            ? "text-heart-red"
                            : "text-ink-400 hover:text-heart-red"
                        }`}
                      >
                        <Heart
                          className="h-5 w-5"
                          fill={job.saved ? "currentColor" : "none"}
                          aria-hidden
                        />
                      </button>
                    </div>
                    <h2 className="mt-2 text-[19px]/[1.2] font-extrabold text-ink-900">
                      {job.title}
                    </h2>
                    <p className="mt-1 text-[14px] font-bold text-blue-primary">
                      {job.company}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-ink-600">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {job.location}
                        {job.metro && job.metro !== job.location
                          ? ` · ${job.metro}`
                          : ""}
                      </span>
                      {pay && <span className="text-ink-900">{pay}</span>}
                    </div>
                    <p className="mt-3 flex-1 text-[13.5px]/[1.65] font-medium text-ink-600">
                      {job.description}
                    </p>
                    {job.fairChanceNotes && (
                      <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#E8F8F0] px-3 py-2 text-[12.5px]/[1.55] font-semibold text-ink-900">
                        <ShieldCheck
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                          aria-hidden
                        />
                        {job.fairChanceNotes}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-[12px] font-medium text-ink-400">
                        Posted {fmtDate(job.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openApply(job)}
                        className="inline-flex h-11 items-center justify-center rounded-full bg-blue-primary px-5 text-[13px] font-extrabold text-white hover:bg-blue-hover"
                      >
                        Apply
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />

      {/* APPLY MODAL */}
      {applyJob && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,37,69,.55)] p-0 sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label={`Apply to ${applyJob.title}`}
          onClick={closeApply}
        >
          <div
            className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-extrabold uppercase tracking-[.08em] text-blue-primary">
                  {applyJob.company}
                </p>
                <h3 className="mt-1 text-[19px]/[1.2] font-extrabold text-ink-900">
                  {step === "success"
                    ? "Application sent"
                    : `Apply to ${applyJob.title}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeApply}
                aria-label="Close"
                className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-400 hover:text-ink-900"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {step === "compose" && (
              <div className="mt-4">
                <label className="block">
                  <span className="text-[13px] font-bold text-ink-900">
                    A note for the employer{" "}
                    <span className="font-medium text-ink-400">(optional)</span>
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Why this role feels like a fit for you..."
                    className="mt-2 w-full rounded-xl border border-[#E3E9F2] bg-white p-3.5 text-[14px]/[1.6] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
                  />
                </label>
                <p className="mt-2 text-[12.5px]/[1.6] font-medium text-ink-600">
                  Your resume goes with your application. Don&apos;t have one
                  yet? You can still apply, or{" "}
                  <Link
                    href="/resume"
                    className="font-bold text-blue-primary underline underline-offset-2"
                  >
                    build yours first
                  </Link>
                  .
                </p>
                {applyError && (
                  <p className="mt-3 rounded-xl bg-[#FFF6E9] px-3.5 py-2.5 text-[13px]/[1.55] font-semibold text-ink-900">
                    {applyError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => submitApply(false)}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-primary px-5 text-[14px] font-extrabold text-white hover:bg-blue-hover disabled:opacity-60"
                >
                  {busy ? "Sending..." : "Apply with my resume"}
                </button>
              </div>
            )}

            {step === "consent" && (
              <div className="mt-4">
                <p className="text-[13px] font-extrabold uppercase tracking-[.08em] text-ink-400">
                  Before your first application
                </p>
                <p className="mt-2 rounded-xl bg-sky-tint px-4 py-3.5 text-[14px]/[1.65] font-medium text-ink-900">
                  {disclosure}
                </p>
                {applyError && (
                  <p className="mt-3 rounded-xl bg-[#FFF6E9] px-3.5 py-2.5 text-[13px]/[1.55] font-semibold text-ink-900">
                    {applyError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => submitApply(true)}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-primary px-5 text-[14px] font-extrabold text-white hover:bg-blue-hover disabled:opacity-60"
                >
                  {busy ? "Sending..." : "I understand - send my application"}
                </button>
                <Link
                  href="/resume"
                  className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full text-[13.5px] font-extrabold text-blue-primary hover:bg-sky-tint"
                >
                  Export my resume and apply outside the platform
                </Link>
              </div>
            )}

            {step === "success" && (
              <div className="mt-4 text-center">
                <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F8F0]">
                  <CheckCircle2 className="h-7 w-7 text-success" aria-hidden />
                </span>
                <p className="mt-3 text-[14.5px]/[1.65] font-medium text-ink-600">
                  Application sent - track it in your plan.
                </p>
                <Link
                  href="/member-app"
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-primary px-5 text-[14px] font-extrabold text-white hover:bg-blue-hover"
                >
                  Open my plan
                </Link>
                <button
                  type="button"
                  onClick={closeApply}
                  className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full text-[13.5px] font-extrabold text-blue-primary hover:bg-sky-tint"
                >
                  Done
                </button>
              </div>
            )}

            {step === "signin" && (
              <div className="mt-4">
                <p className="text-[14.5px]/[1.65] font-medium text-ink-600">
                  Sign in as a member to apply - your application travels with
                  your resume and shows up in your plan.
                </p>
                <Link
                  href="/login"
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-primary px-5 text-[14px] font-extrabold text-white hover:bg-blue-hover"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-full text-[13.5px] font-extrabold text-blue-primary hover:bg-sky-tint"
                >
                  New here? Create an account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
