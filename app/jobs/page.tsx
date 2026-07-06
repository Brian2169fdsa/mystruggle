import Link from "next/link";
import { Briefcase, MapPin } from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { db } from "../lib/store";
import type { JobPost, JobType } from "../lib/types";

export const metadata = {
  title: "Recovery-Friendly Jobs — My Struggle",
  description:
    "Fair-chance job openings from employers who hire on who you are today. Steady work for members building their next chapter.",
};

const TYPE_LABEL: Record<JobType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  temporary: "Temporary",
  contract: "Contract",
  seasonal: "Seasonal",
};

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Public board — read the store directly (the API route is the swap-seam). */
function openJobs(): JobPost[] {
  const d = db() as ReturnType<typeof db> & { jobPosts?: JobPost[] };
  return (d.jobPosts ?? [])
    .filter((j) => j.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export default function JobsPage() {
  const jobs = openJobs();

  return (
    <>
      <Nav />
      <main className="bg-canvas">
        {/* HERO */}
        <section className="mx-auto max-w-[1000px] px-5 pb-8 pt-14 lg:pt-20">
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-sky-tint px-3.5 text-[12px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
            <Briefcase className="h-4 w-4" aria-hidden /> Recovery-friendly jobs
          </span>
          <h1 className="mt-4 max-w-[640px] text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.08]">
            Fair-chance work from employers who hire on{" "}
            <span className="script text-[52px] lg:text-[62px]">who you are</span>
          </h1>
          <p className="mt-4 max-w-[560px] text-[16px]/[1.7] font-medium text-ink-600">
            Every opening here is posted by an employer who welcomes members in
            recovery. Steady hours, real pay, and a fresh start.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="tnum text-[14px] font-bold text-ink-900">
              {jobs.length} open {jobs.length === 1 ? "role" : "roles"}
            </span>
            <Link
              href="/employer"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-[13.5px] font-extrabold text-blue-primary shadow-[0_1px_3px_rgba(11,37,69,.1)] hover:bg-sky-tint"
            >
              Are you hiring? Post a job →
            </Link>
          </div>
        </section>

        {/* LIST */}
        <section className="mx-auto max-w-[1000px] px-5 pb-20">
          {jobs.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <p className="text-[15px] font-bold text-ink-900">
                No open roles right now
              </p>
              <p className="mt-1.5 text-[14px]/[1.6] font-medium text-ink-600">
                Check back soon — new fair-chance openings are posted often.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-[24px] items-center rounded-full bg-[#E8F8F0] px-2.5 text-[10.5px] font-extrabold uppercase tracking-[.06em] text-success">
                      Fair chance
                    </span>
                    <span className="text-[12px] font-semibold text-ink-400">
                      {TYPE_LABEL[job.type]}
                    </span>
                  </div>
                  <h2 className="mt-3 text-[19px]/[1.2] font-extrabold text-ink-900">
                    {job.title}
                  </h2>
                  <p className="mt-1 text-[14px] font-bold text-blue-primary">
                    {job.company}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-ink-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {job.location}
                    </span>
                    {job.payRange && (
                      <span className="text-ink-900">{job.payRange}</span>
                    )}
                  </div>
                  <p className="mt-3 flex-1 text-[13.5px]/[1.65] font-medium text-ink-600">
                    {job.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-ink-400">
                      Posted {fmtDate(job.createdAt)}
                    </span>
                    <a
                      href="mailto:info@themystruggles.com?subject=Interested%20in%20a%20job%20posting"
                      className="inline-flex h-10 items-center justify-center rounded-full bg-blue-primary px-5 text-[13px] font-extrabold text-white hover:bg-blue-hover"
                    >
                      I&apos;m interested
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
