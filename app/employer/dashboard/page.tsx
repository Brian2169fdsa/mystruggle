"use client";

// Employer dashboard - post recovery-friendly openings, manage them, and run
// a privacy-first candidate pipeline (docs/17). Six sections: Overview,
// Postings (the original post + manage surface, intact), Candidates (kanban
// pipeline + resume drawer), Hires & Retention (30/90/180 check-ins),
// Resources (WOTC / bonding / fair-chance info), and Settings (profile +
// pledge + verification). Employer-only; anyone else is sent to /employer.
//
// PRIVACY: everything rendered here comes from /api/employer/pipeline and
// /api/employer/retention, which expose ONLY chosen first name + resume
// projection + application note - never memberId, memberNumber, slug,
// center, journey, continuum, balances, or email.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  MapPin,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { JOB_TYPES, type JobType, type SafeUser } from "../../lib/types";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

const inputCls =
  "box-border h-[52px] w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none";

const cardCls = "rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: JobType;
  payRange?: string;
  description: string;
  status: "open" | "closed";
  createdAt: number;
}

const TYPE_LABEL: Record<JobType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  temporary: "Temporary",
  contract: "Contract",
  seasonal: "Seasonal",
};

// ── pipeline types (mirror of /api/employer/pipeline's public payload) ──

type Stage = "applied" | "screening" | "interview" | "offer" | "hired" | "closed";

const STAGES: Stage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "closed",
];

const STAGE_LABEL: Record<Stage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  closed: "Closed",
};

interface ResumeProjection {
  headline?: string;
  summary?: string;
  sections: Array<{ kind: string; content: Record<string, unknown> }>;
}

interface Candidate {
  id: string;
  postingId: string;
  stage: Stage;
  stageChangedAt: number;
  chosenName: string;
  appliedAt: number;
  note?: string;
  resume: ResumeProjection | null;
  employerNotes?: string;
}

interface PipelinePosting {
  id: string;
  title: string;
  status: string;
}

interface EmployerProfile {
  ein?: string;
  website?: string;
  industry?: string;
  about?: string;
  pledgeSignedAt?: number;
  verificationStatus?: string;
}

type RetentionDay = 30 | 90 | 180;

interface Hire {
  candidateId: string;
  chosenName: string;
  postingTitle: string;
  hiredAt: number;
  confirms: Array<{
    day: RetentionDay;
    stillEmployed: boolean;
    confirmedAt: number;
  }>;
  nextDue: RetentionDay | null;
}

type Tab =
  | "overview"
  | "postings"
  | "candidates"
  | "hires"
  | "resources"
  | "settings";

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "postings", label: "Postings", icon: Briefcase },
  { id: "candidates", label: "Candidates", icon: Users },
  { id: "hires", label: "Hires & Retention", icon: HeartHandshake },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
];

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const daysSince = (ms: number) =>
  Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));

/** Render one resume-section content value in the member's own words. */
function renderContentValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value))
    return value.map((v) => renderContentValue(v)).join(" · ");
  if (value && typeof value === "object")
    return Object.values(value as Record<string, unknown>)
      .map((v) => renderContentValue(v))
      .filter(Boolean)
      .join(" · ");
  return "";
}

const SECTION_LABEL: Record<string, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  volunteer: "Volunteer",
  references: "References",
  projects: "Projects",
};

export default function EmployerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  // pipeline + retention
  const [postings, setPostings] = useState<PipelinePosting[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [hires, setHires] = useState<Hire[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // new-job form
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState<JobType>("full-time");
  const [payRange, setPayRange] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs?mine=1", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      } else {
        setJobs([]);
      }
    } catch {
      setJobs([]);
    }
  }, []);

  const loadPipeline = useCallback(async () => {
    try {
      const res = await fetch("/api/employer/pipeline", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPostings(Array.isArray(data.postings) ? data.postings : []);
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setProfile(data.profile ?? null);
    } catch {
      // pipeline stays empty - the board renders its empty state
    }
  }, []);

  const loadRetention = useCallback(async () => {
    try {
      const res = await fetch("/api/employer/retention", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setHires(Array.isArray(data.hires) ? data.hires : []);
    } catch {
      // keep prior state
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (data?.user?.role !== "employer") {
          router.replace("/employer");
          return;
        }
        setUser(data.user as SafeUser);
        await Promise.all([loadJobs(), loadPipeline(), loadRetention()]);
      } catch {
        if (alive) router.replace("/employer");
        return;
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [router, loadJobs, loadPipeline, loadRetention]);

  async function postJob(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the role a title.");
    if (!location.trim()) return setError("Where is the role based?");
    if (!description.trim())
      return setError("Add a short, warm description of the role.");
    setBusy(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          location: location.trim(),
          type,
          payRange: payRange.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't post the job. Please try again.");
        return;
      }
      setTitle("");
      setLocation("");
      setType("full-time");
      setPayRange("");
      setDescription("");
      await Promise.all([loadJobs(), loadPipeline()]);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "open" | "closed") {
    setJobs((prev) =>
      prev ? prev.map((j) => (j.id === id ? { ...j, status } : j)) : prev
    );
    try {
      await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      // optimistic - reload to reconcile on failure
    }
    await Promise.all([loadJobs(), loadPipeline()]);
  }

  async function remove(id: string) {
    setJobs((prev) => (prev ? prev.filter((j) => j.id !== id) : prev));
    try {
      await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    await Promise.all([loadJobs(), loadPipeline()]);
  }

  // ── pipeline actions ──────────────────────────────────────────────────

  const postingTitle = useCallback(
    (postingId: string) =>
      postings.find((p) => p.id === postingId)?.title ?? "Posting",
    [postings]
  );

  const selected = useMemo(
    () => candidates.find((c) => c.id === selectedId) ?? null,
    [candidates, selectedId]
  );

  function openDrawer(c: Candidate) {
    setSelectedId(c.id);
    setNotesDraft(c.employerNotes ?? "");
    setNotesSaved(false);
  }

  async function moveStage(candidateId: string, stage: Stage) {
    setDrawerBusy(true);
    try {
      await fetch("/api/employer/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, stage }),
      });
    } catch {
      // reload reconciles
    }
    await loadPipeline();
    if (stage === "hired") await loadRetention();
    setDrawerBusy(false);
  }

  async function saveNotes(candidateId: string) {
    setDrawerBusy(true);
    setNotesSaved(false);
    try {
      await fetch("/api/employer/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, employerNotes: notesDraft }),
      });
      setNotesSaved(true);
    } catch {
      // reload reconciles
    }
    await loadPipeline();
    setDrawerBusy(false);
  }

  async function confirmRetention(
    candidateId: string,
    day: RetentionDay,
    stillEmployed: boolean
  ) {
    try {
      await fetch("/api/employer/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, day, stillEmployed }),
      });
    } catch {
      // reload reconciles
    }
    await loadRetention();
  }

  // ── derived overview stats ────────────────────────────────────────────

  const openCount = jobs?.filter((j) => j.status === "open").length ?? 0;
  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<
      Stage,
      number
    >;
    for (const c of candidates) counts[c.stage] += 1;
    return counts;
  }, [candidates]);
  const activePipeline =
    candidates.length - stageCounts.hired - stageCounts.closed;
  const allConfirms = hires.flatMap((h) => h.confirms);
  const retainedCount = allConfirms.filter((c) => c.stillEmployed).length;
  const retentionRate = allConfirms.length
    ? Math.round((retainedCount / allConfirms.length) * 100)
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-[14px] font-semibold text-ink-600">
        Loading your dashboard…
      </div>
    );
  }

  const verification = profile?.verificationStatus;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* HEADER */}
      <div className="bg-white">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-5">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={WORDMARK_INDIGO}
              alt="My Struggle"
              className="block h-8 w-auto"
            />
          </Link>
          <Link
            href="/jobs"
            className="text-[13.5px] font-bold text-blue-primary hover:text-blue-hover"
          >
            View the public board →
          </Link>
        </div>
        <div className="hairline" />
      </div>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pb-16 pt-8">
        {/* GREETING */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[28px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900">
              {user?.company ?? "Your"} dashboard
            </h1>
            <p className="mt-1.5 text-[14px]/[1.6] font-medium text-ink-600">
              Welcome{user?.name ? `, ${user.name}` : ""}. You have{" "}
              <span className="font-bold text-ink-900">{openCount}</span> open{" "}
              {openCount === 1 ? "role" : "roles"} live in the community.
            </p>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <nav
          aria-label="Dashboard sections"
          className="mt-6 flex flex-wrap gap-2"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const badge =
              t.id === "candidates"
                ? activePipeline
                : t.id === "hires"
                  ? hires.length
                  : 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[13.5px] font-extrabold transition-colors " +
                  (active
                    ? "bg-navy-deep text-white"
                    : "bg-white text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:text-ink-900")
                }
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t.label}
                {badge > 0 && (
                  <span
                    className={
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold " +
                      (active
                        ? "bg-white/20 text-white"
                        : "bg-sky-tint text-blue-primary")
                    }
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="mt-7">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Open roles",
                  value: String(openCount),
                  sub: "live on the community board",
                },
                {
                  label: "In the pipeline",
                  value: String(Math.max(0, activePipeline)),
                  sub: "candidates in active stages",
                },
                {
                  label: "Hires",
                  value: String(stageCounts.hired),
                  sub: "people you said yes to",
                },
                {
                  label: "Retention",
                  value: retentionRate === null ? "–" : `${retentionRate}%`,
                  sub:
                    retentionRate === null
                      ? "no check-ins recorded yet"
                      : `across ${allConfirms.length} check-in${allConfirms.length === 1 ? "" : "s"}`,
                },
              ].map((s) => (
                <div key={s.label} className={cardCls + " p-5"}>
                  <p className="text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
                    {s.label}
                  </p>
                  <p className="mt-1.5 text-[30px]/none font-extrabold text-ink-900">
                    {s.value}
                  </p>
                  <p className="mt-1.5 text-[12.5px] font-medium text-ink-600">
                    {s.sub}
                  </p>
                </div>
              ))}
            </div>

            <div className={cardCls + " mt-5 p-5"}>
              <h2 className="text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
                Pipeline by stage
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTab("candidates")}
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-sky-tint px-4 text-[13px] font-bold text-ink-900 hover:bg-sky-tint-2"
                  >
                    {STAGE_LABEL[s]}
                    <span className="font-extrabold text-blue-primary">
                      {stageCounts[s]}
                    </span>
                  </button>
                ))}
              </div>
              {candidates.length === 0 && (
                <p className="mt-3 text-[13px]/[1.6] font-medium text-ink-600">
                  When members apply to your postings, they&apos;ll show up
                  here and on the Candidates board.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── POSTINGS (the original surface, intact) ──────────────── */}
        {tab === "postings" && (
          <div className="mt-7 grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* POST A JOB */}
            <section className={"self-start p-6 " + cardCls}>
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink-900">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-tint text-blue-primary">
                  <Plus className="h-[18px] w-[18px]" aria-hidden />
                </span>
                Post an opening
              </h2>
              <form onSubmit={postJob} className="mt-4 flex flex-col gap-3.5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-ink-900">
                    Job title
                  </span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Warehouse Associate"
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-ink-900">
                    Location
                  </span>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Laveen, AZ"
                    className={inputCls}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold text-ink-900">
                      Type
                    </span>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as JobType)}
                      className={inputCls + " cursor-pointer"}
                    >
                      {JOB_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold text-ink-900">
                      Pay{" "}
                      <span className="font-semibold text-ink-400">
                        (optional)
                      </span>
                    </span>
                    <input
                      value={payRange}
                      onChange={(e) => setPayRange(e.target.value)}
                      placeholder="$17–$19/hr"
                      className={inputCls}
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-ink-900">
                    Description
                  </span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="What the role is, who it's a fit for, and why your workplace is a good, fair-chance place to land."
                    className="box-border w-full resize-y rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 py-3.5 text-[15px]/[1.6] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
                  />
                </label>

                {error && (
                  <div className="rounded-xl bg-heart-bg px-4 py-3 text-[13px]/[1.6] font-semibold text-heart-red">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-[52px] cursor-pointer items-center justify-center rounded-full bg-blue-primary text-[15px] font-extrabold text-white shadow-[0_6px_16px_rgba(46,124,214,.3)] hover:bg-blue-hover disabled:cursor-default disabled:opacity-60"
                >
                  {busy ? "Posting…" : "Post to the community"}
                </button>
              </form>
            </section>

            {/* MY POSTINGS */}
            <section>
              <h2 className="text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
                Your postings
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {jobs && jobs.length === 0 && (
                  <div className={cardCls + " p-8 text-center"}>
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-sky-tint text-blue-primary">
                      <Briefcase className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="mt-3 text-[14px] font-bold text-ink-900">
                      No postings yet
                    </p>
                    <p className="mt-1 text-[13px]/[1.6] font-medium text-ink-600">
                      Post your first opening and it&apos;ll show up in the
                      community Hiring rail right away.
                    </p>
                  </div>
                )}
                {jobs?.map((job) => (
                  <article key={job.id} className={cardCls + " p-5"}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-extrabold text-ink-900">
                          {job.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-ink-600">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" aria-hidden />
                            {job.location}
                          </span>
                          <span>{TYPE_LABEL[job.type]}</span>
                          {job.payRange && (
                            <span className="text-blue-primary">
                              {job.payRange}
                            </span>
                          )}
                          <span className="text-ink-400">
                            Posted {fmtDate(job.createdAt)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={
                          "inline-flex h-[26px] shrink-0 items-center rounded-full px-3 text-[11px] font-extrabold uppercase tracking-[.06em] " +
                          (job.status === "open"
                            ? "bg-[#E8F8F0] text-success"
                            : "bg-sky-tint-2 text-ink-600")
                        }
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-2.5 text-[13.5px]/[1.65] font-medium text-ink-600">
                      {job.description}
                    </p>
                    <div className="mt-3.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setStatus(
                            job.id,
                            job.status === "open" ? "closed" : "open"
                          )
                        }
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-sky-tint px-4 text-[12.5px] font-extrabold text-blue-primary hover:bg-sky-tint-2"
                      >
                        {job.status === "open" ? "Close role" : "Reopen role"}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(job.id)}
                        aria-label={`Delete ${job.title}`}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-400 hover:bg-heart-bg hover:text-heart-red"
                      >
                        <Trash2 className="h-[17px] w-[17px]" aria-hidden />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── CANDIDATES (kanban pipeline) ─────────────────────────── */}
        {tab === "candidates" && (
          <div className="mt-7">
            {candidates.length === 0 ? (
              <div className={cardCls + " p-10 text-center"}>
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-sky-tint text-blue-primary">
                  <Users className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-3 text-[15px] font-bold text-ink-900">
                  No candidates yet
                </p>
                <p className="mx-auto mt-1 max-w-[420px] text-[13px]/[1.6] font-medium text-ink-600">
                  When members apply to your postings with their resume,
                  they&apos;ll land here in the Applied column - ready for you
                  to move through the pipeline.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="grid min-w-[1080px] grid-cols-6 gap-3">
                  {STAGES.map((stage) => {
                    const inStage = candidates.filter(
                      (c) => c.stage === stage
                    );
                    return (
                      <div key={stage} className="flex flex-col gap-2">
                        <div
                          className={
                            "flex items-center justify-between rounded-xl px-3 py-2.5 " +
                            (stage === "hired"
                              ? "bg-[#E8F8F0]"
                              : stage === "closed"
                                ? "bg-sky-tint-2/60"
                                : "bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]")
                          }
                        >
                          <span
                            className={
                              "text-[12px] font-extrabold uppercase tracking-[.08em] " +
                              (stage === "hired"
                                ? "text-success"
                                : "text-ink-600")
                            }
                          >
                            {STAGE_LABEL[stage]}
                          </span>
                          <span className="text-[12px] font-extrabold text-ink-400">
                            {inStage.length}
                          </span>
                        </div>
                        {inStage.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => openDrawer(c)}
                            className={
                              cardCls +
                              " min-h-11 cursor-pointer p-3.5 text-left hover:shadow-[0_4px_12px_rgba(11,37,69,.1)]"
                            }
                          >
                            <p className="text-[14px] font-extrabold text-ink-900">
                              {c.chosenName}
                            </p>
                            <p className="mt-0.5 truncate text-[12px] font-semibold text-blue-primary">
                              {postingTitle(c.postingId)}
                            </p>
                            <p className="mt-1.5 text-[11.5px] font-medium text-ink-400">
                              {daysSince(c.stageChangedAt)}d in stage
                              {c.resume && (
                                <FileText
                                  className="ml-1.5 inline h-3 w-3 align-[-1px]"
                                  aria-label="Resume attached"
                                />
                              )}
                            </p>
                          </button>
                        ))}
                        {inStage.length === 0 && (
                          <div className="rounded-xl border-[1.5px] border-dashed border-sky-tint-2 p-3 text-center text-[11.5px] font-semibold text-ink-400">
                            Empty
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="mt-4 text-[12px]/[1.6] font-medium text-ink-400">
              You see each candidate&apos;s chosen first name, resume, and
              application note - nothing else about their journey. That&apos;s
              by design.
            </p>
          </div>
        )}

        {/* ── HIRES & RETENTION ────────────────────────────────────── */}
        {tab === "hires" && (
          <div className="mt-7 flex flex-col gap-3">
            {hires.length === 0 && (
              <div className={cardCls + " p-10 text-center"}>
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-sky-tint text-blue-primary">
                  <HeartHandshake className="h-5 w-5" aria-hidden />
                </span>
                <p className="mt-3 text-[15px] font-bold text-ink-900">
                  No hires yet
                </p>
                <p className="mx-auto mt-1 max-w-[420px] text-[13px]/[1.6] font-medium text-ink-600">
                  Move a candidate to Hired on the Candidates board and
                  they&apos;ll show up here with 30, 90, and 180-day retention
                  check-ins.
                </p>
              </div>
            )}
            {hires.map((h) => (
              <article key={h.candidateId} className={cardCls + " p-5"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[16px] font-extrabold text-ink-900">
                      {h.chosenName}
                    </h3>
                    <p className="mt-0.5 text-[13px] font-semibold text-ink-600">
                      {h.postingTitle}
                      <span className="text-ink-400">
                        {" "}
                        · Hired {fmtDate(h.hiredAt)} (
                        {daysSince(h.hiredAt)}d ago)
                      </span>
                    </p>
                  </div>
                  {h.nextDue === null && (
                    <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-[#E8F8F0] px-3 text-[11px] font-extrabold uppercase tracking-[.06em] text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      All check-ins done
                    </span>
                  )}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {([30, 90, 180] as RetentionDay[]).map((day) => {
                    const confirm = h.confirms.find((c) => c.day === day);
                    const isNext = h.nextDue === day;
                    return (
                      <div
                        key={day}
                        className={
                          "rounded-xl p-3.5 " +
                          (confirm
                            ? confirm.stillEmployed
                              ? "bg-[#E8F8F0]"
                              : "bg-amber-bg"
                            : isNext
                              ? "border-[1.5px] border-sky-tint-2 bg-white"
                              : "bg-canvas")
                        }
                      >
                        <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-ink-400">
                          {day}-day check-in
                        </p>
                        {confirm ? (
                          <p
                            className={
                              "mt-1.5 text-[13px] font-extrabold " +
                              (confirm.stillEmployed
                                ? "text-success"
                                : "text-amber-ink")
                            }
                          >
                            {confirm.stillEmployed
                              ? "Still on the team"
                              : "No longer employed"}
                            <span className="ml-1.5 text-[11.5px] font-semibold text-ink-400">
                              {fmtDate(confirm.confirmedAt)}
                            </span>
                          </p>
                        ) : isNext ? (
                          <>
                            <p className="mt-1.5 text-[13px] font-bold text-ink-900">
                              Still on the team?
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  confirmRetention(h.candidateId, day, true)
                                }
                                className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-blue-primary px-4 text-[13px] font-extrabold text-white hover:bg-blue-hover"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  confirmRetention(h.candidateId, day, false)
                                }
                                className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-sky-tint px-4 text-[13px] font-extrabold text-ink-600 hover:bg-sky-tint-2"
                              >
                                No
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="mt-1.5 text-[12.5px] font-semibold text-ink-400">
                            Coming up
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
            {hires.length > 0 && (
              <p className="text-[12px]/[1.6] font-medium text-ink-400">
                Every &quot;yes&quot; you confirm feeds the retention story
                both sides get to brag about - and quietly supports your
                hire&apos;s recovery journey too.
              </p>
            )}
          </div>
        )}

        {/* ── RESOURCES ────────────────────────────────────────────── */}
        {tab === "resources" && (
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: Award,
                title: "Work Opportunity Tax Credit (WOTC)",
                body: "Hiring from targeted groups - including people with justice involvement and long-term unemployment - can qualify your business for a federal tax credit of up to $2,400 to $9,600 per eligible hire. Certification runs through your state workforce agency, and the request (IRS Form 8850) must be filed within 28 days of the start date.",
              },
              {
                icon: ShieldCheck,
                title: "Federal Bonding Program",
                body: "Free fidelity bonds ($5,000 to $25,000 of coverage, no deductible) that insure your business for the first six months of employment for hires who face barriers to bonding. It removes a common objection at zero cost to you - and most bonded employees never need it.",
              },
              {
                icon: BookOpen,
                title: "Fair-chance hiring guide",
                body: "Practical basics: assess records individually per EEOC guidance (nature of the offense, time passed, relevance to the role) instead of blanket exclusions; ask about qualifications first; keep any background process lawful and consistent. Candidates here arrive with active support - mentors, goals, and a community behind them.",
              },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <article key={r.title} className={cardCls + " flex flex-col p-6"}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-tint text-blue-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-3.5 text-[15.5px] font-extrabold text-ink-900">
                    {r.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[13.5px]/[1.65] font-medium text-ink-600">
                    {r.body}
                  </p>
                  <p className="mt-4 inline-flex items-center rounded-full bg-sky-tint px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.06em] text-ink-600">
                    Informational only - not tax or legal advice
                  </p>
                </article>
              );
            })}
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="mt-7 flex max-w-[720px] flex-col gap-4">
            {verification === "pending" && (
              <div className="rounded-2xl bg-sky-tint px-5 py-4 text-[13.5px]/[1.6] font-semibold text-ink-900">
                Your account is under review - postings go live once verified.
                We review every employer so members can trust every listing.
              </div>
            )}
            {verification === "suspended" && (
              <div className="rounded-2xl bg-amber-bg px-5 py-4 text-[13.5px]/[1.6] font-semibold text-amber-ink">
                Your account is suspended and your postings are paused while we
                take a look. Reach out to the My Struggle team and we&apos;ll
                work it out together.
              </div>
            )}

            <section className={cardCls + " p-6"}>
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink-900">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-tint text-blue-primary">
                  <Building2 className="h-[18px] w-[18px]" aria-hidden />
                </span>
                Company profile
              </h2>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {[
                  { label: "Company", value: user?.company },
                  { label: "Contact", value: user?.name },
                  { label: "Email", value: user?.email },
                  { label: "Industry", value: profile?.industry },
                  { label: "Website", value: profile?.website },
                  { label: "EIN", value: profile?.ein },
                ].map((f) => (
                  <div key={f.label}>
                    <dt className="text-[11px] font-extrabold uppercase tracking-[.1em] text-ink-400">
                      {f.label}
                    </dt>
                    <dd className="mt-0.5 text-[14px] font-semibold text-ink-900">
                      {f.value || <span className="text-ink-400">Not set</span>}
                    </dd>
                  </div>
                ))}
              </dl>
              {profile?.about && (
                <p className="mt-4 rounded-xl bg-canvas px-4 py-3 text-[13.5px]/[1.65] font-medium text-ink-600">
                  {profile.about}
                </p>
              )}
            </section>

            <section className={cardCls + " p-6"}>
              <h2 className="text-[15px] font-extrabold text-ink-900">
                Standing with the community
              </h2>
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {profile?.pledgeSignedAt ? (
                  <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[#E8F8F0] px-3.5 text-[12px] font-extrabold text-success">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Fair-Chance Pledge signed {fmtDate(profile.pledgeSignedAt)}
                  </span>
                ) : (
                  <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-sky-tint px-3.5 text-[12px] font-extrabold text-ink-600">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Fair-Chance Pledge not signed yet
                  </span>
                )}
                {verification === "verified" && (
                  <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[#E8F8F0] px-3.5 text-[12px] font-extrabold text-success">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Verified employer
                  </span>
                )}
                {verification === "pending" && (
                  <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-sky-tint px-3.5 text-[12px] font-extrabold text-ink-600">
                    Verification pending
                  </span>
                )}
                {verification === "suspended" && (
                  <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-amber-bg px-3.5 text-[12px] font-extrabold text-amber-ink">
                    Suspended
                  </span>
                )}
              </div>
              <p className="mt-3 text-[13px]/[1.65] font-medium text-ink-600">
                The Fair-Chance Pledge means you hire on who someone is today:
                qualifications first, records considered individually, and no
                one asked to disclose more than the law requires.
              </p>
            </section>
          </div>
        )}
      </main>

      {/* ── CANDIDATE DRAWER ─────────────────────────────────────────── */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-navy-deep/30"
            onClick={() => setSelectedId(null)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-label={`Candidate ${selected.chosenName}`}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[460px] overflow-y-auto bg-white p-6 shadow-[-8px_0_32px_rgba(11,37,69,.14)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-extrabold text-ink-900">
                  {selected.chosenName}
                </h2>
                <p className="mt-0.5 text-[13px] font-semibold text-blue-primary">
                  {postingTitle(selected.postingId)}
                </p>
                <p className="mt-1 text-[12px] font-medium text-ink-400">
                  Applied {fmtDate(selected.appliedAt)} ·{" "}
                  {daysSince(selected.stageChangedAt)}d in{" "}
                  {STAGE_LABEL[selected.stage]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-400 hover:bg-sky-tint hover:text-ink-900"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {/* stage advance */}
            <div className="mt-5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
                Stage
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={drawerBusy || s === selected.stage}
                    onClick={() => moveStage(selected.id, s)}
                    className={
                      "inline-flex h-11 items-center rounded-full px-4 text-[12.5px] font-extrabold transition-colors " +
                      (s === selected.stage
                        ? s === "hired"
                          ? "bg-[#E8F8F0] text-success"
                          : "bg-navy-deep text-white"
                        : "cursor-pointer bg-sky-tint text-ink-600 hover:bg-sky-tint-2 hover:text-ink-900 disabled:cursor-default disabled:opacity-50")
                    }
                  >
                    {STAGE_LABEL[s]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px]/[1.6] font-medium text-ink-400">
                Every move notifies {selected.chosenName} where they stand.
                Hired celebrates with them and counts toward your retention
                story.
              </p>
            </div>

            {/* application note */}
            {selected.note && (
              <div className="mt-5">
                <h3 className="text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
                  Application note
                </h3>
                <p className="mt-2 rounded-xl bg-canvas px-4 py-3 text-[13.5px]/[1.65] font-medium text-ink-900">
                  {selected.note}
                </p>
              </div>
            )}

            {/* resume projection viewer */}
            <div className="mt-5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Resume
              </h3>
              {selected.resume ? (
                <div className="mt-2 rounded-xl border-[1.5px] border-sky-tint-2 p-4">
                  {selected.resume.headline && (
                    <p className="text-[15px] font-extrabold text-ink-900">
                      {selected.resume.headline}
                    </p>
                  )}
                  {selected.resume.summary && (
                    <p className="mt-1.5 text-[13px]/[1.65] font-medium text-ink-600">
                      {selected.resume.summary}
                    </p>
                  )}
                  {selected.resume.sections.map((s, i) => (
                    <div key={i} className="mt-3.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
                        {SECTION_LABEL[s.kind] ?? s.kind}
                      </p>
                      <div className="mt-1 flex flex-col gap-1">
                        {Object.entries(s.content).map(([key, value]) => {
                          const text = renderContentValue(value);
                          if (!text) return null;
                          return (
                            <p
                              key={key}
                              className="text-[13px]/[1.6] font-medium text-ink-900"
                            >
                              {text}
                            </p>
                          );
                        })}
                        {Object.keys(s.content).length === 0 && (
                          <p className="text-[12.5px] font-medium text-ink-400">
                            (empty section)
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {!selected.resume.headline &&
                    !selected.resume.summary &&
                    selected.resume.sections.length === 0 && (
                      <p className="text-[13px] font-medium text-ink-400">
                        Their resume is still in progress.
                      </p>
                    )}
                </div>
              ) : (
                <p className="mt-2 rounded-xl bg-canvas px-4 py-3 text-[13px] font-medium text-ink-600">
                  No resume attached yet.
                </p>
              )}
            </div>

            {/* employer notes */}
            <div className="mt-5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
                Your notes{" "}
                <span className="normal-case tracking-normal text-ink-400">
                  (private to your team)
                </span>
              </h3>
              <textarea
                value={notesDraft}
                onChange={(e) => {
                  setNotesDraft(e.target.value);
                  setNotesSaved(false);
                }}
                rows={4}
                placeholder="Interview scheduling, impressions, next steps…"
                className="mt-2 box-border w-full resize-y rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 py-3 text-[13.5px]/[1.6] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={drawerBusy}
                  onClick={() => saveNotes(selected.id)}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-blue-primary px-6 text-[13.5px] font-extrabold text-white hover:bg-blue-hover disabled:cursor-default disabled:opacity-60"
                >
                  {drawerBusy ? "Saving…" : "Save notes"}
                </button>
                {notesSaved && (
                  <span className="text-[12.5px] font-bold text-success">
                    Saved
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-xl bg-sky-tint px-4 py-3">
              <ClipboardList
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-primary"
                aria-hidden
              />
              <p className="text-[12px]/[1.6] font-medium text-ink-600">
                You see {selected.chosenName}&apos;s chosen first name, resume,
                and application note - never their recovery details. Hire on
                who they are today.
              </p>
            </div>
          </aside>
        </>
      )}

      <div className="mt-auto bg-navy-deep px-6 py-5 text-center text-[12px] font-medium text-white/60">
        my-struggle.org · My Struggle is a 501(c)(3) nonprofit
      </div>
    </div>
  );
}
