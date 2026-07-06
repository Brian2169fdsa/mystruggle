import { NextResponse } from "next/server";
import { db, save } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { JobPost } from "@/app/lib/types";

type JobStore = { jobPosts?: JobPost[] };

function jobStore() {
  const d = db() as ReturnType<typeof db> & JobStore;
  d.jobPosts ??= [];
  return d as ReturnType<typeof db> & Required<JobStore>;
}

/** Owner-only lookup: the job must belong to the signed-in employer. */
async function ownedJob(id: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "employer") {
    return { error: "Sign in as an employer first.", status: 401 as const };
  }
  const job = jobStore().jobPosts.find((j) => j.id === id);
  if (!job || job.employerId !== user.id) {
    return { error: "Job not found.", status: 404 as const };
  }
  return { job };
}

/** PATCH - owner-only: close or reopen a post. Body { status: "open"|"closed" }. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const found = await ownedJob(id);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }
  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (status !== "open" && status !== "closed") {
    return NextResponse.json(
      { error: "status must be \"open\" or \"closed\"." },
      { status: 400 }
    );
  }
  found.job.status = status;
  save();
  return NextResponse.json({ job: found.job });
}

/** DELETE - owner-only: remove a post entirely. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const found = await ownedJob(id);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }
  const d = jobStore();
  d.jobPosts = d.jobPosts.filter((j) => j.id !== id);
  save();
  return NextResponse.json({ ok: true });
}
