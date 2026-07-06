import { NextResponse } from "next/server";
import {
  db,
  save,
  findUserById,
  emitContinuumEvent,
  emitNotification,
} from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type {
  GoalMilestone,
  JobApplication,
  JobPost,
  RecoveryGoal,
  Resume,
  ResumeSection,
} from "@/app/lib/types";

/**
 * /api/employer/pipeline - the employer-side candidate pipeline (docs/17).
 *
 * GET   → { postings, candidates, profile } scoped to the signed-in
 *         employer's OWN postings only.
 * PATCH → { candidateId, stage?, employerNotes? } - move a candidate through
 *         the pipeline and/or save private employer notes. Every stage change
 *         notifies the member; "hired" also fires the continuum + goal hooks.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HARD PRIVACY WALL (P0 - docs/17 "privacy-first"):
 * The employer payload contains ONLY what a fair-chance employer needs to
 * evaluate a candidate: chosen FIRST NAME, the resume projection, the
 * application note, and pipeline state. It NEVER includes:
 *   - memberId (stays server-side only, used for lookups and hooks)
 *   - memberNumber, slug, or any giving-page identifier
 *   - center / centerId, care phase, journey, or level
 *   - continuum events, BARC self-checks, or any community activity
 *   - balances, points, streak, or any gamification data
 *   - email or phone (unless the member typed it into their own resume
 *     content - the resume is the member's document, in their words)
 * Membership in the community is inherently visible by context; everything
 * else about the member's recovery is structurally absent from this API.
 * ══════════════════════════════════════════════════════════════════════
 */

// ── local shapes for the concurrently-seeded expansion tables ──────────
// The data workstream adds postingCandidates (and friends) to the store in
// parallel - mirror the agreed shape locally and default the arrays in
// place so both orders of arrival work (same pattern as /api/resumes).

export type CandidateStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "closed";

const STAGES: CandidateStage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "closed",
];

interface PostingCandidate {
  id: string;
  postingId: string;
  jobApplicationId: string;
  memberId: string; // SERVER-SIDE ONLY - never serialized to the employer
  stage: CandidateStage;
  stageChangedAt: number;
  employerNotes?: string;
  createdAt: number;
}

type PipelineStore = {
  jobPosts?: JobPost[];
  jobApplications?: JobApplication[];
  postingCandidates?: PostingCandidate[];
  resumes?: Resume[];
  resumeSections?: ResumeSection[];
  recoveryGoals?: RecoveryGoal[];
  goalMilestones?: GoalMilestone[];
  employerProfiles?: Array<Record<string, unknown>>;
};

function store() {
  const d = db() as ReturnType<typeof db> & PipelineStore;
  d.jobPosts ??= [];
  d.jobApplications ??= [];
  d.postingCandidates ??= [];
  d.resumes ??= [];
  d.resumeSections ??= [];
  d.recoveryGoals ??= [];
  d.goalMilestones ??= [];
  d.employerProfiles ??= [];
  return d as ReturnType<typeof db> & Required<PipelineStore>;
}

/** First name ONLY - enforced even if a full name ever lands in User.name. */
function firstNameOnly(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Public-safe resume projection. Deliberately drops fullName and the
 *  structured contact block (phone/email/city) - the employer sees the
 *  member's headline, summary, and sections, nothing routable. */
function resumeProjection(memberId: string) {
  const d = store();
  const resume =
    d.resumes.find((r) => r.memberId === memberId && r.isPrimary) ??
    d.resumes.find((r) => r.memberId === memberId);
  if (!resume) return null;
  const sections = d.resumeSections
    .filter((s) => s.resumeId === resume.id)
    .sort((a, b) => a.sort - b.sort)
    .map((s) => ({ kind: s.kind, content: s.content }));
  return {
    headline: resume.headline,
    summary: resume.summary,
    sections,
  };
}

/** The employer's own profile row (concurrent workstream) - safe pick. */
function profileFor(employerId: string) {
  // The canonical EmployerProfile keys the employer by `employerId`; the
  // legacy orgId/userId probes are kept as any-casts for older db.json rows.
  const p = store().employerProfiles.find(
    (row) =>
      row.employerId === employerId ||
      (row as { orgId?: string }).orgId === employerId ||
      (row as { userId?: string }).userId === employerId
  );
  if (!p) return null;
  return {
    ein: typeof p.ein === "string" ? p.ein : undefined,
    website: typeof p.website === "string" ? p.website : undefined,
    industry: typeof p.industry === "string" ? p.industry : undefined,
    about: typeof p.about === "string" ? p.about : undefined,
    pledgeSignedAt:
      typeof p.pledgeSignedAt === "number" ? p.pledgeSignedAt : undefined,
    verificationStatus:
      typeof p.verificationStatus === "string"
        ? p.verificationStatus
        : undefined,
  };
}

/** Serialize one candidate for the employer. THE privacy wall lives here:
 *  every field is allow-listed; memberId is consumed for lookups and never
 *  written into the output object. */
function candidateView(c: PostingCandidate) {
  const d = store();
  const member = findUserById(c.memberId);
  const application = d.jobApplications.find(
    (a) => a.id === c.jobApplicationId
  );
  return {
    id: c.id,
    postingId: c.postingId,
    stage: c.stage,
    stageChangedAt: c.stageChangedAt,
    chosenName: member ? firstNameOnly(member.name) : "Member",
    appliedAt: application?.createdAt ?? c.createdAt,
    note: application?.notes,
    resume: resumeProjection(c.memberId),
    employerNotes: c.employerNotes,
    // NOTHING ELSE. No memberId, memberNumber, slug, center, email,
    // balances, journey, continuum, or community data - ever.
  };
}

async function requireEmployer() {
  // Employers must hold the employer role themselves - getRoleUser() lets
  // staff pass every gate, which is wrong here (staff own no postings and
  // this is an employer-scoped surface), so check the role directly.
  const user = await getSessionUser();
  if (!user || user.role !== "employer") return null;
  return user;
}

// ── GET - the employer's pipeline board ────────────────────────────────
export async function GET() {
  const user = await requireEmployer();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in as an employer first." },
      { status: 401 }
    );
  }
  const d = store();
  const own = d.jobPosts.filter((j) => j.employerId === user.id);
  const ownIds = new Set(own.map((j) => j.id));
  const candidates = d.postingCandidates
    .filter((c) => ownIds.has(c.postingId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(candidateView);

  return NextResponse.json({
    postings: own.map((j) => ({ id: j.id, title: j.title, status: j.status })),
    candidates,
    profile: profileFor(user.id),
  });
}

// ── stage-change notifications (kind "job", warm and dignified) ────────
function stageNotification(
  stage: CandidateStage,
  posting: JobPost
): { title: string; body: string } {
  const at = `${posting.title} at ${posting.company}`;
  switch (stage) {
    case "screening":
      return {
        title: "Application update",
        body: `Your application moved to screening for ${at}. They are taking a real look.`,
      };
    case "interview":
      return {
        title: "Interview stage - you have got this",
        body: `${posting.company} wants to interview you for ${posting.title}. Take a breath, show up as yourself. You have got this.`,
      };
    case "offer":
      return {
        title: "You have an offer waiting",
        body: `${posting.company} has an offer waiting for you for ${posting.title}. Go see it - this is real.`,
      };
    case "hired":
      return {
        title: "You are HIRED!",
        body: `You are HIRED at ${posting.company}! Want to share the win with the community?`,
      };
    case "closed":
      return {
        title: "Not this time - and that is okay",
        body: `${posting.company} went another way for ${posting.title}. That is not a verdict on you. Every application builds the muscle, and the right yes is still out there. Keep going - we are with you.`,
      };
    default:
      return {
        title: "Application update",
        body: `Your application for ${at} is back in the applied stage.`,
      };
  }
}

/** Hired = community capital. Advance the member's active employment-domain
 *  recovery goal by marking its next unfinished milestone done. Defensive:
 *  the goal tables belong to a concurrent workstream and may be empty. */
function advanceEmploymentGoal(memberId: string) {
  const d = store();
  const goal = d.recoveryGoals.find(
    (g) =>
      g.memberId === memberId &&
      g.domain === "employment" &&
      g.status === "active"
  );
  if (!goal) return;
  const next = d.goalMilestones
    .filter((m) => m.goalId === goal.id && !m.done)
    .sort((a, b) => a.sort - b.sort)[0];
  if (next) next.done = true;
}

// ── PATCH - move a candidate / save employer notes ─────────────────────
export async function PATCH(req: Request) {
  const user = await requireEmployer();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in as an employer first." },
      { status: 401 }
    );
  }
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.candidateId !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const d = store();
  const candidate = d.postingCandidates.find((c) => c.id === body.candidateId);
  const posting =
    candidate && d.jobPosts.find((j) => j.id === candidate.postingId);
  // Ownership gate: the posting must belong to THIS employer. A missing
  // candidate and someone else's candidate both read as "not found" so the
  // API leaks nothing about other employers' pipelines.
  if (!candidate || !posting || posting.employerId !== user.id) {
    return NextResponse.json(
      { error: "Candidate not found." },
      { status: 404 }
    );
  }

  // Private employer notes (never shown to the member).
  if (typeof body.employerNotes === "string") {
    candidate.employerNotes = body.employerNotes.slice(0, 2000);
  }

  // Stage move + member notification + hired hooks.
  if (body.stage !== undefined) {
    const stage = body.stage as CandidateStage;
    if (!STAGES.includes(stage)) {
      return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
    }
    if (stage !== candidate.stage) {
      candidate.stage = stage;
      candidate.stageChangedAt = Date.now();

      // Every stage change tells the member where they stand (kind "job").
      const note = stageNotification(stage, posting);
      emitNotification(
        candidate.memberId,
        "job",
        note.title,
        note.body,
        "posting_candidate",
        candidate.id
      );

      if (stage === "hired") {
        // Hired is the strongest community-capital signal on the platform:
        // (a) one continuum heartbeat row (source "goal" - the same source
        //     the recovery-goal milestone flow writes; docs/17 "Hired writes
        //     continuum_events (source goal, employment)");
        // (b) advance the member's active employment recovery goal;
        // (c) posting status stays employer-managed - no auto "filled";
        // (d) the hired notification above already invites the member to
        //     share the win - consent-first, never an auto-post.
        emitContinuumEvent(candidate.memberId, "goal", 4, candidate.id);
        advanceEmploymentGoal(candidate.memberId);
      }
    }
  }

  save();
  return NextResponse.json({ candidate: candidateView(candidate) });
}
