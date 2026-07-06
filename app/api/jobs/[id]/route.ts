import { NextResponse } from "next/server";
import { db, save, emitNotification } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { JobPost } from "@/app/lib/types";

// ── defensive store access (mirrors /api/jobs) ─────────────────────────
// The docs/17 expansion (statuses beyond open/closed, employer profiles) may
// land from a concurrent seed pass - everything new is typed locally.

type PostingStatus =
  | "draft"
  | "pending_review"
  | "open"
  | "paused"
  | "filled"
  | "closed";

type Posting = Omit<JobPost, "status"> & {
  status: PostingStatus;
  metro?: string;
  remote?: boolean;
  payMinCents?: number;
  payMaxCents?: number;
  requirements?: string;
  benefits?: string;
  fairChanceNotes?: string;
};

type JobStore = Omit<ReturnType<typeof db>, "jobPosts"> & {
  jobPosts: Posting[];
};

function jobStore(): JobStore {
  const d = db() as unknown as JobStore;
  d.jobPosts ??= [];
  return d;
}

const STATUSES: PostingStatus[] = [
  "draft",
  "pending_review",
  "open",
  "paused",
  "filled",
  "closed",
];

/** Employer lifecycle moves (docs/17). closed → open is kept from the
 *  pre-expansion board so the dashboard's existing "Reopen role" keeps
 *  working for roles the employer closed themselves. */
const OWNER_TRANSITIONS: Partial<Record<PostingStatus, PostingStatus[]>> = {
  open: ["paused", "filled", "closed"],
  paused: ["open"],
  closed: ["open"],
};

/** Staff moderation moves: approve a pending posting or reject it. */
const STAFF_TRANSITIONS: Partial<Record<PostingStatus, PostingStatus[]>> = {
  pending_review: ["open", "closed"],
};

/**
 * Job-match alerts - fire when a posting actually goes LIVE (staff approval),
 * not at create time, since new postings wait in pending_review. Audience:
 * members with an ACTIVE employment recovery goal, capped at 25. Non-fatal.
 */
function notifyJobMatches(job: Posting) {
  try {
    const JOB_MATCH_CAP = 25;
    const d = db();
    const seen = new Set<string>([job.employerId]); // never notify the poster
    let sent = 0;
    for (const goal of d.recoveryGoals) {
      if (sent >= JOB_MATCH_CAP) break;
      if (goal.domain !== "employment" || goal.status !== "active") continue;
      if (seen.has(goal.memberId)) continue;
      const member = d.users.find(
        (u) => u.id === goal.memberId && u.role === "member"
      );
      if (!member) continue;
      seen.add(member.id);
      emitNotification(
        member.id,
        "job",
        "New job posted",
        `${job.company} posted "${job.title}" - a recovery-friendly opening.`,
        "job",
        job.id
      );
      sent++;
    }
  } catch {
    // Notifications are best-effort; the status change already happened.
  }
}

/**
 * PATCH - posting lifecycle. Body { status: PostingStatus }.
 * - Owner (the posting employer): open → paused/filled/closed, paused → open,
 *   closed → open (legacy reopen).
 * - Staff: approve pending_review → open (fires member job-match alerts and
 *   notifies the employer) or reject pending_review → closed.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const job = jobStore().jobPosts.find((j) => j.id === id);
  const isStaff = user.role === "staff";
  const isOwner =
    !!job && user.role === "employer" && job.employerId === user.id;
  if (!job || (!isOwner && !isStaff)) {
    // Non-owners get the same 404 as a missing id - postings aren't
    // enumerable across employer accounts.
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const next = String(body?.status ?? "") as PostingStatus;
  if (!STATUSES.includes(next)) {
    return NextResponse.json(
      { error: "That isn't a posting status we recognize." },
      { status: 400 }
    );
  }

  const allowed =
    (isOwner && (OWNER_TRANSITIONS[job.status] ?? []).includes(next)) ||
    (isStaff && (STAFF_TRANSITIONS[job.status] ?? []).includes(next));
  if (!allowed) {
    return NextResponse.json(
      { error: `Can't move this posting from ${job.status} to ${next}.` },
      { status: 400 }
    );
  }

  const wasPending = job.status === "pending_review";
  job.status = next;
  save();

  // Staff approval side effects: tell the employer, alert matched members.
  if (isStaff && wasPending) {
    if (next === "open") {
      emitNotification(
        job.employerId,
        "job",
        "Your posting is live",
        `"${job.title}" passed review and is now on the job board.`,
        "job",
        job.id
      );
      notifyJobMatches(job);
    } else {
      emitNotification(
        job.employerId,
        "job",
        "Posting needs changes",
        `"${job.title}" didn't pass review. Reach out and we'll help you get it listed.`,
        "job",
        job.id
      );
    }
  }

  return NextResponse.json({ job });
}

/** DELETE - owner-only: remove a post entirely. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user || user.role !== "employer") {
    return NextResponse.json(
      { error: "Sign in as an employer first." },
      { status: 401 }
    );
  }
  const d = jobStore();
  const job = d.jobPosts.find((j) => j.id === id);
  if (!job || job.employerId !== user.id) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  d.jobPosts = d.jobPosts.filter((j) => j.id !== id);
  save();
  return NextResponse.json({ ok: true });
}
