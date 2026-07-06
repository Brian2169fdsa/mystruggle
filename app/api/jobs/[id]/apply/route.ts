import { NextResponse } from "next/server";
import { db, save, uid, emitNotification } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { JobApplication, JobPost, Resume, User } from "@/app/lib/types";

/**
 * POST /api/jobs/[id]/apply - one-tap "Apply with my resume" (docs/17).
 *
 * Body: { note?: string, consentDisclosure?: boolean }
 *
 * FIRST-APPLY CONSENT: applying through the platform inherently reveals
 * community membership to the employer. The first time a member applies
 * (user.jobConsentAt unset) the API answers 428 { needsConsent, disclosure }
 * until the client re-sends with consentDisclosure: true - the consent screen
 * from docs/17, with "export your resume and apply externally" always offered.
 *
 * With consent: stamps user.jobConsentAt, creates a jobApplications row (the
 * member's existing tracker - postingId links it to the posting), a
 * postingCandidates row at stage "applied" (the employer's pipeline), and
 * notifies the employer. The existing job tracker emits no continuum events
 * on apply, so neither do we - "hired" is the continuum moment, not "applied".
 */

// ── defensive store access (concurrent docs/17 seed pass) ──────────────

type PostingStatus =
  | "draft"
  | "pending_review"
  | "open"
  | "paused"
  | "filled"
  | "closed";

type Posting = Omit<JobPost, "status"> & { status: PostingStatus };

type EmployerProfile = {
  employerId: string;
  verificationStatus: "pending" | "verified" | "suspended";
};

type CandidateStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "closed";

type PostingCandidate = {
  id: string;
  postingId: string;
  jobApplicationId: string;
  memberId: string;
  stage: CandidateStage;
  stageChangedAt: number;
  createdAt: number;
};

type TrackedApplication = JobApplication & { postingId?: string };
type ConsentingUser = User & { jobConsentAt?: number };

type ApplyStore = Omit<
  ReturnType<typeof db>,
  "jobPosts" | "jobApplications" | "resumes"
> & {
  jobPosts: Posting[];
  jobApplications: TrackedApplication[];
  postingCandidates?: PostingCandidate[];
  employerProfiles?: EmployerProfile[];
  resumes?: Resume[];
};

function applyStore() {
  const d = db() as unknown as ApplyStore;
  d.jobPosts ??= [];
  d.jobApplications ??= [];
  d.postingCandidates ??= [];
  return d as ApplyStore & { postingCandidates: PostingCandidate[] };
}

const DISCLOSURE =
  "Applying through My Struggle shares your chosen name, your resume, and your note with this employer. It also lets them know you are part of a recovery community. You can always export your resume and apply outside the platform instead.";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = (await getSessionUser()) as ConsentingUser | null;
  if (!user || user.role !== "member") {
    return NextResponse.json(
      { error: "Sign in as a member to apply." },
      { status: 401 }
    );
  }

  const d = applyStore();
  const job = d.jobPosts.find((j) => j.id === id);

  // Only postings the public board shows are appliable: open, and from a
  // verified employer once employerProfiles is seeded (same fallback as GET).
  const profiles = d.employerProfiles ?? [];
  const employerVisible =
    profiles.length === 0 ||
    profiles.some(
      (p) => p.employerId === job?.employerId && p.verificationStatus === "verified"
    );
  if (!job || job.status !== "open" || !employerVisible) {
    return NextResponse.json(
      { error: "This role isn't open for applications right now." },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const note =
    typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const consentDisclosure = body?.consentDisclosure === true;

  // ── duplicate guard (before consent, so the screen isn't shown twice) ──
  const already =
    d.postingCandidates.some(
      (c) => c.postingId === job.id && c.memberId === user.id
    ) ||
    d.jobApplications.some(
      (a) => a.memberId === user.id && a.postingId === job.id
    );
  if (already) {
    return NextResponse.json(
      {
        error:
          "You've already applied to this role - it's in your plan under job tracking. Hang tight, the employer can see it.",
      },
      { status: 409 }
    );
  }

  // ── first-apply consent gate ──────────────────────────────────────────
  if (!user.jobConsentAt && !consentDisclosure) {
    return NextResponse.json(
      { needsConsent: true, disclosure: DISCLOSURE },
      { status: 428 }
    );
  }
  if (!user.jobConsentAt) {
    user.jobConsentAt = Date.now();
  }

  // Resume attached? Applying without one is allowed - the application just
  // says so, and the member can build one at /resume any time.
  const resumeAttached = (d.resumes ?? []).some(
    (r) => r.memberId === user.id
  );
  const noteParts = [note || undefined];
  if (!resumeAttached) {
    noteParts.push("(Applied without a resume on file yet.)");
  }

  const now = Date.now();
  const application: TrackedApplication = {
    id: uid(),
    memberId: user.id,
    company: job.company,
    role: job.title,
    status: "applied",
    notes: noteParts.filter(Boolean).join(" ") || undefined,
    createdAt: now,
    postingId: job.id,
  };
  d.jobApplications.push(application);

  const candidate: PostingCandidate = {
    id: uid(),
    postingId: job.id,
    jobApplicationId: application.id,
    memberId: user.id,
    stage: "applied",
    stageChangedAt: now,
    createdAt: now,
  };
  d.postingCandidates.push(candidate);
  save();

  emitNotification(
    job.employerId,
    "job",
    "New candidate",
    `Someone applied to ${job.title}.`,
    "job",
    job.id
  );

  return NextResponse.json({
    application,
    candidate,
    resumeAttached,
    message: "Application sent - you can track it in your plan.",
  });
}
