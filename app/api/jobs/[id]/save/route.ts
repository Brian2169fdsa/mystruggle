import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { JobPost } from "@/app/lib/types";

/**
 * POST /api/jobs/[id]/save - member-only saved-jobs toggle (docs/17).
 * Body: { save: boolean }. Idempotent both directions: saving an already
 * saved job or unsaving an unsaved one is a quiet success.
 * Response: { saved: boolean }.
 */

type PostingStatus =
  | "draft"
  | "pending_review"
  | "open"
  | "paused"
  | "filled"
  | "closed";

type Posting = Omit<JobPost, "status"> & { status: PostingStatus };

type SavedJob = {
  id: string;
  memberId: string;
  postingId: string;
  savedAt: number;
};

type SaveStore = Omit<ReturnType<typeof db>, "jobPosts" | "savedJobs"> & {
  jobPosts: Posting[];
  savedJobs?: SavedJob[];
};

function saveStore() {
  const d = db() as unknown as SaveStore;
  d.jobPosts ??= [];
  d.savedJobs ??= [];
  return d as SaveStore & { savedJobs: SavedJob[] };
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json(
      { error: "Sign in as a member to save jobs." },
      { status: 401 }
    );
  }

  const d = saveStore();
  const job = d.jobPosts.find((j) => j.id === id);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.save !== "boolean") {
    return NextResponse.json(
      { error: "Send { save: true } or { save: false }." },
      { status: 400 }
    );
  }

  const existing = d.savedJobs.find(
    (s) => s.memberId === user.id && s.postingId === job.id
  );

  if (body.save && !existing) {
    d.savedJobs.push({
      id: uid(),
      memberId: user.id,
      postingId: job.id,
      savedAt: Date.now(),
    });
    save();
  } else if (!body.save && existing) {
    d.savedJobs = d.savedJobs.filter(
      (s) => !(s.memberId === user.id && s.postingId === job.id)
    );
    save();
  }

  return NextResponse.json({ saved: body.save });
}
