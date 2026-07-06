"use client";

// Employer dashboard — post recovery-friendly openings and manage them
// (close / reopen / remove). Employer-only; anyone else is sent to /employer.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, MapPin, Plus, Trash2 } from "lucide-react";
import { JOB_TYPES, type JobType, type SafeUser } from "../../lib/types";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

const inputCls =
  "box-border h-[52px] w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none";

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

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function EmployerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(true);

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
        await loadJobs();
      } catch {
        if (alive) router.replace("/employer");
        return;
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [router, loadJobs]);

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
      await loadJobs();
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
      // optimistic — reload to reconcile on failure
    }
    await loadJobs();
  }

  async function remove(id: string) {
    setJobs((prev) => (prev ? prev.filter((j) => j.id !== id) : prev));
    try {
      await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    await loadJobs();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-[14px] font-semibold text-ink-600">
        Loading your dashboard…
      </div>
    );
  }

  const openCount = jobs?.filter((j) => j.status === "open").length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* HEADER */}
      <div className="bg-white">
        <div className="mx-auto flex h-[60px] max-w-[960px] items-center justify-between px-5">
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

      <main className="mx-auto w-full max-w-[960px] flex-1 px-5 pb-16 pt-8">
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

        <div className="mt-7 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* POST A JOB */}
          <section className="self-start rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
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
                <div className="rounded-2xl bg-white p-8 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
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
                <article
                  key={job.id}
                  className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
                >
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
      </main>

      <div className="mt-auto bg-navy-deep px-6 py-5 text-center text-[12px] font-medium text-white/60">
        my-struggle.org · My Struggle is a 501(c)(3) nonprofit
      </div>
    </div>
  );
}
