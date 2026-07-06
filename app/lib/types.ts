// Shared platform types - the contract between the API and every surface.

export type Role = "member" | "mentor" | "staff" | "employer";

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
  // employer fields (role === "employer") - a recovery-friendly hiring account.
  // `name` is the contact's first name; `company` is the business they hire for.
  company?: string;
}

// ── Employer accounts + job posts (recovery-friendly hiring) ──────────
// An employer is a User with role "employer" - reuses the HMAC session cookie,
// findUserById, and getRoleUser gates with no new auth path. The company they
// hire for lives on `User.company`; every job they post is a JobPost below.

/** How the role is scheduled. Warm, plain-language options members recognize. */
export type JobType =
  | "full-time"
  | "part-time"
  | "temporary"
  | "contract"
  | "seasonal";

export const JOB_TYPES: JobType[] = [
  "full-time",
  "part-time",
  "temporary",
  "contract",
  "seasonal",
];

/** A recovery-friendly job opening posted by an employer account. Every post
 *  is recoveryFriendly by definition - this board only carries fair-chance,
 *  second-chance-welcome roles. status open↔closed; owner controls both. */
export interface JobPost {
  id: string;
  employerId: string; // === User.id of the posting employer
  title: string;
  company: string; // denormalized from the employer for public display
  location: string;
  type: JobType;
  payRange?: string; // e.g. "$17–$19/hr" - optional, employer's words
  description: string;
  recoveryFriendly: true; // always true on this board (fair-chance by design)
  status: "open" | "closed";
  createdAt: number;
}

// ── LMS ────────────────────────────────────────────────────────────────

/** Course program category chips (PON/VOC/IOP/NAV). Renamed from `Program`
 *  when the Center Operations suite (docs/16) introduced the Program ENTITY
 *  below - same values, same `Course.program` field, new alias name. */
export type ProgramCategory = "PON" | "VOC" | "IOP" | "NAV";

/** A published course on the Learn tab. */
export interface Course {
  id: string;
  title: string;
  program: ProgramCategory;
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

/** Community feed topics - the recovery community's channels. */
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
  // MODERATION: a staff "hide" action on a report sets this true, removing the
  // post from the community feed (docs/06). Optional/undefined = visible, so
  // pre-moderation posts stay untouched. Distinct from `status: "removed"`:
  // hidden is the report→action safety chain's soft take-down, reversible in
  // spirit, and still visible to staff via the dashboard moderation queue.
  hidden?: boolean;
  topic?: Topic; // community channel (defaults to "general" when absent)
  requestId?: string; // links a support-request post to its goal
  hearts: string[]; // user ids who reacted
  // EXPANSION (docs/13 Part B) - documented additive exception: shared-
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
// EXPANSION: additive only - nothing above this line changes.

export interface ProfileDetails {
  userId: string;
  journeySince?: string; // ISO date, optional "in recovery since"
  tagline?: string;
  interests: string[];
  recoveryCapitalPublic: boolean; // rings visible on public profile
  showMilestones: boolean;
}

/** BARC-10 self-check - warm self-reflection, never clinical, never public. */
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

/** Recovery Goal - the member-owned middle layer connecting tracker tasks
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
// EXPANSION: additive only - the platform spine (the hub every other
// module feeds). Nothing above this line changes. `care_phase` runs in
// PARALLEL to the existing journey/level fields; it never replaces them.

/** The five care phases - one person, one continuous timeline. */
export type CarePhase =
  | "pre_care" // in community before any center relationship (unaffiliated)
  | "intake" // connected to a center, assessment, not yet in programming
  | "in_program" // active in a level of care
  | "transition" // stepping down, discharge planning, aftercare
  | "continuing"; // post-discharge alumni, ongoing follow-up (indefinite)

/** Clinical level of care during the in-program phase. "custom" was added
 *  with the Center Operations suite (docs/16) for center-defined programs
 *  that sit outside the clinical ladder. */
export type LevelOfCare =
  | "detox"
  | "residential"
  | "php"
  | "iop"
  | "op"
  | "recovery_maintenance"
  | "custom";

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

/** Append-only log of every phase/LOC change - the outcomes gold. */
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
// EXPANSION: additive only - nothing above this line changes. The buyer is
// the recovery center; the audience is members in recovery. Member trust is
// the product, so the trust rules are enforced in CODE (see app/api/placements
// /serve for the crisis-exclusion + frequency-cap + coarse-targeting gates),
// not left to policy docs. Ads live in the community feed as clearly labeled
// "Sponsored by [Center]" items - never disguised as a peer Post.

/** What a sponsored placement is selling - recovery-relevant categories ONLY.
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

/** How broadly a placement is shown. COARSE only - see targeting note below. */
export type AudienceScope = "community" | "geo" | "circle" | "phase";

/** Coarse, NON-CLINICAL targeting. THIS IS THE WHOLE OBJECT - there is
 *  deliberately NO field for health, diagnosis, substance, symptom, or any
 *  sensitive attribute, and none may ever be added. Targeting a vulnerable
 *  population by their condition is structurally impossible here: an advertiser
 *  literally cannot express "show this to people with <diagnosis>" because the
 *  schema has no place to put it. Only metro/geo, care phase (e.g. alumni),
 *  interest tags, and a circle topic are allowed. (docs/10 + docs/15 §B.) */
export interface PlacementTargeting {
  metro?: string; // e.g. "Phoenix, AZ" - geographic, non-clinical
  phase?: CarePhase; // e.g. "continuing" (alumni) - care stage, NOT a health status
  interestTags?: string[]; // e.g. ["employment", "housing"] - coarse interests
  circleId?: string; // a community circle topic (Circle.id)
}

/** A center's sponsored placement in the community feed. orgId === centerId -
 *  only approved orgs (centers) advertise; there are no arbitrary advertisers. */
export interface SponsoredPlacement {
  id: string;
  orgId: string; // === Center.id - the buying center
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
 *  frequency-capping and dedup - it is NEVER exposed to advertiser reads
 *  (GET /api/placements returns aggregate counts, never per-member rows). */
export interface PlacementEvent {
  id: string;
  placementId: string;
  kind: "impression" | "click" | "dismiss" | "report";
  memberId?: string; // internal only - never surfaced to the center
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

// ── Continuum: Care Channels + Consent + Follow-up cadence ────────────
// (docs/14 §In-Program D + §Intake C + §Continuing G; requirements/11 §C/§D/§G)
// EXPANSION: additive only - nothing above this line changes. Three additions
// to the continuum spine: (1) in-program center↔client ENGAGEMENT comms - NOT
// clinical notes/PHI, never therapy delivery; (2) a granular, revocable consent
// grant to a SPECIFIC center (extends consentPublic, replaces nothing); (3) the
// post-discharge follow-up cadence. All read/write against the same spine.

/** A care communication space. Engagement comms only - no PHI/clinical notes.
 *  - program_group: an IOP cohort's shared space (staff schedule/assignments +
 *    peer discussion, moderated) - keyed by `cohortId`.
 *  - one_to_one: a staff↔member channel (reminders, "you missed group - ok?")
 *    - keyed by `memberId`. Distinct from mentor chat and the public feed.
 *  - announcement: one-way center broadcast (no `memberId`/`cohortId`). */
export type CareChannelKind = "program_group" | "one_to_one" | "announcement";

export interface CareChannel {
  id: string;
  centerId: string; // the owning center (=== Center.id)
  kind: CareChannelKind;
  title: string;
  memberId?: string; // set for one_to_one - the member side of the channel
  cohortId?: string; // set for program_group - the cohort key (e.g. "cohort-iop-laveen")
  createdAt: number;
}

/** A message in a CareChannel. Engagement content only - the UI/policy bar
 *  PHI + clinical notes (requirements/11 §D). moderationStatus reuses the
 *  community moderation pipeline (docs/06) for group-channel discussion. */
export interface CareMessage {
  id: string;
  channelId: string; // → CareChannel.id
  senderId: string; // → User.id (staff / member / mentor)
  senderName: string; // first name, denormalized for display
  senderRole: Role;
  body: string;
  createdAt: number;
  moderationStatus?: "approved" | "flagged";
}

/** A member's granular, revocable grant of continuum access to ONE specific
 *  center (requirements/11 §C). EXTENDS existing consent - it does NOT replace
 *  User.consentPublic (public giving page) and is a separate axis: consentPublic
 *  governs donor visibility; a ConsentGrant governs a center's continuum access.
 *  Revoking (revokedAt) cuts the center's access to future data; append-only
 *  in spirit (grant a new row to re-consent). scope is fixed "continuum" today,
 *  left as a union point for future scopes (e.g. pre-care history opt-in). */
export interface ConsentGrant {
  id: string;
  memberId: string;
  centerId: string;
  scope: "continuum";
  grantedAt: number;
  revokedAt?: number; // set when the member revokes; undefined = active
}

/** A post-discharge follow-up touchpoint on the evidence-backed 30/60/90/180/365d
 *  cadence (requirements/11 §G). A completed check-in emits a continuum_event of
 *  source "checkin" and can carry an optional BARC-10 pulse (barcTotal, 0–50). */
export interface FollowUpCheckin {
  id: string;
  memberId: string;
  centerId: string;
  dueDay: 30 | 60 | 90 | 180 | 365;
  status: "pending" | "done" | "missed";
  completedAt?: number; // set when status === "done"
  barcTotal?: number; // optional BARC-10 pulse captured at the check-in (0–50)
}

// ── Engagement: notifications + member blocks + community events ──────
// EXPANSION: additive only - nothing above this line changes. The engagement
// backend: per-user notifications (one inbox across every module), user-driven
// member blocks (mutual safety), and center community events with RSVP (an
// RSVP is an engagement signal → continuum_event source "community").

export type NotificationKind =
  | "reaction"
  | "comment"
  | "care_message"
  | "follow_up"
  | "job"
  | "event"
  | "mention"
  | "system";

/** A single notification in a member's inbox. refType/refId point back at the
 *  source artifact (post, event, channel message, …) for deep-linking. */
export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  refType?: string;
  refId?: string;
  read: boolean;
  createdAt: number;
}

/** A user-driven block - blocker hides/mutes blocked across social surfaces. */
export interface MemberBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: number;
}

export type EventKind = "meeting" | "celebration" | "workshop" | "community";

/** A center or member-created community event members can RSVP to. */
export interface CommunityEvent {
  id: string;
  centerId?: string;
  creatorId: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt?: number;
  location: string;
  kind: EventKind;
  createdAt: number;
}

/** One member's RSVP to a community event. */
export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  createdAt: number;
}

/** A member-filed report on a community post, awaiting staff review. Feeds the
 *  moderation queue. Lifecycle:
 *   - "open"     - filed, awaiting a staff look.
 *   - "reviewed" - staff looked and resolved it WITHOUT a take-down (a plain
 *                  "mark reviewed" or an explicit "dismiss" - post stays).
 *   - "actioned" - staff resolved it WITH a moderation action (hid the post or
 *                  warned the author). A distinct state so the queue can show
 *                  "this report changed something," not just "someone glanced." */
export interface PostReport {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  note?: string;
  status: "open" | "reviewed" | "actioned";
  createdAt: number;
}

// ── Center Operations Suite (docs/16 + requirements/13) ───────────────
// EXPANSION: additive only - nothing above this line changes. Programs sit
// ABOVE existing courses: a Course (docs/07) is an ingredient, a Program is
// the packaged, runnable meal (curriculum + schedule + people). The old
// `Program` string union is `ProgramCategory` now (see the LMS section) so
// this entity can own the name per docs/16. Care team + staff engagement,
// challenges, pulse surveys, and the staff task queue complete the spine.

/** Where a program is delivered. */
export type ProgramDelivery = "in_facility" | "remote" | "hybrid";

/** A packaged, runnable offering targeted at a level of care. My Struggle
 *  publishes starter templates (isTemplate true, no centerId); centers clone
 *  and customize them into live, enrollable programs. */
export interface Program {
  id: string;
  centerId?: string; // absent on My Struggle shared templates
  title: string;
  description: string;
  levelOfCare: LevelOfCare;
  category?: "PON" | "VOC" | "IOP" | "NAV" | "other";
  durationWeeks?: number;
  delivery: ProgramDelivery;
  isTemplate: boolean; // shareable starter (clone + customize)
  status: "draft" | "published" | "archived";
  badge?: string; // program badge (gamification, app-only gold)
  createdAt: number;
}

/** One ordered building block of a program's curriculum. Courses are reused
 *  by id; session series / task packs / milestones carry their shape in
 *  `config` (e.g. { cadence: "weekly", weeks: 8 } for a session series). */
export interface ProgramCurriculumItem {
  id: string;
  programId: string;
  sort: number;
  kind: "course" | "session_series" | "task_pack" | "milestone";
  courseId?: string; // set when kind === "course" (existing Course.id)
  label: string;
  config?: Record<string, unknown>;
}

/** Cohort membership - one member's run through one program. */
export interface ProgramEnrollment {
  id: string;
  programId: string;
  memberId: string;
  careEpisodeId?: string; // links the enrollment to the continuum spine
  cohortLabel?: string; // e.g. "Summer 2026"
  enrolledAt: number;
  completedAt?: number;
  status: "active" | "completed" | "withdrawn";
}

/** A scheduled group session on a program's calendar. */
export interface ProgramSession {
  id: string;
  programId: string;
  title: string;
  startsAt: number;
  durationMin: number;
  location?: string;
  facilitatorId?: string; // staff User.id
  createdAt: number;
}

/** One member's attendance mark on one program session. */
export interface SessionAttendance {
  id: string;
  sessionId: string;
  memberId: string;
  status: "present" | "remote" | "excused" | "absent";
  markedBy: string; // staff User.id who marked it
  markedAt: number;
}

/** Roles a staff member can hold on a member's care team. */
export type CareTeamRole =
  | "case_manager"
  | "counselor"
  | "peer_support"
  | "tech"
  | "facilitator";

/** A staff member's assignment to a member's care team (per episode when
 *  careEpisodeId is set). Drives the My Caseload view. */
export interface CareTeamAssignment {
  id: string;
  memberId: string;
  careEpisodeId?: string;
  staffId: string;
  role: CareTeamRole;
  isPrimary: boolean;
  assignedAt: number;
  endedAt?: number;
}

/** Kinds of lightweight human touches staff log. "hallway" is a quick
 *  in-person moment. Engagement comms only - never PHI/clinical notes. */
export type StaffTouchKind =
  | "kudos"
  | "nudge"
  | "checkin"
  | "session_note"
  | "call"
  | "hallway";

/** One logged staff touch with a member - human contact as a measured
 *  engagement input (each live touch also emits a continuum_event). */
export interface StaffEngagement {
  id: string;
  memberId: string;
  staffId: string;
  kind: StaffTouchKind;
  body?: string;
  mood?: number; // 1-5, captured on kind "checkin"
  occurredAt: number;
}

/** A staff-created, time-boxed, opt-in cohort challenge ("Gratitude Week").
 *  No public loser-boards - anti-toxicity rules from docs/07 hold. */
export interface Challenge {
  id: string;
  centerId?: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt: number;
  badge?: string;
  createdBy: string; // staff User.id
  createdAt: number;
}

/** One member's opt-in to a challenge. */
export interface ChallengeJoin {
  id: string;
  challengeId: string;
  memberId: string;
  joinedAt: number;
}

/** A short pulse check-in sent to a cohort ("How supported do you feel this
 *  week?"). Anonymous to peers, trend visible to staff. */
export interface PulseSurvey {
  id: string;
  centerId?: string;
  programId?: string; // scoped to a program cohort when set
  question: string;
  createdBy: string; // staff User.id
  createdAt: number;
  closesAt?: number;
}

/** One member's response to a pulse survey. */
export interface PulseResponse {
  id: string;
  surveyId: string;
  memberId: string;
  score: number; // 1-5
  note?: string;
  createdAt: number;
}

/** A follow-up in the staff task queue ("call Danielle re: housing"). */
export interface StaffTask {
  id: string;
  staffId: string; // assignee
  memberId?: string; // the member this follow-up is about, when applicable
  title: string;
  dueAt?: number;
  done: boolean;
  createdBy: string;
  createdAt: number;
}

/** What /api/auth/me returns - never includes credentials. */
export type SafeUser = Omit<User, "passwordHash" | "salt">;

export function toSafeUser(u: User): SafeUser {
  const { passwordHash: _p, salt: _s, ...safe } = u;
  return safe;
}
