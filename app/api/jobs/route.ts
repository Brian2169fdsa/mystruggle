import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { JOB_TYPES, type JobPost, type JobType } from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
// jobPosts may be absent on a stale db.json loaded before seed v10 — always
// default the array in place (same guard the job-applications route uses).
type JobStore = { jobPosts?: JobPost[] };

function jobStore() {
  const d = db() as ReturnType<typeof db> & JobStore;
  d.jobPosts ??= [];
  return d as ReturnType<typeof db> & Required<JobStore>;
}

/** Public projection of a job — no internal ids beyond what the board needs. */
function publicJob(j: JobPost) {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    type: j.type,
    payRange: j.payRange,
    description: j.description,
    recoveryFriendly: j.recoveryFriendly,
    status: j.status,
    createdAt: j.createdAt,
  };
}

/**
 * GET — the public job board: open jobs, newest first.
 * `?mine=1` (employer-only) returns that employer's own posts, open + closed,
 * for the dashboard.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";
  const d = jobStore();

  if (mine) {
    const user = await getSessionUser();
    if (!user || user.role !== "employer") {
      return NextResponse.json(
        { error: "Sign in as an employer first." },
        { status: 401 }
      );
    }
    const jobs = d.jobPosts
      .filter((j) => j.employerId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ jobs });
  }

  const jobs = d.jobPosts
    .filter((j) => j.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(publicJob);
  return NextResponse.json({ jobs });
}

/** POST — employer-only: create a job opening (starts open). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "employer") {
    return NextResponse.json(
      { error: "Sign in as an employer first." },
      { status: 401 }
    );
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const location = String(body.location ?? "").trim();
  const description = String(body.description ?? "").trim();
  const rawType = String(body.type ?? "");
  const type: JobType = (JOB_TYPES as string[]).includes(rawType)
    ? (rawType as JobType)
    : "full-time";
  const payRange = String(body.payRange ?? "").trim();
  // company defaults to the employer's own company; allow an override.
  const company = String(body.company ?? user.company ?? "").trim();

  if (!title || !location || !description) {
    return NextResponse.json(
      { error: "Title, location, and description are required." },
      { status: 400 }
    );
  }
  if (!company) {
    return NextResponse.json(
      { error: "Add your company name to your account first." },
      { status: 400 }
    );
  }

  const job: JobPost = {
    id: uid(),
    employerId: user.id,
    title,
    company,
    location,
    type,
    payRange: payRange || undefined,
    description,
    recoveryFriendly: true,
    status: "open",
    createdAt: Date.now(),
  };
  jobStore().jobPosts.push(job);
  save();
  return NextResponse.json({ job });
}
