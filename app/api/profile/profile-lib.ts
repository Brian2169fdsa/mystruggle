// Member-profile derivation shared by GET /api/profile and the public
// /community/u/[slug] page. Owned by the profile module (docs/13 Part A).
//
// RECOVERY CAPITAL — how the three rings are derived (Part A + Part F):
// The rings are grown ONLY from the member's own activity on the platform.
// They are NEVER a clinical score, never diagnostic, and never computed from
// BARC self-checks (those stay private to the member + supporting staff).
//
//   personal  = normalize( points + streak*10 + completedLessons*20 )
//               — courses, streaks, gamification points → personal capital
//   social    = normalize( posts+comments authored + hearts received
//               + circleMemberships*10 )
//               — community participation → social capital
//   community = normalize( goalsAchieved*30 + fundedRequests*25 + savings/10 )
//               — real-world outcomes + resources secured → community capital
//
// normalize(raw) is a saturating curve round(100 * raw / (raw + K)) so every
// ring lives in 0–100, always has room to grow, and never punishes anyone:
// raw == K is the halfway point (50%). K is tuned per ring so an engaged
// member (e.g. Danielle) shows meaningful, honest progress.

import { db } from "@/app/lib/store";
import type {
  BarcSelfCheck,
  CircleMembership,
  Post,
  ProfileDetails,
  RecoveryGoal,
  User,
} from "@/app/lib/types";

// ── defensive expansion-store access ────────────────────────────────────
// The seed/store expansion lands concurrently; never assume the arrays
// exist on an older persisted db.json. Missing arrays are created lazily.

type ExpansionDB = ReturnType<typeof db> & {
  profileDetails?: ProfileDetails[];
  barcChecks?: BarcSelfCheck[];
  circleMemberships?: CircleMembership[];
  recoveryGoals?: RecoveryGoal[];
};

export function profileDetailsStore(): ProfileDetails[] {
  const d = db() as ExpansionDB;
  if (!Array.isArray(d.profileDetails)) d.profileDetails = [];
  return d.profileDetails;
}

export function barcChecksStore(): BarcSelfCheck[] {
  const d = db() as ExpansionDB;
  if (!Array.isArray(d.barcChecks)) d.barcChecks = [];
  return d.barcChecks;
}

function circleMemberships(): CircleMembership[] {
  const d = db() as ExpansionDB;
  return Array.isArray(d.circleMemberships) ? d.circleMemberships : [];
}

function recoveryGoals(): RecoveryGoal[] {
  const d = db() as ExpansionDB;
  return Array.isArray(d.recoveryGoals) ? d.recoveryGoals : [];
}

export function detailsFor(userId: string): ProfileDetails | undefined {
  return profileDetailsStore().find((p) => p.userId === userId);
}

export function checksFor(memberId: string): BarcSelfCheck[] {
  return barcChecksStore()
    .filter((c) => c.memberId === memberId)
    .sort((a, b) => a.takenAt - b.takenAt);
}

// ── recovery capital ────────────────────────────────────────────────────

export interface RecoveryCapital {
  personal: number; // 0–100
  social: number; // 0–100
  community: number; // 0–100
}

/** Saturating 0–100 normalizer — raw === K reads as 50%. */
function normalize(raw: number, K: number): number {
  if (raw <= 0) return 0;
  return Math.round((100 * raw) / (raw + K));
}

export function deriveRecoveryCapital(member: User): RecoveryCapital {
  const d = db();

  // personal — points, streaks, learning (activity, never clinical)
  const completedLessons = d.enrollments
    .filter((e) => e.memberId === member.id)
    .reduce((sum, e) => sum + e.completedLessons.length, 0);
  const personalRaw =
    (member.points ?? 0) + (member.streak ?? 0) * 10 + completedLessons * 20;

  // social — showing up for and with the community
  let postsAuthored = 0;
  let commentsAuthored = 0;
  let heartsReceived = 0;
  for (const p of d.posts) {
    if (p.authorId === member.id) {
      postsAuthored++;
      heartsReceived += p.hearts.length;
    }
    for (const c of p.comments) if (c.authorId === member.id) commentsAuthored++;
  }
  const circles = circleMemberships().filter(
    (m) => m.memberId === member.id
  ).length;
  const socialRaw =
    postsAuthored + commentsAuthored + heartsReceived + circles * 10;

  // community — real-world outcomes and resources secured
  const goalsAchieved = recoveryGoals().filter(
    (g) => g.memberId === member.id && g.status === "achieved"
  ).length;
  const fundedRequests = d.requests.filter(
    (r) => r.memberId === member.id && r.status === "funded"
  ).length;
  const savings = member.balances?.savings ?? 0;
  const communityRaw = goalsAchieved * 30 + fundedRequests * 25 + savings / 10;

  return {
    personal: normalize(personalRaw, 350),
    social: normalize(socialRaw, 25),
    community: normalize(communityRaw, 40),
  };
}

// ── milestones (member-chosen visibility, all celebration — no clinical) ─

export interface ProfileMilestones {
  level: string;
  bestStreak: number;
  goalsAchieved: number;
  coursesCompleted: number;
}

export function deriveMilestones(member: User): ProfileMilestones {
  const d = db();
  const courseById = new Map(d.courses.map((c) => [c.id, c]));
  const coursesCompleted = d.enrollments.filter((e) => {
    if (e.memberId !== member.id) return false;
    const course = courseById.get(e.courseId);
    return !!course && e.completedLessons.length >= course.lessonCount;
  }).length;
  return {
    level: member.level ?? "Bronze",
    bestStreak: member.streak ?? 0,
    goalsAchieved: recoveryGoals().filter(
      (g) => g.memberId === member.id && g.status === "achieved"
    ).length,
    coursesCompleted,
  };
}

// ── public profile projection ───────────────────────────────────────────

/** A post as shown read-only on the public profile (approved, non-circle). */
export type ProfilePost = Pick<
  Post,
  | "id"
  | "authorName"
  | "authorRole"
  | "avatarColor"
  | "body"
  | "kind"
  | "topic"
  | "createdAt"
> & { hearts: number; comments: number };

export interface PublicProfile {
  name: string;
  slug: string;
  avatarColor: string;
  memberNumber: string;
  tagline?: string;
  journeySince?: string;
  interests: string[];
  level: string;
  /** null when the member keeps milestones private */
  milestones: ProfileMilestones | null;
  /** null unless the member opted their rings public */
  recoveryCapital: RecoveryCapital | null;
  posts: ProfilePost[];
  /** true when the member has a public giving page at /p/[slug] */
  hasGivingPage: boolean;
}

/**
 * Consent-first public projection (same pattern as /api/members/[slug]):
 * a profile only exists publicly when the member has BOTH consented to a
 * public presence AND created profile details. Everything inside is then
 * gated block-by-block by their own toggles. Otherwise → null.
 */
export function buildPublicProfile(member: User | undefined): PublicProfile | null {
  if (!member || member.role !== "member") return null;
  if (!member.consentPublic || !member.slug || !member.memberNumber) return null;
  const details = detailsFor(member.id);
  if (!details) return null;

  const posts: ProfilePost[] = db()
    .posts.filter(
      (p) =>
        p.authorId === member.id &&
        p.status === "approved" &&
        // circle posts stay inside their circle (field lands with Part B)
        !(p as Post & { circleId?: string }).circleId
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      authorName: p.authorName,
      authorRole: p.authorRole,
      avatarColor: p.avatarColor,
      body: p.body,
      kind: p.kind,
      topic: p.topic,
      createdAt: p.createdAt,
      hearts: p.hearts.length,
      comments: p.comments.length,
    }));

  return {
    name: member.name,
    slug: member.slug,
    avatarColor: member.avatarColor,
    memberNumber: member.memberNumber,
    tagline: details.tagline || undefined,
    journeySince: details.journeySince || undefined,
    interests: details.interests ?? [],
    level: member.level ?? "Bronze",
    milestones: details.showMilestones ? deriveMilestones(member) : null,
    recoveryCapital: details.recoveryCapitalPublic
      ? deriveRecoveryCapital(member)
      : null,
    posts,
    hasGivingPage: !!member.consentPublic && !!member.slug,
  };
}
