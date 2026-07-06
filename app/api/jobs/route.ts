import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { JOB_TYPES, type JobPost, type JobType } from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
// jobPosts may be absent on a stale db.json loaded before seed v10 - always
// default the array in place (same guard the job-applications route uses).
// The employer-platform expansion (docs/17) lands employerProfiles, savedJobs,
// and the widened posting shape from a CONCURRENT seed pass - everything new
// is typed locally and accessed defensively so both orders of arrival work.

/** Posting lifecycle (docs/17): draft → pending_review → open ⇄ paused,
 *  → filled/closed. Legacy rows carry "open"/"closed" and keep working. */
type PostingStatus =
  | "draft"
  | "pending_review"
  | "open"
  | "paused"
  | "filled"
  | "closed";

/** JobPost + the docs/17 expansion fields (all optional - legacy posts have
 *  none of them). Typed as an intersection over the canonical JobPost so the
 *  store type can widen underneath us without a conflict. */
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

type EmployerProfile = {
  employerId: string;
  verificationStatus: "pending" | "verified" | "suspended";
};

type SavedJob = {
  id: string;
  memberId: string;
  postingId: string;
  savedAt: number;
};

/** The store with the docs/17 tables typed locally. Keys we widen are Omitted
 *  from the canonical DB shape first so the intersection can't re-narrow them
 *  (e.g. legacy JobPost.status pinning out "pending_review"). */
type JobStore = Omit<
  ReturnType<typeof db>,
  "jobPosts" | "employerProfiles" | "savedJobs"
> & {
  jobPosts: Posting[];
  employerProfiles?: EmployerProfile[];
  savedJobs?: SavedJob[];
};

function jobStore(): JobStore {
  const d = db() as unknown as JobStore;
  d.jobPosts ??= [];
  return d;
}

/** Public projection of a job - no internal ids beyond what the board needs. */
function publicJob(j: Posting) {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    metro: j.metro,
    remote: j.remote === true,
    type: j.type,
    payRange: j.payRange,
    payMinCents: j.payMinCents,
    payMaxCents: j.payMaxCents,
    description: j.description,
    requirements: j.requirements,
    benefits: j.benefits,
    fairChanceNotes: j.fairChanceNotes,
    recoveryFriendly: j.recoveryFriendly,
    status: j.status,
    createdAt: j.createdAt,
  };
}

/**
 * The verified-employer visibility gate (docs/17 P0). A posting is public only
 * when its employer holds a VERIFIED employer profile. Defensive fallback: if
 * the employerProfiles table hasn't been seeded yet (missing or empty), every
 * open posting stays visible - the pre-expansion behavior - so nothing on the
 * board or the community RightRail breaks before the concurrent seed lands.
 */
function verifiedEmployerFilter(
  d: ReturnType<typeof jobStore>
): (j: Posting) => boolean {
  const profiles = d.employerProfiles ?? [];
  if (profiles.length === 0) return () => true;
  const verified = new Set(
    profiles
      .filter((p) => p.verificationStatus === "verified")
      .map((p) => p.employerId)
  );
  return (j) => verified.has(j.employerId);
}

/**
 * GET - the public job board: open postings from verified employers, newest
 * first. Query filters: ?metro= (exact, case-insensitive), ?type= (JobType),
 * ?remote=1, ?q= (title/company text). When the viewer is a signed-in member,
 * each job carries `saved: true|false` for the board's heart toggle.
 * `?mine=1` (employer-only) returns that employer's own posts in ALL statuses
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

  const metro = (url.searchParams.get("metro") ?? "").trim().toLowerCase();
  const type = (url.searchParams.get("type") ?? "").trim();
  const remote = url.searchParams.get("remote") === "1";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const isVerified = verifiedEmployerFilter(d);
  let open = d.jobPosts.filter((j) => j.status === "open" && isVerified(j));

  if (metro) {
    open = open.filter((j) => (j.metro ?? "").toLowerCase() === metro);
  }
  if (type && (JOB_TYPES as string[]).includes(type)) {
    open = open.filter((j) => j.type === type);
  }
  if (remote) {
    open = open.filter((j) => j.remote === true);
  }
  if (q) {
    open = open.filter(
      (j) =>
        j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
    );
  }

  // Saved-state decoration for signed-in members (additive - the community
  // RightRail Hiring card and any other {jobs} consumer keep working).
  const user = await getSessionUser();
  const savedIds =
    user && user.role === "member"
      ? new Set(
          (d.savedJobs ?? [])
            .filter((s) => s.memberId === user.id)
            .map((s) => s.postingId)
        )
      : null;

  const jobs = open
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((j) => ({
      ...publicJob(j),
      saved: savedIds ? savedIds.has(j.id) : false,
    }));
  return NextResponse.json({ jobs });
}

// ── inline content screen (docs/17 moderation gate) ────────────────────
// Obvious predatory patterns are rejected at the door with a warm message;
// everything else waits in pending_review for staff approval. This is the
// keyword tier of the moderation review - staff are the human tier.
const PREDATORY_PATTERNS: RegExp[] = [
  /commission[\s-]?only/i,
  /\bmlm\b/i,
  /multi[\s-]?level\s+marketing/i,
  /\bdownline\b/i,
  /recruit\s+your\s+(friends|family|network)/i,
  /pay\s+to\s+start/i,
  /startup\s+fee/i,
  /pay\s+for\s+your\s+own\s+(training|starter|kit)/i,
  /cash\s+only[,\s]*under\s+the\s+table/i,
  /under[\s-]the[\s-]table/i,
  /no\s+questions\s+asked\s+cash/i,
];

function failsContentScreen(text: string): boolean {
  return PREDATORY_PATTERNS.some((re) => re.test(text));
}

/**
 * POST - employer-only: create a job posting. New postings start in
 * "pending_review" and go live only after staff approval (the PATCH route) -
 * the docs/17 moderation gate. Member job-match alerts fire at approval time,
 * when the posting actually becomes visible, not here.
 */
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

  // docs/17 posting fields - all optional, employer's words.
  const metro = String(body.metro ?? "").trim();
  const remote = body.remote === true || body.remote === "1";
  const requirements = String(body.requirements ?? "").trim();
  const benefits = String(body.benefits ?? "").trim();
  const fairChanceNotes = String(body.fairChanceNotes ?? "").trim();
  const cents = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  };
  const payMinCents = cents(body.payMinCents);
  const payMaxCents = cents(body.payMaxCents);

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

  // Inline content screen - warm rejection, no posting created.
  const screened = [title, description, requirements, benefits, payRange].join(
    "\n"
  );
  if (failsContentScreen(screened)) {
    return NextResponse.json(
      {
        error:
          "This posting doesn't fit our fair-chance board. We can't list commission-only, pay-to-start, or off-the-books roles - our members are rebuilding, and they need steady, honest work. If you think this was flagged in error, reach out and a real person will take a look.",
      },
      { status: 400 }
    );
  }

  const job: Posting = {
    id: uid(),
    employerId: user.id,
    title,
    company,
    location,
    type,
    payRange: payRange || undefined,
    description,
    recoveryFriendly: true,
    status: "pending_review",
    createdAt: Date.now(),
    metro: metro || undefined,
    remote: remote || undefined,
    payMinCents,
    payMaxCents,
    requirements: requirements || undefined,
    benefits: benefits || undefined,
    fairChanceNotes: fairChanceNotes || undefined,
  };
  jobStore().jobPosts.push(job);
  save();

  return NextResponse.json({
    job,
    message:
      "Thanks - your posting is in review. Our team checks every listing before it goes live, usually within a day.",
  });
}
