// Shared platform types — the contract between the API and every surface.

export type Role = "member" | "mentor" | "staff";

/** A mentor's discreet escalation about a mentee. */
export interface Concern {
  id: string;
  mentorId: string;
  memberId: string;
  note?: string;
  status: "open" | "resolved";
  createdAt: number;
}

/** A website mentor application awaiting staff review. */
export interface MentorApplication {
  id: string;
  name: string;
  phone: string;
  email: string;
  areas: string[]; // lived-experience chips
  availability: string; // Weekly | Every other week | Flexible
  story?: string;
  status: "new" | "contacted" | "approved";
  createdAt: number;
}

export interface User {
  id: string;
  role: Role;
  name: string; // first name only is ever shown publicly
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  avatarColor: string; // hex used for initial-avatar tiles
  // member fields
  slug?: string; // public giving page /p/[slug]
  memberNumber?: string; // e.g. 039521464
  story?: string; // approved public story
  consentPublic?: boolean; // public giving page on/off
  balances?: { cash: number; credits: number; savings: number };
  streak?: number;
  points?: number;
  level?: string;
  mentorId?: string;
  centerId?: string; // outreach center this person belongs to
  lastActivityAt?: number; // last streak-qualifying activity (lesson complete)
}

// ── LMS ────────────────────────────────────────────────────────────────

export type Program = "PON" | "VOC" | "IOP" | "NAV";

/** A published course on the Learn tab. */
export interface Course {
  id: string;
  title: string;
  program: Program;
  lessonCount: number;
}

/** A member's progress through one course. */
export interface Enrollment {
  id: string;
  memberId: string;
  courseId: string;
  completedLessons: number[]; // 1-based lesson numbers, sorted ascending
  updatedAt: number;
}

/** An outreach center (e.g. Laveen Center). */
export interface Center {
  id: string;
  name: string;
  city: string;
}

export type SessionMode = "in-person" | "phone" | "video";

/** A logged mentor session with a mentee. */
export interface Session {
  id: string;
  mentorId: string;
  memberId: string;
  mode: SessionMode;
  minutes: number;
  note?: string;
  createdAt: number;
}

/** Public-safe projection of a member (what a donor may see). */
export interface PublicMember {
  slug: string;
  name: string;
  memberNumber: string;
  story: string;
  consentPublic: boolean;
  requests: SupportRequest[];
  savings: number;
}

export interface SupportRequest {
  id: string;
  memberId: string;
  label: string; // e.g. "Hallway house"
  weeklyTarget: number; // e.g. 175
  raised: number; // raised this week
  status: "active" | "funded";
  createdAt: number;
}

export interface Donation {
  id: string;
  memberId: string;
  requestId?: string;
  amount: number;
  weekly: boolean;
  createdAt: number;
}

export type PostKind = "regular" | "milestone" | "win";
export type PostStatus = "approved" | "pending" | "flagged" | "removed";

/** Community feed topics — the recovery community's channels. */
export type Topic = "general" | "jobs" | "housing" | "recovery" | "gratitude";
export const TOPICS: Topic[] = [
  "general",
  "jobs",
  "housing",
  "recovery",
  "gratitude",
];

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  avatarColor: string;
  body: string;
  kind: PostKind;
  status: PostStatus;
  topic?: Topic; // community channel (defaults to "general" when absent)
  requestId?: string; // links a support-request post to its goal
  hearts: string[]; // user ids who reacted
  // EXPANSION (docs/13 Part B) — documented additive exception: shared-
  // experience reactions. Optional because they're runtime-added on demand
  // (`post.proud ??= []`) so pre-expansion posts stay untouched.
  proud?: string[]; // "proud of you" user ids
  same?: string[]; // "same here" user ids
  comments: Comment[];
  createdAt: number;
}

export type MessageKind = "text" | "mood" | "cheer";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  kind: MessageKind;
  body: string;
  mood?: number; // 1–5 when kind === "mood"
  createdAt: number;
}

export interface Thread {
  id: string;
  participantIds: string[]; // [memberId, mentorId]
  messages: Message[];
  createdAt: number;
}

// ── Community expansion (docs/13-MODULE-COMMUNITY-EXPANSION) ──────────
// EXPANSION: additive only — nothing above this line changes.

export interface ProfileDetails {
  userId: string;
  journeySince?: string; // ISO date, optional "in recovery since"
  tagline?: string;
  interests: string[];
  recoveryCapitalPublic: boolean; // rings visible on public profile
  showMilestones: boolean;
}

/** BARC-10 self-check — warm self-reflection, never clinical, never public. */
export interface BarcSelfCheck {
  id: string;
  memberId: string;
  takenAt: number;
  scores: Record<string, number>; // 10 domains, 0–5 each
  total: number; // 0–50
}

export type CircleKind = "topic" | "cohort" | "alumni";

export interface Circle {
  id: string;
  name: string;
  kind: CircleKind;
  description: string;
  staffModerated: boolean; // false = peer-led
  centerId?: string; // alumni circles belong to a center
}

export interface CircleMembership {
  id: string;
  circleId: string;
  memberId: string;
  joinedAt: number;
}

export const RECOVERY_DOMAINS = [
  "housing",
  "employment",
  "education",
  "health",
  "relationships",
  "legal",
  "financial",
  "transportation",
  "other",
] as const;
export type RecoveryDomain = (typeof RECOVERY_DOMAINS)[number];

export type GoalStatus = "active" | "achieved" | "paused" | "archived";
export type GoalVisibility = "private" | "mentor" | "circle" | "public";

/** Recovery Goal — the member-owned middle layer connecting tracker tasks
 *  (to-dos) and support requests (funding). Merges neither. */
export interface RecoveryGoal {
  id: string;
  memberId: string;
  title: string;
  domain: RecoveryDomain;
  why?: string; // member-authored motivation
  status: GoalStatus;
  targetDate?: string;
  achievedAt?: number;
  visibility: GoalVisibility;
  linkedRequestId?: string; // → SupportRequest (existing QR funding goal)
  createdAt: number;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  done: boolean;
  sort: number;
  dueDate?: string;
}

export type JobAppStatus = "applied" | "interview" | "offer" | "closed";

export interface JobApplication {
  id: string;
  memberId: string;
  company: string;
  role: string;
  status: JobAppStatus;
  notes?: string;
  nextActionDate?: string;
  createdAt: number;
}

export type ResumeSectionKind =
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "volunteer"
  | "references"
  | "projects";

export interface Resume {
  id: string;
  memberId: string;
  fullName: string;
  headline?: string;
  summary?: string;
  contact?: { phone?: string; email?: string; city?: string };
  template: string; // "clean_blue"
  isPrimary: boolean;
  updatedAt: number;
}

export interface ResumeSection {
  id: string;
  resumeId: string;
  kind: ResumeSectionKind;
  content: Record<string, unknown>; // shape varies by kind
  sort: number;
}

// ── Continuum of Care (docs/14 + requirements/11 §A/B/K) ──────────────
// EXPANSION: additive only — the platform spine (the hub every other
// module feeds). Nothing above this line changes. `care_phase` runs in
// PARALLEL to the existing journey/level fields; it never replaces them.

/** The five care phases — one person, one continuous timeline. */
export type CarePhase =
  | "pre_care" // in community before any center relationship (unaffiliated)
  | "intake" // connected to a center, assessment, not yet in programming
  | "in_program" // active in a level of care
  | "transition" // stepping down, discharge planning, aftercare
  | "continuing"; // post-discharge alumni, ongoing follow-up (indefinite)

/** Clinical level of care during the in-program phase. */
export type LevelOfCare =
  | "detox"
  | "residential"
  | "php"
  | "iop"
  | "op"
  | "recovery_maintenance";

/** A person's relationship with ONE center over time (extends enrollments).
 *  centerId absent = unaffiliated (pre-care differentiator). */
export interface CareEpisode {
  id: string;
  memberId: string;
  centerId?: string;
  carePhase: CarePhase;
  levelOfCare?: LevelOfCare;
  startedAt: number;
  phaseChangedAt: number; // when the current phase began
  endedAt?: number; // program discharge (relationship may continue)
  referralSource?: string; // self | community | partner | court | hospital
  dischargeType?: string; // completed | stepped_down | left_early | transferred
}

/** Append-only log of every phase/LOC change — the outcomes gold. */
export interface PhaseTransition {
  id: string;
  episodeId: string;
  fromPhase?: CarePhase;
  toPhase: CarePhase;
  fromLoc?: LevelOfCare;
  toLoc?: LevelOfCare;
  changedBy: string; // user id of the actor (staff / mentor / system)
  reason: string;
  at: number;
}

/** Every module that generates a signal writes to ONE of these sources. */
export type ContinuumSource =
  | "community"
  | "lms"
  | "goal"
  | "giving"
  | "mentorship"
  | "checkin"
  | "session"
  | "phase";

/** The heartbeat: one row per meaningful action, across ALL modules, per
 *  person. Single write path (hooks), many readers (score, timeline, export). */
export interface ContinuumEvent {
  id: string;
  memberId: string;
  source: ContinuumSource;
  refId?: string; // the source artifact (post, lesson, goal, donation, …)
  weight: number; // engagement weighting for scoring
  occurredAt: number;
}

// ── Community Ad Product (docs/15 §B + requirements/12 §B/E) ───────────
// EXPANSION: additive only — nothing above this line changes. The buyer is
// the recovery center; the audience is members in recovery. Member trust is
// the product, so the trust rules are enforced in CODE (see app/api/placements
// /serve for the crisis-exclusion + frequency-cap + coarse-targeting gates),
// not left to policy docs. Ads live in the community feed as clearly labeled
// "Sponsored by [Center]" items — never disguised as a peer Post.

/** What a sponsored placement is selling — recovery-relevant categories ONLY.
 *  There is deliberately no "product"/"offer" free-for-all kind; every value
 *  here is something a person in recovery should be able to see safely. */
export type PlacementKind =
  | "service"
  | "alumni_event"
  | "job_opening"
  | "program"
  | "announcement";

/** Placement lifecycle: center drafts → submits for review → ms_admin approves
 *  (→ running) or rejects. running↔paused while live; ended when scheduled out. */
export type PlacementStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "running"
  | "paused"
  | "ended"
  | "rejected";

/** How broadly a placement is shown. COARSE only — see targeting note below. */
export type AudienceScope = "community" | "geo" | "circle" | "phase";

/** Coarse, NON-CLINICAL targeting. THIS IS THE WHOLE OBJECT — there is
 *  deliberately NO field for health, diagnosis, substance, symptom, or any
 *  sensitive attribute, and none may ever be added. Targeting a vulnerable
 *  population by their condition is structurally impossible here: an advertiser
 *  literally cannot express "show this to people with <diagnosis>" because the
 *  schema has no place to put it. Only metro/geo, care phase (e.g. alumni),
 *  interest tags, and a circle topic are allowed. (docs/10 + docs/15 §B.) */
export interface PlacementTargeting {
  metro?: string; // e.g. "Phoenix, AZ" — geographic, non-clinical
  phase?: CarePhase; // e.g. "continuing" (alumni) — care stage, NOT a health status
  interestTags?: string[]; // e.g. ["employment", "housing"] — coarse interests
  circleId?: string; // a community circle topic (Circle.id)
}

/** A center's sponsored placement in the community feed. orgId === centerId —
 *  only approved orgs (centers) advertise; there are no arbitrary advertisers. */
export interface SponsoredPlacement {
  id: string;
  orgId: string; // === Center.id — the buying center
  orgName: string; // shown to members as "Sponsored by [orgName]"
  title: string;
  body: string;
  ctaLabel: string; // e.g. "RSVP", "Apply", "Learn more"
  ctaUrl: string;
  kind: PlacementKind;
  audienceScope: AudienceScope;
  targeting: PlacementTargeting; // coarse, non-clinical ONLY (see type above)
  status: PlacementStatus;
  startsAt?: number;
  endsAt?: number;
  budgetCents?: number; // flat placement fee v1 (not an auction)
  approvedBy?: string; // ms_admin (staff) user id who approved
  rejectionReason?: string;
  createdAt: number;
}

/** An interaction with a placement. memberId is stored SERVER-SIDE ONLY for
 *  frequency-capping and dedup — it is NEVER exposed to advertiser reads
 *  (GET /api/placements returns aggregate counts, never per-member rows). */
export interface PlacementEvent {
  id: string;
  placementId: string;
  kind: "impression" | "click" | "dismiss" | "report";
  memberId?: string; // internal only — never surfaced to the center
  occurredAt: number;
}

/** A demo/contact-sales request from the "For Recovery Centers" marketing
 *  page. Public form in → staff lead queue. */
export interface DemoLead {
  id: string;
  orgName: string;
  contactName: string;
  email: string;
  phone?: string;
  message?: string;
  source?: string; // where the lead came from (e.g. "centers-page")
  status: "new" | "contacted" | "closed";
  createdAt: number;
}

/** What /api/auth/me returns — never includes credentials. */
export type SafeUser = Omit<User, "passwordHash" | "salt">;

export function toSafeUser(u: User): SafeUser {
  const { passwordHash: _p, salt: _s, ...safe } = u;
  return safe;
}
