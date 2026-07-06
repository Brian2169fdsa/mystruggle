import { NextResponse } from "next/server";
import { db, save, emitNotification, findUserById } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { JobPost } from "@/app/lib/types";

/**
 * /api/admin/employer-verifications  (staff-only)
 *
 * The employer vetting gate (docs/17, P0): fair-chance employers apply, staff
 * review, and only VERIFIED employers are visible on the public job board.
 * This route is the staff side of that gate - list applications + postings
 * awaiting review (GET), and act on them (PATCH).
 *
 * SUSPENSION GUARANTEE: the public job board (`/api/jobs` GET) only serves
 * postings whose employer profile is "verified". Setting a profile to
 * "suspended" therefore hides ALL of that employer's postings from members
 * immediately - no per-posting cleanup needed; reinstating restores them the
 * same way. Verification status is the single switch.
 */

// ── defensive store access ─────────────────────────────────────────────
// `employerProfiles` is seeded by a concurrent data agent and may be absent
// on a stale db.json - always default the array in place (same guard the
// public jobs route uses for `jobPosts`). The row shape mirrors
// docs/17 `employer_profiles`.
type EmployerProfileRow = {
  id: string;
  employerId: string; // === User.id of the employer account (role "employer")
  ein?: string;
  website?: string;
  industry?: string;
  about?: string;
  pledgeSignedAt?: number; // Fair-Chance Pledge acceptance timestamp
  verificationStatus: "pending" | "verified" | "suspended";
  verifiedBy?: string; // staff User.id who verified
  createdAt: number;
};

type VettingStore = {
  employerProfiles?: EmployerProfileRow[];
  jobPosts?: JobPost[];
};

function vettingStore() {
  const d = db() as ReturnType<typeof db> & VettingStore;
  d.employerProfiles ??= [];
  d.jobPosts ??= [];
  return d as ReturnType<typeof db> & Required<VettingStore>;
}

/** Sort key: pending applications float to the top, newest first inside each
 *  status group so fresh applications are seen quickly. */
const STATUS_ORDER: Record<EmployerProfileRow["verificationStatus"], number> = {
  pending: 0,
  verified: 1,
  suspended: 2,
};

/**
 * GET - the vetting queue.
 * { applications: [...profiles joined to their employer user, pending-first],
 *   pendingPostings: [...jobPosts in "pending_review", oldest waiting first] }
 */
export async function GET() {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json({ error: "Staff only." }, { status: 401 });
  }

  const d = vettingStore();

  const applications = d.employerProfiles
    .map((p) => {
      const employer = findUserById(p.employerId);
      return {
        profileId: p.id,
        company: employer?.company ?? "Unknown company",
        contactName: employer?.name ?? "Unknown contact",
        email: employer?.email ?? "",
        industry: p.industry,
        website: p.website,
        about: p.about,
        pledgeSignedAt: p.pledgeSignedAt,
        verificationStatus: p.verificationStatus,
        createdAt: p.createdAt,
      };
    })
    .sort(
      (a, b) =>
        STATUS_ORDER[a.verificationStatus] - STATUS_ORDER[b.verificationStatus] ||
        b.createdAt - a.createdAt
    );

  // Postings held for review before going live (docs/17 - every posting passes
  // review). Oldest first so nothing waits at the bottom of the queue.
  const pendingPostings = d.jobPosts
    .filter((j) => (j.status as string) === "pending_review")
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      createdAt: j.createdAt,
    }));

  return NextResponse.json({ applications, pendingPostings });
}

/**
 * PATCH - act on the queue. Two shapes:
 *   { profileId, action: "verify" | "suspend" | "reinstate" } -> { profile }
 *   { postingId, action: "approve" | "reject" }               -> { posting }
 */
export async function PATCH(req: Request) {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json({ error: "Staff only." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const d = vettingStore();
  const action = String((body as { action?: unknown }).action ?? "");

  // ── employer profile actions ─────────────────────────────────────────
  const profileId = (body as { profileId?: unknown }).profileId;
  if (typeof profileId === "string" && profileId) {
    const profile = d.employerProfiles.find((p) => p.id === profileId);
    if (!profile) {
      return NextResponse.json(
        { error: "Employer application not found." },
        { status: 404 }
      );
    }

    if (action === "verify") {
      profile.verificationStatus = "verified";
      profile.verifiedBy = me.id;
      save();
      // Welcome the employer into the marketplace - their postings are now
      // live on the public board (which filters on verified).
      emitNotification(
        profile.employerId,
        "system",
        "You are Fair-Chance Verified",
        "Welcome to the marketplace - your company passed review and your postings are now visible to members. Thank you for saying yes to second chances.",
        "employerProfile",
        profile.id
      );
      return NextResponse.json({ profile });
    }

    if (action === "suspend") {
      // The public job board filters on verified, so suspension hides ALL of
      // this employer's postings from members immediately - one switch, no
      // per-posting cleanup. Reinstate flips them back on the same way.
      profile.verificationStatus = "suspended";
      save();
      return NextResponse.json({ profile });
    }

    if (action === "reinstate") {
      profile.verificationStatus = "verified";
      profile.verifiedBy = me.id;
      save();
      return NextResponse.json({ profile });
    }

    return NextResponse.json(
      { error: "Unknown action for an employer profile." },
      { status: 400 }
    );
  }

  // ── posting review actions ───────────────────────────────────────────
  const postingId = (body as { postingId?: unknown }).postingId;
  if (typeof postingId === "string" && postingId) {
    const posting = d.jobPosts.find((j) => j.id === postingId);
    if (!posting) {
      return NextResponse.json(
        { error: "Posting not found." },
        { status: 404 }
      );
    }
    if ((posting.status as string) !== "pending_review") {
      return NextResponse.json(
        { error: "This posting is not awaiting review." },
        { status: 400 }
      );
    }

    if (action === "approve") {
      posting.status = "open";
      save();
      emitNotification(
        posting.employerId,
        "job",
        "Your posting is live",
        `"${posting.title}" passed review and is now on the community job board.`,
        "job",
        posting.id
      );
      // Member job-match alerts fire HERE, at approval time - the moment the
      // posting actually becomes visible (the jobs POST route holds new posts
      // in pending_review and defers alerts to this path). Best-effort and
      // capped; never blocks the approval response.
      try {
        const JOB_MATCH_CAP = 25;
        const seen = new Set<string>([posting.employerId]);
        let sent = 0;
        for (const goal of d.recoveryGoals ?? []) {
          if (sent >= JOB_MATCH_CAP) break;
          if (goal.domain !== "employment" || goal.status !== "active")
            continue;
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
            `${posting.company} posted "${posting.title}" - a recovery-friendly opening.`,
            "job",
            posting.id
          );
          sent++;
        }
      } catch {
        // Alerts are best-effort; the posting is already live.
      }
      return NextResponse.json({ posting });
    }

    if (action === "reject") {
      posting.status = "closed";
      save();
      emitNotification(
        posting.employerId,
        "job",
        "Your posting was not approved",
        `"${posting.title}" did not pass review this time. Reach out to the center team if you'd like to talk it through.`,
        "job",
        posting.id
      );
      return NextResponse.json({ posting });
    }

    return NextResponse.json(
      { error: "Unknown action for a posting." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: "Provide a profileId or postingId with an action." },
    { status: 400 }
  );
}
