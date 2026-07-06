// Platform data store - in-memory singleton with JSON file persistence.
// Dev: persists to .data/db.json. Vercel: persists to /tmp (per-instance,
// resets on cold start - demo-grade). Swap this module for Supabase/Postgres
// later; the API route handlers are the stable contract.

import { randomUUID, scryptSync, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import type {
  User,
  Post,
  Thread,
  Message,
  Donation,
  SupportRequest,
  Comment,
  Role,
  Center,
  Session,
  Course,
  Enrollment,
  Concern,
  MentorApplication,
  ProfileDetails,
  BarcSelfCheck,
  Circle,
  CircleMembership,
  RecoveryGoal,
  GoalMilestone,
  JobApplication,
  Resume,
  ResumeSection,
  RecoveryDomain,
  CareEpisode,
  PhaseTransition,
  ContinuumEvent,
  CarePhase,
  LevelOfCare,
  ContinuumSource,
  SponsoredPlacement,
  PlacementEvent,
  DemoLead,
  CareChannel,
  CareMessage,
  ConsentGrant,
  FollowUpCheckin,
  JobPost,
  Notification,
  NotificationKind,
  MemberBlock,
  CommunityEvent,
  EventKind,
  EventRsvp,
  PostReport,
  Program,
  ProgramCurriculumItem,
  ProgramEnrollment,
  ProgramSession,
  SessionAttendance,
  CareTeamAssignment,
  StaffEngagement,
  StaffTouchKind,
  Challenge,
  ChallengeJoin,
  PulseSurvey,
  PulseResponse,
  StaffTask,
  EmployerProfile,
  PostingCandidate,
  RetentionConfirm,
  SavedJob,
} from "./types";

interface DB {
  seedVersion: number;
  users: User[];
  posts: Post[];
  threads: Thread[];
  donations: Donation[];
  requests: SupportRequest[];
  centers: Center[];
  sessions: Session[];
  courses: Course[];
  enrollments: Enrollment[];
  concerns: Concern[];
  applications: MentorApplication[];
  // community expansion (seed v6)
  profileDetails: ProfileDetails[];
  barcChecks: BarcSelfCheck[];
  circles: Circle[];
  circleMemberships: CircleMembership[];
  recoveryGoals: RecoveryGoal[];
  goalMilestones: GoalMilestone[];
  jobApplications: JobApplication[];
  resumes: Resume[];
  resumeSections: ResumeSection[];
  // continuum of care (seed v7 - docs/14 / requirements/11 §A/B/K)
  careEpisodes: CareEpisode[];
  phaseTransitions: PhaseTransition[];
  continuumEvents: ContinuumEvent[];
  // community ad product (seed v8 - docs/15 §B / requirements/12 §B/E)
  sponsoredPlacements: SponsoredPlacement[];
  placementEvents: PlacementEvent[];
  demoLeads: DemoLead[];
  // continuum care channels + consent + follow-up (seed v9 - docs/14 §D/§C/§G)
  careChannels: CareChannel[];
  careMessages: CareMessage[];
  consentGrants: ConsentGrant[];
  followUps: FollowUpCheckin[];
  // employer accounts + job posts (seed v10 - recovery-friendly hiring).
  // Employers are stored in `users` (role "employer"); jobPosts are their
  // openings, wired into the community Hiring rail + public /jobs board.
  jobPosts: JobPost[];
  // engagement backend (seed v11 - notifications, member blocks, community
  // events + RSVP). One notification inbox per user; blocks are user-driven;
  // events carry RSVPs whose going=true emits a "community" continuum_event.
  notifications: Notification[];
  memberBlocks: MemberBlock[];
  events: CommunityEvent[];
  eventRsvps: EventRsvp[];
  // member-filed post reports → staff moderation queue (seed v12).
  postReports: PostReport[];
  // center operations suite (seed v13 - docs/16 / requirements/13): programs
  // sit above courses; care teams + staff touches; challenges, pulse surveys,
  // and the staff task queue round out the engagement toolkit.
  programs: Program[];
  programCurriculum: ProgramCurriculumItem[];
  programEnrollments: ProgramEnrollment[];
  programSessions: ProgramSession[];
  sessionAttendance: SessionAttendance[];
  careTeamAssignments: CareTeamAssignment[];
  staffEngagements: StaffEngagement[];
  challenges: Challenge[];
  challengeJoins: ChallengeJoin[];
  pulseSurveys: PulseSurvey[];
  pulseResponses: PulseResponse[];
  staffTasks: StaffTask[];
  // second-chance employer platform (seed v15 - docs/17 / requirements/14).
  // Reuse-first: employers stay `users` role "employer", postings stay
  // `jobPosts`, member applications stay `jobApplications` (+ postingId).
  // New here: vetting profiles, the employer-side candidate pipeline,
  // 30/90/180-day retention confirms, and member job saves.
  employerProfiles: EmployerProfile[];
  postingCandidates: PostingCandidate[];
  retentionConfirms: RetentionConfirm[];
  savedJobs: SavedJob[];
}

/** Bump when the seed shape/volume changes - stale .data/db.json is discarded
 *  on load so existing installs pick up the new seed. */
const SEED_VERSION = 18;

const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

declare global {
  // eslint-disable-next-line no-var
  var __msdb: DB | undefined;
  // Platform-wide sponsored-ad kill switch (docs/15 §B). Module-level flag,
  // globalThis-backed so /api/admin/placements and /api/placements/serve share
  // one value across route modules and dev hot-reloads. Default OFF.
  // eslint-disable-next-line no-var
  var __msAdKill: boolean | undefined;
}

/** True when the platform-wide ad kill switch is engaged - /serve returns []
 *  for everyone while on. Not persisted to db.json (an operational toggle). */
export function isAdKillSwitchOn(): boolean {
  return globalThis.__msAdKill === true;
}

/** ms_admin flips the platform-wide ad kill switch. */
export function setAdKillSwitch(on: boolean): void {
  globalThis.__msAdKill = on;
}

/** ms_admin content-policy + frequency config (docs/15 §C). Like the kill
 *  switch, an operational toggle held in globalThis (shared across route
 *  modules + dev hot-reloads), NOT persisted to db.json.
 *  - frequencyEveryN: the feed shows ≤ 1 sponsored item per this many organic
 *    posts (/api/placements/serve reads it live).
 *  - blockedTerms: extra off-policy terms surfaced in the console and stored
 *    here for a future merge into ad-policy.ts's fixed screen list. */
export type AdConfig = { frequencyEveryN: number; blockedTerms: string[] };

declare global {
  // eslint-disable-next-line no-var
  var __msAdConfig: AdConfig | undefined;
}

const DEFAULT_AD_CONFIG: AdConfig = { frequencyEveryN: 5, blockedTerms: [] };

/** Current ad config (defaults when never set). */
export function getAdConfig(): AdConfig {
  const c = globalThis.__msAdConfig;
  return c ? { ...DEFAULT_AD_CONFIG, ...c } : { ...DEFAULT_AD_CONFIG };
}

/** ms_admin updates the ad config (additive patch - only given keys change). */
export function setAdConfig(patch: Partial<AdConfig>): AdConfig {
  const next: AdConfig = { ...getAdConfig(), ...patch };
  globalThis.__msAdConfig = next;
  return next;
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export function uid(): string {
  return randomUUID();
}

// ── deterministic seed ─────────────────────────────────────────────────
// Fixed PRNG seed + fixed epoch → the same rich dataset every boot.
// Never use Date.now() inside seed(); everything hangs off EPOCH.

const EPOCH = 1783036000000; // 2026-07-02 - fixed so output is stable
const DAY = 86400e3;

/** mulberry32 - tiny deterministic PRNG, returns floats in [0, 1). */
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Aaliyah", "Aaron", "Alicia", "Amara", "Andre", "Angel", "Anthony", "Ashley",
  "Bianca", "Brandon", "Briana", "Caleb", "Camila", "Carlos", "Carmen", "Cedric",
  "Chantel", "Chris", "Cynthia", "Daniel", "Danielle", "Darius", "David", "Deja",
  "Deon", "Destiny", "Devin", "Diego", "Dominique", "Ebony", "Eddie", "Elena",
  "Elijah", "Emilio", "Erica", "Felix", "Gabriela", "Gary", "Gloria", "Hector",
  "Imani", "Isaiah", "Ivan", "Jada", "Jamal", "Janae", "Jasmine", "Javier",
  "Jayden", "Jerome", "Jessica", "Joaquin", "Jordan", "Jose", "Josue", "Kayla",
  "Keisha", "Kendra", "Kevin", "Kiara", "Lamar", "Latoya", "Leon", "Lucia",
  "Malik", "Marcus", "Maria", "Mariah", "Maurice", "Maya", "Miguel", "Monique",
  "Nadia", "Naomi", "Nathan", "Nia", "Omar", "Patrice", "Quentin", "Ramon",
  "Rashad", "Renee", "Ricky", "Rosa", "Ruben", "Sasha", "Selena", "Shawn",
  "Sierra", "Stephanie", "Tamara", "Terrell", "Tiana", "Tommy", "Trevon",
  "Valeria", "Vanessa", "Victor", "Whitney", "Xavier", "Yesenia", "Zoe",
];

const AVATAR_PALETTE = ["#2E7CD6", "#4E5B9B", "#0B2545", "#12B76A", "#4E7BC4"];

// Dignified, person-first story sentences - composed 2–3 at a time.
const STORY_SENTENCES = [
  "I'm showing up for myself every day, and it's starting to show.",
  "After a hard season, I found the center and a mentor who believed in me before I did.",
  "I'm studying for my GED and I haven't missed a class in weeks.",
  "I started my first steady job this year and I'm proud of every shift.",
  "My savings account is small but growing, and it's mine.",
  "I check in with my mentor every week - that consistency changed everything.",
  "I'm working toward my own place, one week at a time.",
  "Getting my ID and paperwork sorted was the first win; now I'm stacking them.",
  "I'm learning to budget and it feels good to see a plan on paper.",
  "I want to give back at the center that gave me my start.",
  "Every milestone here gets celebrated, and that keeps me going.",
  "I'm rebuilding relationships with my family, slowly and honestly.",
];

const REQUEST_LABELS = [
  "Work boots",
  "Bus pass",
  "GED testing fee",
  "First month's rent",
  "Phone plan",
  "Interview clothes",
  "Food card",
  "Tool set for new job",
  "Bike for commute",
  "Birth certificate fee",
  "Laundry fund",
  "Security deposit",
];

const POST_BODIES_REGULAR = [
  "Checked in with my mentor today. Small steps, but they're mine.",
  "Made it to every class this week. Feeling steady.",
  "Grateful for the center today. The coffee and the company both help.",
  "Budget week 3: still on track. It's getting easier.",
  "Long day, but I showed up anyway. That counts.",
  "Picked up an extra shift this week. Savings jar is getting heavier.",
  "Study group tonight was good. We keep each other honest.",
  "Rainy Monday but I made my check-in. Streak alive.",
  "Somebody at the center told me they were proud of me today. Holding onto that.",
  "Meal-prepped for the whole week. Small wins add up.",
];

const POST_BODIES_WIN = [
  "Passed my practice test! The real one is next month and I'm ready.",
  "First paycheck from the new job. Straight to savings (mostly).",
  "Got my ID sorted after months of paperwork. Door's open now.",
  "Hit a 14-day check-in streak - longest one yet.",
  "My mentor said my budget plan was the best they'd seen. Framing that.",
  "Interview went great. They said they'd call this week!",
  "Finished the financial literacy course. Certificate and everything.",
];

const POST_BODIES_MILESTONE = [
  "Six months of showing up, every single week. Couldn't have done it alone.",
  "Today I signed the lease on my own place. My. Own. Place.",
  "One year with the center today. Different person, same fight.",
  "GED: passed. Next stop, community college.",
  "Officially promoted at work today. First time anyone's called me 'lead' anything.",
  "Reached Gold level today. When I started I didn't believe I'd last a month.",
];

const COMMENT_BODIES = [
  "So proud of you!",
  "This made my day. Keep going!",
  "You earned every bit of this.",
  "We see you. Keep showing up!",
  "Inspiring - thank you for sharing.",
  "One day at a time. You've got this.",
  "The whole center is cheering for you.",
  "Love this. Congratulations!",
];

const SESSION_NOTES = [
  "Reviewed weekly budget together - on track.",
  "Talked through job interview prep.",
  "Checked in on housing application progress.",
  "Celebrated the check-in streak; set next week's goal.",
  "Worked on GED study plan.",
  "Discussed transportation options for the new job.",
  "Quiet week - mostly listened. Follow up Friday.",
];

const DONATION_AMOUNTS = [5, 10, 10, 15, 20, 25, 25, 25, 30, 40, 50, 50, 75, 100];

// ── community-expansion templates (seed v6 - dignified voice) ───────────

/** BARC-10 self-check domains - warm, non-clinical framing. */
const BARC_DOMAINS = [
  "sobriety",
  "self-care",
  "relationships",
  "support",
  "community",
  "purpose",
  "housing",
  "finances",
  "coping",
  "outlook",
];

const GOAL_TEMPLATES: {
  domain: RecoveryDomain;
  title: string;
  why: string;
  milestones: string[];
}[] = [
  {
    domain: "housing",
    title: "Move into my own place",
    why: "I want a door that locks and a key that's mine.",
    milestones: ["Tour two transitional houses", "Save the deposit", "Sign the lease"],
  },
  {
    domain: "employment",
    title: "Land a steady job",
    why: "Steady work means steady ground.",
    milestones: ["Finish my résumé", "Apply to five places", "Nail the interview"],
  },
  {
    domain: "education",
    title: "Earn my GED",
    why: "I promised myself I'd finish what I started.",
    milestones: ["Sign up for classes", "Pass the practice test", "Take the real test"],
  },
  {
    domain: "health",
    title: "Get moving three days a week",
    why: "A strong body keeps my head clear.",
    milestones: ["Find a routine I like", "Two weeks consistent", "One month strong"],
  },
  {
    domain: "relationships",
    title: "Rebuild trust with my family",
    why: "They never gave up on me. Now it's my turn.",
    milestones: ["Weekly phone calls", "Show up on time, every time", "Host a family dinner"],
  },
  {
    domain: "financial",
    title: "Save my first $500",
    why: "A cushion means one bad week can't knock me down.",
    milestones: ["Open a savings account", "Save $100", "Save $250", "Hit $500"],
  },
  {
    domain: "transportation",
    title: "Get reliable transportation",
    why: "I can't say yes to a job I can't get to.",
    milestones: ["Get a monthly bus pass", "Save for a bike", "Map out my commute"],
  },
  {
    domain: "legal",
    title: "Clear up my old paperwork",
    why: "I want my past filed away, not following me.",
    milestones: ["Meet with the navigator", "Gather my documents", "File everything"],
  },
  {
    domain: "education",
    title: "Start a certification course",
    why: "Every certificate is a door.",
    milestones: ["Pick the program", "Enroll", "Finish the first module"],
  },
  {
    domain: "other",
    title: "Volunteer at the center monthly",
    why: "This place gave me my start - I want to give back.",
    milestones: ["Talk to staff about helping", "First volunteer shift"],
  },
];

const TAGLINES = [
  "One day at a time.",
  "Showing up, every day.",
  "Small steps, big wins.",
  "Grateful and grinding.",
  "Building something that lasts.",
  "Still here. Still fighting.",
  "Progress, not perfection.",
  "New chapter, same heart.",
];

const INTEREST_POOL = [
  "fitness",
  "cooking",
  "reading",
  "music",
  "basketball",
  "art",
  "hiking",
  "gardening",
  "chess",
  "volunteering",
];

const RESUME_HEADLINES = [
  "Hardworking and dependable",
  "Reliable team member ready to work",
  "Quick learner with steady hands",
  "Dependable - on time, every time",
];

const RESUME_EXPERIENCE_ITEMS = [
  { role: "Center volunteer", org: "My Struggle outreach center", dates: "2025–present" },
  { role: "Line cook", org: "Local diner", dates: "2019–2021" },
  { role: "Warehouse helper", org: "Seasonal contract", dates: "2023" },
  { role: "Landscaping crew", org: "Day labor", dates: "2022–2023" },
  { role: "Dishwasher", org: "Family restaurant", dates: "2018–2019" },
];

const SKILL_POOL = [
  "reliability",
  "teamwork",
  "inventory counts",
  "food prep",
  "customer service",
  "forklift (in training)",
  "time management",
  "deescalation",
  "cleaning & sanitation",
  "cash handling",
];

const JOB_COMPANIES = [
  "Sun Valley Warehouse",
  "Copper State Staffing",
  "Desert Bloom Foods",
  "Roosevelt Row Kitchen",
  "South Mountain Logistics",
  "Camelback Distribution",
];

const JOB_ROLES = [
  "Warehouse Associate",
  "Line Cook",
  "Stocker",
  "Custodian",
  "Prep Cook",
  "Delivery Helper",
];

const JOB_NOTES = [
  "Follow up by phone this week.",
  "Manager seemed friendly - send a thank-you note.",
  "They asked about weekend availability. I said yes.",
  "Bus route works - 20 minutes door to door.",
];

/** Circle-flavored post bodies, keyed by circle id. */
const CIRCLE_POST_BODIES: Record<string, string[]> = {
  "circle-job-seekers": [
    "Week 2 of applications. Staying at it.",
    "Interview tomorrow morning. Practiced my answers twice tonight.",
    "Updated my résumé at the center today. It finally looks like me.",
    "Got a callback! Keeping my head level, but I'm smiling.",
  ],
  "circle-new-in-recovery": [
    "Day 30 today. This circle helps more than you know.",
    "First week here. Just glad to have somewhere to say that out loud.",
    "Rough morning, better evening. Showed up anyway.",
  ],
  "circle-parents-in-recovery": [
    "My daughter told me she was proud of me today. Holding onto that.",
    "Made it to my son's game this weekend. First one in years.",
    "Bedtime stories over the phone until I'm home for good. It counts.",
  ],
  "circle-gratitude": [
    "Three things today: my mentor, my bed, hot coffee.",
    "Grateful for a hard week that I handled like a different person.",
    "Win of the week: paid a bill early. Small thing, big feeling.",
  ],
  "circle-laveen-alumni": [
    "Alumni meetup Saturday - who's coming?",
    "Came back to the center to say thanks. Left with three new friends.",
  ],
  "circle-south-phoenix-alumni": [
    "One year since I first walked into the center. Different person, same fight.",
    "Stopped by to cheer on the new cohort. Full circle.",
  ],
};

function seed(): DB {
  const now = EPOCH;
  const rnd = mulberry32(0x5eed2026);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const int = (min: number, max: number): number =>
    min + Math.floor(rnd() * (max - min + 1));

  // Deterministic ids - counter-based, can never collide with runtime uuids.
  let idSeq = 0;
  const did = (): string => `seed-${(idSeq++).toString(36)}`;

  // One scrypt call shared by every seeded account (password "mystruggle").
  // 500+ individual scrypt hashes would blow the <1s seed budget; a shared
  // demo salt is an accepted trade-off for seed data.
  const sharedSalt = "6d797374727567676c65736565647632";
  const sharedHash = hashPassword("mystruggle", sharedSalt);

  const mk = (
    role: Role,
    name: string,
    email: string,
    avatarColor: string,
    extra: Partial<User> = {}
  ): User => ({
    id: did(),
    role,
    name,
    email,
    salt: sharedSalt,
    passwordHash: sharedHash,
    createdAt: now - 90 * DAY,
    avatarColor,
    ...extra,
  });

  // ── centers ──────────────────────────────────────────────────────────
  const laveen: Center = {
    id: "center-laveen",
    name: "Laveen Center",
    city: "Laveen, AZ",
  };
  const southPhoenix: Center = {
    id: "center-south-phoenix",
    name: "South Phoenix Center",
    city: "Phoenix, AZ",
  };
  const centers = [laveen, southPhoenix];

  // ── staff (dashboard identity) ───────────────────────────────────────
  const sarah = mk("staff", "Sarah", "sarah@themystruggles.com", "#0B2545", {
    centerId: laveen.id,
  });

  // ── mentors (8, Marcus first) ────────────────────────────────────────
  const marcus = mk("mentor", "Marcus", "marcus@themystruggles.com", "#4E5B9B", {
    centerId: laveen.id,
  });
  const MENTOR_NAMES = ["Alicia", "Devon", "Rosa", "James", "Keisha", "Miguel", "Tanya"];
  const mentors: User[] = [
    marcus,
    ...MENTOR_NAMES.map((n, i) =>
      mk("mentor", n, `${n.toLowerCase()}@themystruggles.com`, pick(AVATAR_PALETTE), {
        centerId: i % 2 === 0 ? laveen.id : southPhoenix.id,
        createdAt: now - int(120, 360) * DAY,
      })
    ),
  ];

  // ── flagship demo members (hand-written, kept verbatim) ──────────────
  const danielle = mk("member", "Danielle", "danielle@themystruggles.com", "#2E7CD6", {
    slug: "danielle",
    memberNumber: "039521464",
    story:
      "I earned my GED, started my first job, and moved into transitional housing - three milestones in eight months. Right now I'm working toward $175 a week for my hallway house, the last step before a place of my own.",
    consentPublic: true,
    balances: { cash: 64, credits: 58, savings: 240 },
    streak: 12,
    points: 640,
    level: "Silver",
    mentorId: marcus.id,
    centerId: laveen.id,
  });
  const tyrell = mk("member", "Tyrell", "tyrell@themystruggles.com", "#0B2545", {
    slug: "tyrell",
    memberNumber: "039521512",
    story: "Six months clean and studying for my forklift certification.",
    consentPublic: true,
    balances: { cash: 22, credits: 31, savings: 80 },
    streak: 0,
    points: 310,
    level: "Bronze",
    mentorId: marcus.id,
    centerId: laveen.id,
  });
  const andre = mk("member", "Andre", "andre@themystruggles.com", "#12B76A", {
    slug: "andre",
    memberNumber: "039521588",
    story: "",
    consentPublic: false,
    balances: { cash: 0, credits: 10, savings: 0 },
    streak: 1,
    points: 10,
    level: "Bronze",
    mentorId: marcus.id,
    centerId: laveen.id,
  });

  // ── 497 generated members (500 total with the flagship three) ────────
  const usedSlugs = new Set(["danielle", "tyrell", "andre"]);
  const usedNumbers = new Set(["039521464", "039521512", "039521588"]);

  const memberNumber = (): string => {
    let num: string;
    do {
      num = "0" + String(int(10_000_000, 99_999_999));
    } while (usedNumbers.has(num));
    usedNumbers.add(num);
    return num;
  };

  const uniqueSlug = (name: string): string => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    return slug;
  };

  const story = (): string => {
    const count = int(2, 3);
    const picked = new Set<string>();
    while (picked.size < count) picked.add(pick(STORY_SENTENCES));
    return [...picked].join(" ");
  };

  const generated: User[] = [];
  for (let i = 0; i < 497; i++) {
    const name = pick(FIRST_NAMES);
    const levelRoll = rnd();
    const level = levelRoll < 0.6 ? "Bronze" : levelRoll < 0.9 ? "Silver" : "Gold";
    const points =
      level === "Bronze" ? int(0, 639) : level === "Silver" ? int(640, 999) : int(1000, 2200);
    const slug = uniqueSlug(name);
    generated.push(
      mk("member", name, `${slug}@example.com`, pick(AVATAR_PALETTE), {
        slug,
        memberNumber: memberNumber(),
        story: rnd() < 0.7 ? story() : "",
        consentPublic: rnd() < 0.85,
        balances: {
          cash: rnd() < 0.15 ? 0 : int(1, 180),
          credits: rnd() < 0.15 ? 0 : int(1, 150),
          savings: rnd() < 0.2 ? 0 : int(5, 600),
        },
        streak: rnd() < 0.15 ? 0 : int(1, 30),
        points,
        level,
        mentorId: mentors[i % mentors.length].id,
        centerId: rnd() < 0.6 ? laveen.id : southPhoenix.id,
        createdAt: now - int(1, 365) * DAY - int(0, 23) * 3600e3,
      })
    );
  }

  const members = [danielle, tyrell, andre, ...generated];
  const publicMembers = members.filter((m) => m.consentPublic);

  // ── support requests (hand-written two + ~200 active / ~80 funded) ───
  const requests: SupportRequest[] = [
    {
      id: did(),
      memberId: danielle.id,
      label: "Hallway house",
      weeklyTarget: 175,
      raised: 105,
      status: "active",
      createdAt: now - 30 * DAY,
    },
    {
      id: did(),
      memberId: tyrell.id,
      label: "Forklift certification fee",
      weeklyTarget: 60,
      raised: 15,
      status: "active",
      createdAt: now - 10 * DAY,
    },
  ];
  const TARGETS = [20, 25, 40, 50, 60, 75, 100, 120, 150, 175, 200];
  for (let i = 0; i < 198; i++) {
    const target = pick(TARGETS);
    requests.push({
      id: did(),
      memberId: pick(generated).id,
      label: pick(REQUEST_LABELS),
      weeklyTarget: target,
      raised: Math.floor(rnd() * target), // strictly < target
      status: "active",
      createdAt: now - int(0, 90) * DAY,
    });
  }
  for (let i = 0; i < 80; i++) {
    const target = pick(TARGETS);
    requests.push({
      id: did(),
      memberId: pick(generated).id,
      label: pick(REQUEST_LABELS),
      weeklyTarget: target,
      raised: target + int(0, 40),
      status: "funded",
      createdAt: now - int(7, 330) * DAY,
    });
  }

  // ── donations (~2,500 over 12 months, weighted toward recent) ────────
  const donations: Donation[] = [];
  for (let i = 0; i < 2500; i++) {
    const ageDays = Math.floor(365 * rnd() * rnd()); // recency-weighted
    donations.push({
      id: did(),
      memberId: pick(publicMembers).id,
      amount: pick(DONATION_AMOUNTS),
      weekly: rnd() < 0.25,
      createdAt: now - ageDays * DAY - int(0, DAY - 1),
    });
  }

  // ── community feed (2 hand-written + ~148 generated) ─────────────────
  const heartsFrom = (pool: User[], max: number): string[] => {
    const n = int(0, max);
    const ids = new Set<string>();
    while (ids.size < n) ids.add(pick(pool).id);
    return [...ids];
  };
  const commentsFor = (createdAt: number): Comment[] => {
    const out: Comment[] = [];
    const n = int(0, 3);
    for (let i = 0; i < n; i++) {
      const author = rnd() < 0.25 ? pick(mentors) : pick(members);
      out.push({
        id: did(),
        authorId: author.id,
        authorName: author.name,
        authorRole: author.role,
        body: pick(COMMENT_BODIES),
        createdAt: createdAt + int(1, 36) * 3600e3,
      });
    }
    return out;
  };

  const posts: Post[] = [
    {
      id: did(),
      authorId: marcus.id,
      authorName: "Marcus",
      authorRole: "mentor",
      avatarColor: "#4E5B9B",
      body: "One year sober today. To everyone at the center who never gave up on me - this one's for you. Now I get to walk it with my mentees.",
      kind: "milestone",
      status: "approved",
      hearts: [danielle.id, tyrell.id],
      comments: [
        {
          id: did(),
          authorId: danielle.id,
          authorName: "Danielle",
          authorRole: "member",
          body: "So proud of you Marcus. You showed me it's possible.",
          createdAt: now - 2 * DAY,
        },
      ],
      createdAt: now - 2 * DAY,
    },
    {
      id: did(),
      authorId: danielle.id,
      authorName: "Danielle",
      authorRole: "member",
      avatarColor: "#2E7CD6",
      body: "Got my GED today. The whole center stopped to cheer. Next stop: my own place.",
      kind: "win",
      status: "approved",
      hearts: [marcus.id],
      comments: [],
      createdAt: now - 4 * DAY,
    },
  ];

  const everyone = [...mentors, ...members];
  for (let i = 0; i < 148; i++) {
    const author = pick(generated);
    const kindRoll = rnd();
    const kind = kindRoll < 0.7 ? "regular" : kindRoll < 0.85 ? "win" : "milestone";
    const body =
      kind === "regular"
        ? pick(POST_BODIES_REGULAR)
        : kind === "win"
          ? pick(POST_BODIES_WIN)
          : pick(POST_BODIES_MILESTONE);
    // Community channel - weighted toward general/recovery; jobs/housing
    // give the desktop community's filters real content.
    const topicRoll = rnd();
    const topic =
      topicRoll < 0.34
        ? ("general" as const)
        : topicRoll < 0.52
          ? ("jobs" as const)
          : topicRoll < 0.68
            ? ("housing" as const)
            : topicRoll < 0.92
              ? ("recovery" as const)
              : ("gratitude" as const);
    // Exactly 3 pending + 2 flagged (recent) so moderation is never empty;
    // everything else approved. Approved generated posts stay older than the
    // hand-written pair so those two lead the public feed.
    const status = i < 3 ? "pending" : i < 5 ? "flagged" : "approved";
    const createdAt =
      status === "approved"
        ? now - int(5, 360) * DAY - int(0, 23) * 3600e3
        : now - int(6, 60) * 3600e3;
    posts.push({
      id: did(),
      authorId: author.id,
      authorName: author.name,
      authorRole: "member",
      avatarColor: author.avatarColor,
      body,
      kind,
      topic,
      status,
      hearts: heartsFrom(everyone, 30),
      comments: status === "approved" ? commentsFor(createdAt) : [],
      createdAt,
    });
  }

  // ── mentor sessions (12 months) ──────────────────────────────────────
  const sessions: Session[] = [];
  const modeFor = (): Session["mode"] => {
    const r = rnd();
    return r < 0.5 ? "in-person" : r < 0.8 ? "phone" : "video";
  };
  // ~40 for Marcus with his demo mentees, spread weekly-ish over the year.
  const demoMentees = [danielle, danielle, tyrell, andre]; // Danielle weighted
  for (let i = 0; i < 40; i++) {
    sessions.push({
      id: did(),
      mentorId: marcus.id,
      memberId: pick(demoMentees).id,
      mode: modeFor(),
      minutes: int(20, 60),
      note: rnd() < 0.7 ? pick(SESSION_NOTES) : undefined,
      createdAt: now - int(0, 360) * DAY - int(8, 18) * 3600e3,
    });
  }
  // A few hundred across the other mentors and their own mentees.
  const menteesOf = new Map<string, User[]>();
  for (const m of generated) {
    const list = menteesOf.get(m.mentorId!) ?? [];
    list.push(m);
    menteesOf.set(m.mentorId!, list);
  }
  for (let i = 0; i < 300; i++) {
    const mentor = mentors[1 + (i % (mentors.length - 1))];
    const mentees = menteesOf.get(mentor.id) ?? [];
    if (!mentees.length) continue;
    sessions.push({
      id: did(),
      mentorId: mentor.id,
      memberId: pick(mentees).id,
      mode: modeFor(),
      minutes: int(20, 60),
      note: rnd() < 0.5 ? pick(SESSION_NOTES) : undefined,
      createdAt: now - int(0, 360) * DAY - int(8, 18) * 3600e3,
    });
  }

  const dmThread: Thread = {
    id: did(),
    participantIds: [danielle.id, marcus.id],
    createdAt: now - 60 * 86400e3,
    messages: [
      {
        id: did(),
        senderId: marcus.id,
        senderName: "Marcus",
        kind: "text",
        body: "Proud of you for Tuesday. Same time this week?",
        createdAt: now - 3600e3 * 5,
      },
      {
        id: did(),
        senderId: danielle.id,
        senderName: "Danielle",
        kind: "text",
        body: "Yes! And I finished lesson 2 already 😊",
        createdAt: now - 3600e3 * 4,
      },
    ],
  };
  const tyThread: Thread = {
    id: did(),
    participantIds: [tyrell.id, marcus.id],
    createdAt: now - 40 * 86400e3,
    messages: [
      {
        id: did(),
        senderId: marcus.id,
        senderName: "Marcus",
        kind: "text",
        body: "Hey Tyrell - haven't seen you check in this week. No pressure, just thinking of you. Coffee Friday?",
        createdAt: now - 6 * 86400e3,
      },
    ],
  };

  // ── LMS: courses + enrollments (added in seed v3 - keep AFTER all v2
  //    sections so earlier PRNG draws and seed-* ids stay byte-identical) ─
  const courses: Course[] = [
    { id: "course-ise-1", title: "ISE Course 1 - Honesty", program: "PON", lessonCount: 6 },
    { id: "course-ise-2", title: "ISE Course 2 - Hope", program: "PON", lessonCount: 6 },
    { id: "course-ise-3", title: "ISE Course 3 - Decision", program: "PON", lessonCount: 6 },
    { id: "course-forklift", title: "Forklift Certification", program: "VOC", lessonCount: 8 },
    { id: "course-docs-id", title: "Documents & ID Recovery", program: "NAV", lessonCount: 4 },
    { id: "course-relapse-basics", title: "Relapse Prevention Basics", program: "IOP", lessonCount: 5 },
  ];

  // Danielle mirrors her demo cards: ISE Course 3 in progress (lesson 3 is
  // next - 2/6 done, the closest integers get to the demo's 45%), Forklift
  // just started, Documents & ID fully complete.
  const enrollments: Enrollment[] = [
    {
      id: did(),
      memberId: danielle.id,
      courseId: "course-ise-3",
      completedLessons: [1, 2],
      updatedAt: now - 2 * DAY,
    },
    {
      id: did(),
      memberId: danielle.id,
      courseId: "course-forklift",
      completedLessons: [1],
      updatedAt: now - 5 * DAY,
    },
    {
      id: did(),
      memberId: danielle.id,
      courseId: "course-docs-id",
      completedLessons: [1, 2, 3, 4],
      updatedAt: now - 20 * DAY,
    },
  ];

  // 300 distinct generated members with 1–2 enrollments and plausible progress.
  const enrolled = new Set<User>();
  while (enrolled.size < 300) enrolled.add(pick(generated));
  for (const member of enrolled) {
    const count = rnd() < 0.55 ? 1 : 2;
    const chosen = new Set<Course>();
    while (chosen.size < count) chosen.add(pick(courses));
    for (const course of chosen) {
      const done = int(0, course.lessonCount);
      enrollments.push({
        id: did(),
        memberId: member.id,
        courseId: course.id,
        completedLessons: Array.from({ length: done }, (_, k) => k + 1),
        updatedAt: now - int(0, 60) * DAY - int(0, 23) * 3600e3,
      });
    }
  }

  // ── Community expansion (added in seed v6 - keep AFTER all v5 sections
  //    so earlier PRNG draws and seed-* ids stay byte-identical) ─────────

  // ── circles ──────────────────────────────────────────────────────────
  const circles: Circle[] = [
    {
      id: "circle-job-seekers",
      name: "Job Seekers",
      kind: "topic",
      description:
        "Applications, interviews, first days - we keep each other going.",
      staffModerated: false,
    },
    {
      id: "circle-new-in-recovery",
      name: "New in Recovery",
      kind: "topic",
      description: "The first weeks are the hardest. Nobody walks them alone here.",
      staffModerated: true,
    },
    {
      id: "circle-parents-in-recovery",
      name: "Parents in Recovery",
      kind: "topic",
      description: "Showing up for our kids while we show up for ourselves.",
      staffModerated: false,
    },
    {
      id: "circle-gratitude",
      name: "Gratitude Circle",
      kind: "topic",
      description: "Daily gratitude and wins of the week - big or small, they count.",
      staffModerated: false,
    },
    {
      id: "circle-laveen-alumni",
      name: "Laveen Alumni",
      kind: "alumni",
      description: "Once Laveen, always Laveen. Stay connected, give back.",
      staffModerated: true,
      centerId: laveen.id,
    },
    {
      id: "circle-south-phoenix-alumni",
      name: "South Phoenix Alumni",
      kind: "alumni",
      description: "South Phoenix family, past and present.",
      staffModerated: true,
      centerId: southPhoenix.id,
    },
  ];

  // ── Danielle flagship storyline (hand-written, kept verbatim) ─────────
  const circleMemberships: CircleMembership[] = [
    { id: did(), circleId: "circle-job-seekers", memberId: danielle.id, joinedAt: now - 55 * DAY },
    { id: did(), circleId: "circle-new-in-recovery", memberId: danielle.id, joinedAt: now - 80 * DAY },
    { id: did(), circleId: "circle-laveen-alumni", memberId: danielle.id, joinedAt: now - 35 * DAY },
  ];

  // Housing goal - linked to her existing "Hallway house" QR funding request.
  const danielleHousingRequest = requests.find(
    (r) => r.memberId === danielle.id && r.label === "Hallway house"
  )!;
  const recoveryGoals: RecoveryGoal[] = [
    {
      id: did(),
      memberId: danielle.id,
      title: "Get my own place",
      domain: "housing",
      why: "My kids need somewhere that's ours.",
      status: "active",
      visibility: "mentor",
      linkedRequestId: danielleHousingRequest.id,
      createdAt: now - 28 * DAY,
    },
    {
      id: did(),
      memberId: danielle.id,
      title: "Full-time warehouse role",
      domain: "employment",
      why: "Steady hours mean I can plan a life, not just a week.",
      status: "active",
      visibility: "mentor",
      createdAt: now - 45 * DAY,
    },
  ];
  const danielleHousingGoal = recoveryGoals[0];
  const danielleJobGoal = recoveryGoals[1];

  const goalMilestones: GoalMilestone[] = [
    { id: did(), goalId: danielleHousingGoal.id, title: "Call 3 halfway houses", done: true, sort: 0 },
    { id: did(), goalId: danielleHousingGoal.id, title: "Save first week's rent", done: true, sort: 1 },
    { id: did(), goalId: danielleHousingGoal.id, title: "Gather my ID documents", done: true, sort: 2 },
    { id: did(), goalId: danielleHousingGoal.id, title: "Reach $175/week in support", done: false, sort: 3 },
    { id: did(), goalId: danielleHousingGoal.id, title: "Sign and move in", done: false, sort: 4 },
    { id: did(), goalId: danielleJobGoal.id, title: "Finish my résumé", done: true, sort: 0 },
    { id: did(), goalId: danielleJobGoal.id, title: "Apply to four warehouse jobs", done: true, sort: 1 },
    { id: did(), goalId: danielleJobGoal.id, title: "Accept the right offer", done: false, sort: 2 },
  ];

  const jobApplications: JobApplication[] = [
    {
      id: did(),
      memberId: danielle.id,
      company: "Desert Logistics",
      role: "Warehouse Associate",
      status: "offer",
      notes: "Offer on the table! Talking pay and schedule through with Marcus.",
      nextActionDate: "2026-07-07",
      createdAt: now - 21 * DAY,
    },
    {
      id: did(),
      memberId: danielle.id,
      company: "Fresh Start Foods",
      role: "Warehouse Associate",
      status: "interview",
      notes: "Second interview Thursday. They liked my inventory experience.",
      nextActionDate: "2026-07-09",
      createdAt: now - 14 * DAY,
    },
    {
      id: did(),
      memberId: danielle.id,
      company: "Phoenix Fulfillment",
      role: "Picker/Packer",
      status: "applied",
      notes: "Applied online. Follow up by phone if no word by Friday.",
      nextActionDate: "2026-07-10",
      createdAt: now - 8 * DAY,
    },
    {
      id: did(),
      memberId: danielle.id,
      company: "Metro Distribution",
      role: "Warehouse Associate",
      status: "closed",
      notes: "Went with someone else. On to the next one.",
      createdAt: now - 30 * DAY,
    },
  ];

  const resumes: Resume[] = [
    {
      id: did(),
      memberId: danielle.id,
      fullName: "Danielle R.",
      headline: "Reliable warehouse & inventory associate",
      summary:
        "Dependable and detail-focused, with hands-on inventory experience from volunteering at my community center and two years on a busy kitchen line. I show up on time, count twice, and finish what I start. Currently completing my forklift certification.",
      contact: { email: "danielle@themystruggles.com", city: "Laveen, AZ" },
      template: "clean_blue",
      isPrimary: true,
      updatedAt: now - 3 * DAY,
    },
  ];
  const danielleResume = resumes[0];

  const resumeSections: ResumeSection[] = [
    {
      id: did(),
      resumeId: danielleResume.id,
      kind: "experience",
      sort: 0,
      content: {
        items: [
          {
            role: "Inventory volunteer",
            org: "My Struggle Laveen Center",
            dates: "2025–present",
            bullets: [
              "Count and restock donated goods weekly; keep records accurate to the item",
              "Trusted with intake logs and weekly supply reports",
            ],
          },
          {
            role: "Line cook",
            org: "Local diner",
            dates: "2019–2021",
            bullets: [
              "Worked a high-volume line with consistent quality and zero missed shifts in my final year",
              "Trained two new hires on prep and station setup",
            ],
          },
        ],
      },
    },
    {
      id: did(),
      resumeId: danielleResume.id,
      kind: "skills",
      sort: 1,
      content: {
        items: [
          "forklift (in training)",
          "inventory counts",
          "reliability",
          "deescalation",
        ],
      },
    },
    {
      id: did(),
      resumeId: danielleResume.id,
      kind: "education",
      sort: 2,
      content: {
        items: [
          { credential: "GED", org: "Phoenix Adult Education", year: "2026" },
          { credential: "ISE program", org: "My Struggle Laveen Center", year: "2025–present" },
        ],
      },
    },
    {
      id: did(),
      resumeId: danielleResume.id,
      kind: "certifications",
      sort: 3,
      content: {
        items: [{ name: "Forklift certification", status: "in progress" }],
      },
    },
  ];

  const profileDetails: ProfileDetails[] = [
    {
      userId: danielle.id,
      journeySince: "2025-05-03", // ~14 months before EPOCH
      tagline: "One week at a time.",
      interests: ["fitness", "cooking", "reading"],
      recoveryCapitalPublic: true,
      showMilestones: true,
    },
  ];

  // BARC-10 trend - three self-checks over three months, trending up.
  const barcScores = (vals: number[]): Record<string, number> =>
    Object.fromEntries(BARC_DOMAINS.map((d, i) => [d, vals[i]]));
  const barcChecks: BarcSelfCheck[] = [
    {
      id: did(),
      memberId: danielle.id,
      takenAt: now - 75 * DAY,
      scores: barcScores([4, 3, 2, 4, 3, 3, 2, 3, 3, 4]),
      total: 31,
    },
    {
      id: did(),
      memberId: danielle.id,
      takenAt: now - 45 * DAY,
      scores: barcScores([4, 4, 3, 4, 4, 4, 3, 3, 3, 4]),
      total: 36,
    },
    {
      id: did(),
      memberId: danielle.id,
      takenAt: now - 14 * DAY,
      scores: barcScores([5, 4, 4, 5, 4, 4, 4, 3, 4, 4]),
      total: 41,
    },
  ];

  // ── generated breadth - circles, goals, profiles, résumés, BARC ───────

  // ~120 members with 1–2 circle memberships, weighted toward their
  // center's alumni circle plus one topic circle.
  const topicCircles = circles.filter((c) => c.kind === "topic");
  const circleJoiners = new Set<User>();
  while (circleJoiners.size < 120) circleJoiners.add(pick(generated));
  for (const m of circleJoiners) {
    const joined = new Set<Circle>();
    if (rnd() < 0.6)
      joined.add(m.centerId === laveen.id ? circles[4] : circles[5]);
    joined.add(pick(topicCircles));
    for (const c of joined) {
      circleMemberships.push({
        id: did(),
        circleId: c.id,
        memberId: m.id,
        joinedAt: now - int(1, 180) * DAY,
      });
    }
  }

  // ~40 members with one recovery goal each (2–4 milestones, some achieved);
  // ~10 of those also track 1–3 job applications.
  const goalMemberSet = new Set<User>();
  while (goalMemberSet.size < 40) goalMemberSet.add(pick(generated));
  const goalMembers = [...goalMemberSet];
  for (let gi = 0; gi < goalMembers.length; gi++) {
    const m = goalMembers[gi];
    const tpl = pick(GOAL_TEMPLATES);
    const achieved = rnd() < 0.25;
    const createdAt = now - int(20, 150) * DAY;
    const visRoll = rnd();
    const goal: RecoveryGoal = {
      id: did(),
      memberId: m.id,
      title: tpl.title,
      domain: tpl.domain,
      why: tpl.why,
      status: achieved ? "achieved" : "active",
      achievedAt: achieved ? now - int(1, 19) * DAY : undefined,
      visibility: visRoll < 0.4 ? "mentor" : visRoll < 0.7 ? "private" : "circle",
      createdAt,
    };
    recoveryGoals.push(goal);
    const msCount = Math.min(int(2, 4), tpl.milestones.length);
    const doneCount = achieved ? msCount : int(0, msCount - 1);
    for (let s = 0; s < msCount; s++) {
      goalMilestones.push({
        id: did(),
        goalId: goal.id,
        title: tpl.milestones[s],
        done: s < doneCount,
        sort: s,
      });
    }
    if (gi < 10) {
      const apps = int(1, 3);
      for (let a = 0; a < apps; a++) {
        const statusRoll = rnd();
        const status =
          statusRoll < 0.45
            ? ("applied" as const)
            : statusRoll < 0.7
              ? ("interview" as const)
              : statusRoll < 0.85
                ? ("closed" as const)
                : ("offer" as const);
        jobApplications.push({
          id: did(),
          memberId: m.id,
          company: pick(JOB_COMPANIES),
          role: pick(JOB_ROLES),
          status,
          notes: rnd() < 0.6 ? pick(JOB_NOTES) : undefined,
          nextActionDate:
            status === "applied" || status === "interview"
              ? `2026-07-${String(int(6, 20)).padStart(2, "0")}`
              : undefined,
          createdAt: now - int(2, 60) * DAY,
        });
      }
    }
  }

  // ~15 members with profile details.
  const profiled = new Set<User>();
  while (profiled.size < 15) profiled.add(pick(generated));
  for (const m of profiled) {
    const nInterests = int(1, 3);
    const interests = new Set<string>();
    while (interests.size < nInterests) interests.add(pick(INTEREST_POOL));
    const sinceMonths = int(3, 30);
    const since = new Date(now - sinceMonths * 30 * DAY);
    profileDetails.push({
      userId: m.id,
      journeySince: since.toISOString().slice(0, 10),
      tagline: pick(TAGLINES),
      interests: [...interests],
      recoveryCapitalPublic: rnd() < 0.5,
      showMilestones: rnd() < 0.8,
    });
  }

  // ~10 members with a basic résumé (2 sections).
  const resumeMembers = new Set<User>();
  while (resumeMembers.size < 10) resumeMembers.add(pick(generated));
  for (const m of resumeMembers) {
    const resume: Resume = {
      id: did(),
      memberId: m.id,
      fullName: `${m.name} ${String.fromCharCode(65 + int(0, 25))}.`,
      headline: pick(RESUME_HEADLINES),
      template: "clean_blue",
      isPrimary: true,
      updatedAt: now - int(1, 45) * DAY,
    };
    resumes.push(resume);
    resumeSections.push({
      id: did(),
      resumeId: resume.id,
      kind: "experience",
      sort: 0,
      content: { items: [pick(RESUME_EXPERIENCE_ITEMS)] },
    });
    const nSkills = int(3, 4);
    const skills = new Set<string>();
    while (skills.size < nSkills) skills.add(pick(SKILL_POOL));
    resumeSections.push({
      id: did(),
      resumeId: resume.id,
      kind: "skills",
      sort: 1,
      content: { items: [...skills] },
    });
  }

  // ~25 BARC self-checks spread across other members.
  const barcMembers = new Set<User>();
  while (barcMembers.size < 25) barcMembers.add(pick(generated));
  for (const m of barcMembers) {
    const vals = BARC_DOMAINS.map(() => int(0, 5));
    barcChecks.push({
      id: did(),
      memberId: m.id,
      takenAt: now - int(1, 90) * DAY - int(0, 23) * 3600e3,
      scores: barcScores(vals),
      total: vals.reduce((a, b) => a + b, 0),
    });
  }

  // ── circle posts (~20) - same shape as existing posts + circleId ──────
  // Main-feed posts keep circleId undefined; circle posts are scoped.
  type CirclePost = Post & { circleId: string };

  // Danielle's circle posts (hand-written - flagship storyline).
  const daniellePosts: CirclePost[] = [
    {
      id: did(),
      authorId: danielle.id,
      authorName: "Danielle",
      authorRole: "member",
      avatarColor: "#2E7CD6",
      body: "Four applications in and one offer on the table. Talking it through with my mentor this week.",
      kind: "win",
      status: "approved",
      circleId: "circle-job-seekers",
      hearts: heartsFrom(everyone, 12),
      comments: [],
      createdAt: now - 6 * DAY,
    },
    {
      id: did(),
      authorId: danielle.id,
      authorName: "Danielle",
      authorRole: "member",
      avatarColor: "#2E7CD6",
      body: "Grateful for everyone at Laveen who's walked this with me. $70 to go on my weekly goal.",
      kind: "regular",
      status: "approved",
      circleId: "circle-laveen-alumni",
      hearts: heartsFrom(everyone, 8),
      comments: [],
      createdAt: now - 9 * DAY,
    },
  ];
  posts.push(...daniellePosts);

  // 18 generated circle posts from actual circle members, spread over 60
  // days (5+ days old so the hand-written pair still leads the main feed).
  const usersById = new Map(members.map((m) => [m.id, m]));
  const circleMemberPools = new Map<string, User[]>();
  for (const cm of circleMemberships) {
    const u = usersById.get(cm.memberId);
    if (!u) continue;
    const list = circleMemberPools.get(cm.circleId) ?? [];
    list.push(u);
    circleMemberPools.set(cm.circleId, list);
  }
  for (let i = 0; i < 18; i++) {
    const circle = circles[i % circles.length];
    const pool = circleMemberPools.get(circle.id) ?? [];
    if (!pool.length) continue;
    const author = pick(pool);
    const flavored = CIRCLE_POST_BODIES[circle.id] ?? [];
    const body =
      flavored.length && rnd() < 0.6
        ? pick(flavored)
        : pick(POST_BODIES_REGULAR);
    const createdAt = now - int(5, 60) * DAY - int(0, 23) * 3600e3;
    const cp: CirclePost = {
      id: did(),
      authorId: author.id,
      authorName: author.name,
      authorRole: "member",
      avatarColor: author.avatarColor,
      body,
      kind: rnd() < 0.85 ? "regular" : "win",
      status: "approved",
      circleId: circle.id,
      hearts: heartsFrom(everyone, 15),
      comments: commentsFor(createdAt),
      createdAt,
    };
    posts.push(cp);
  }

  // ── Continuum of Care (added in seed v7 - keep AFTER all v6 sections so
  //    earlier PRNG draws and seed-* ids stay byte-identical) ─────────────
  // The spine: care_episodes + phase_transitions + continuum_events. Danielle
  // traverses ALL FIVE phases end to end; her continuum_events are DERIVED
  // from her already-seeded artifacts (the "hooks in seed" idea - no module
  // is rewritten), then enriched with her ongoing community rhythm so the
  // ribbon + sparkline read as a living 14-month timeline.

  const careEpisodes: CareEpisode[] = [];
  const phaseTransitions: PhaseTransition[] = [];
  const continuumEvents: ContinuumEvent[] = [];

  const PHASE_ORDER: CarePhase[] = [
    "pre_care",
    "intake",
    "in_program",
    "transition",
    "continuing",
  ];
  const LOC_POOL: LevelOfCare[] = [
    "detox",
    "residential",
    "php",
    "iop",
    "op",
    "recovery_maintenance",
  ];
  const REFERRAL_SOURCES = ["self", "community", "partner", "court", "hospital"];
  const DISCHARGE_TYPES = [
    "completed",
    "stepped_down",
    "left_early",
    "transferred",
  ];
  const CONTINUUM_SOURCES: ContinuumSource[] = [
    "community",
    "lms",
    "goal",
    "giving",
    "mentorship",
    "checkin",
    "session",
    "phase",
  ];
  const BREADTH_REASONS = [
    "Assessment complete - welcomed them into the next step of their care.",
    "Great progress this week; ready to move forward together.",
    "Stepped down a level after hitting their goals. Proud of them.",
    "Discharge planning underway - housing and work goals set.",
    "Graduated to alumni. Still showing up, still supported.",
    "Reconnected after a quiet stretch; back on track.",
  ];

  // ── DANIELLE: one 14-month episode across all five phases ─────────────
  // pre_care 2mo → intake 2wk → in_program (IOP) 4mo → transition 1mo →
  // continuing since. All timestamps hang off EPOCH (never Date.now()).
  const dStart = now - 425 * DAY; // ~14 months before EPOCH
  const dIntakeAt = dStart + 60 * DAY;
  const dInProgramAt = dStart + 74 * DAY; // +2wk intake
  const dTransitionAt = dStart + 194 * DAY; // +4mo IOP
  const dContinuingAt = dStart + 224 * DAY; // +1mo transition

  const danielleEpisode: CareEpisode = {
    id: did(),
    memberId: danielle.id,
    centerId: laveen.id,
    carePhase: "continuing",
    levelOfCare: "iop",
    startedAt: dStart,
    phaseChangedAt: dContinuingAt,
    endedAt: undefined, // continuing is indefinite - the relationship stays open
    referralSource: "community",
    dischargeType: "completed",
  };
  careEpisodes.push(danielleEpisode);

  const danielleTransitions: PhaseTransition[] = [
    {
      id: did(),
      episodeId: danielleEpisode.id,
      fromPhase: "pre_care",
      toPhase: "intake",
      changedBy: sarah.id,
      reason:
        "Danielle walked into Laveen and said she was ready. We started her intake that same afternoon.",
      at: dIntakeAt,
    },
    {
      id: did(),
      episodeId: danielleEpisode.id,
      fromPhase: "intake",
      toPhase: "in_program",
      toLoc: "iop",
      changedBy: sarah.id,
      reason:
        "Assessment done - Danielle's a great fit for our IOP cohort. Welcome to the program.",
      at: dInProgramAt,
    },
    {
      id: did(),
      episodeId: danielleEpisode.id,
      fromPhase: "in_program",
      toPhase: "transition",
      fromLoc: "iop",
      changedBy: sarah.id,
      reason:
        "Danielle finished her IOP hours. We started planning her step-down together - housing and work first.",
      at: dTransitionAt,
    },
    {
      id: did(),
      episodeId: danielleEpisode.id,
      fromPhase: "transition",
      toPhase: "continuing",
      changedBy: sarah.id,
      reason:
        "Danielle graduated to alumni. She's working toward her own place and still shows up every week.",
      at: dContinuingAt,
    },
  ];
  phaseTransitions.push(...danielleTransitions);

  const emitSeed = (
    source: ContinuumSource,
    weight: number,
    occurredAt: number,
    refId?: string
  ): void => {
    continuumEvents.push({
      id: did(),
      memberId: danielle.id,
      source,
      refId,
      weight,
      occurredAt,
    });
  };

  // (1) posts + comments she authored → community (weight 2), dated to each.
  for (const p of posts) {
    if (p.authorId === danielle.id) emitSeed("community", 2, p.createdAt, p.id);
    for (const c of p.comments) {
      if (c.authorId === danielle.id)
        emitSeed("community", 2, c.createdAt, c.id);
    }
  }

  // (2) lesson completions → lms (weight 3), spread across the in-program window.
  const danielleEnrollments = enrollments.filter(
    (e) => e.memberId === danielle.id
  );
  const totalLessons = danielleEnrollments.reduce(
    (s, e) => s + e.completedLessons.length,
    0
  );
  let lessonIdx = 0;
  for (const e of danielleEnrollments) {
    for (let li = 0; li < e.completedLessons.length; li++) {
      const frac = (lessonIdx + 1) / (totalLessons + 1);
      const at = Math.round(
        dInProgramAt + frac * (dTransitionAt - dInProgramAt)
      );
      emitSeed("lms", 3, at, e.id);
      lessonIdx++;
    }
  }

  // (3) completed goal milestones → goal (weight 3), across transition→now.
  const danielleGoalIds = new Set([danielleHousingGoal.id, danielleJobGoal.id]);
  const danielleDoneMs = goalMilestones.filter(
    (m) => danielleGoalIds.has(m.goalId) && m.done
  );
  for (let mi = 0; mi < danielleDoneMs.length; mi++) {
    const frac = (mi + 1) / (danielleDoneMs.length + 1);
    const at = Math.round(dTransitionAt + frac * (now - dTransitionAt));
    emitSeed("goal", 3, at, danielleDoneMs[mi].id);
  }

  // (4) donations to her → giving (weight 2), dated to each donation.
  for (const dn of donations) {
    if (dn.memberId === danielle.id) emitSeed("giving", 2, dn.createdAt, dn.id);
  }

  // (5) Marcus sessions with her → session (weight 4).
  for (const s of sessions) {
    if (s.memberId === danielle.id) emitSeed("session", 4, s.createdAt, s.id);
  }

  // (6) BARC self-checks → checkin (weight 3).
  for (const b of barcChecks) {
    if (b.memberId === danielle.id) emitSeed("checkin", 3, b.takenAt, b.id);
  }

  // (7) one phase event (weight 5) per transition - the outcomes markers.
  for (const t of danielleTransitions) emitSeed("phase", 5, t.at, t.id);

  // (8) ongoing rhythm across the full 14-month arc - her day-to-day
  //     community life, check-ins, and mentor touches (not re-listing a
  //     specific artifact) so the sparkline spans every month and looks alive.
  for (let t = dStart + 5 * DAY; t < now; t += int(8, 14) * DAY) {
    const r = rnd();
    const src: ContinuumSource =
      r < 0.45 ? "community" : r < 0.75 ? "checkin" : "session";
    const weight = src === "community" ? 2 : src === "checkin" ? 3 : 4;
    emitSeed(src, weight, t + int(0, 23) * 3600e3);
  }

  // ── BREADTH: ~60 generated members across phases/LOCs with histories ──
  const continuumMemberSet = new Set<User>();
  while (continuumMemberSet.size < 60) continuumMemberSet.add(pick(generated));
  for (const m of continuumMemberSet) {
    const phaseRoll = rnd();
    const carePhase: CarePhase =
      phaseRoll < 0.15
        ? "pre_care"
        : phaseRoll < 0.3
          ? "intake"
          : phaseRoll < 0.6
            ? "in_program"
            : phaseRoll < 0.75
              ? "transition"
              : "continuing";
    // pre-care members are unaffiliated (no center visible).
    const centerId = carePhase === "pre_care" ? undefined : m.centerId;
    // an LOC exists once they've been in programming.
    const hadProgram =
      carePhase === "in_program" ||
      carePhase === "transition" ||
      carePhase === "continuing";
    const loc = hadProgram ? pick(LOC_POOL) : undefined;

    const episodeStart = now - int(60, 420) * DAY;
    const phaseChangedAt = now - int(1, 40) * DAY;
    const ep: CareEpisode = {
      id: did(),
      memberId: m.id,
      centerId,
      carePhase,
      levelOfCare: loc,
      startedAt: episodeStart,
      phaseChangedAt,
      // continuing members completed their program (episode discharge logged).
      endedAt: carePhase === "continuing" ? phaseChangedAt : undefined,
      referralSource: pick(REFERRAL_SOURCES),
      dischargeType:
        carePhase === "continuing" || carePhase === "transition"
          ? pick(DISCHARGE_TYPES)
          : undefined,
    };
    careEpisodes.push(ep);

    // 1–3 append-only transitions walking the tail of the phase order.
    const ci = PHASE_ORDER.indexOf(carePhase);
    const steps: { from?: CarePhase; to: CarePhase }[] = [];
    for (let j = 0; j <= ci; j++) {
      steps.push({ from: j > 0 ? PHASE_ORDER[j - 1] : undefined, to: PHASE_ORDER[j] });
    }
    const nT = Math.max(1, Math.min(int(1, 3), steps.length));
    const chosen = steps.slice(steps.length - nT);
    for (let k = 0; k < chosen.length; k++) {
      const at = Math.round(
        episodeStart +
          ((k + 1) / (chosen.length + 1)) * (phaseChangedAt - episodeStart)
      );
      phaseTransitions.push({
        id: did(),
        episodeId: ep.id,
        fromPhase: chosen[k].from,
        toPhase: chosen[k].to,
        toLoc: chosen[k].to === "in_program" ? loc : undefined,
        changedBy: sarah.id,
        reason: pick(BREADTH_REASONS),
        at,
      });
    }

    // 5–20 sparse events with generic PRNG weights (no artifact cross-ref).
    const nE = int(5, 20);
    for (let e = 0; e < nE; e++) {
      continuumEvents.push({
        id: did(),
        memberId: m.id,
        source: pick(CONTINUUM_SOURCES),
        weight: int(1, 5),
        occurredAt:
          episodeStart + Math.floor(rnd() * (now - episodeStart)),
      });
    }
  }

  // Laveen's seeded program_group channel is the IOP cohort
  // ("cohort-iop-laveen", titled "IOP Cohort · Tuesdays"), and the program
  // cockpit attaches that channel to the FIRST level-of-care group in
  // clinical order - so Laveen in-program members randomly drawn as "detox"/
  // "residential"/"php" made the IOP-titled cohort read the wrong LOC.
  // Laveen is the demo outreach center and its flagship group IS the IOP
  // cohort, so normalize those higher-intensity draws to "iop": IOP then
  // sorts first and the channel lands on it. Post-hoc mutation only - no
  // PRNG draws, no new ids, everything else stays byte-identical.
  const laveenIopFix = new Set<LevelOfCare>(["detox", "residential", "php"]);
  const laveenIopFixIds = new Set<string>();
  for (const ep of careEpisodes) {
    if (
      ep.centerId === laveen.id &&
      ep.carePhase === "in_program" &&
      ep.levelOfCare !== undefined &&
      laveenIopFix.has(ep.levelOfCare)
    ) {
      ep.levelOfCare = "iop";
      laveenIopFixIds.add(ep.id);
    }
  }
  for (const t of phaseTransitions) {
    if (
      laveenIopFixIds.has(t.episodeId) &&
      t.toLoc !== undefined &&
      laveenIopFix.has(t.toLoc)
    ) {
      t.toLoc = "iop";
    }
  }

  // ── Community Ad Product (added in seed v8 - keep AFTER all v7 sections
  //    so earlier PRNG draws and seed-* ids stay byte-identical) ──────────
  // Sponsored placements sold to the two seed centers, running in the
  // community feed. Every timestamp hangs off EPOCH (never Date.now()).
  // Trust rules are enforced at serve time (app/api/placements/serve); the
  // seed just makes the ad manager + review queue + analytics look alive.

  const sponsoredPlacements: SponsoredPlacement[] = [];
  const placementEvents: PlacementEvent[] = [];

  /** Populate ~30–120 aggregate events for a running placement:
   *  impressions >> clicks > dismiss, plus a couple of reports. memberId is
   *  recorded server-side ONLY (cap/dedup) and never exposed to advertisers. */
  const seedEvents = (placementId: string, impressions: number): void => {
    const clicks = Math.max(3, Math.round(impressions * 0.08));
    const dismiss = Math.max(1, Math.round(impressions * 0.03));
    const reports = int(1, 2);
    const push = (kind: PlacementEvent["kind"], n: number): void => {
      for (let i = 0; i < n; i++) {
        placementEvents.push({
          id: did(),
          placementId,
          kind,
          memberId: pick(members).id, // internal cap/dedup only - never surfaced
          occurredAt: now - int(0, 14) * DAY - int(0, 23) * 3600e3,
        });
      }
    };
    push("impression", impressions);
    push("click", clicks);
    push("dismiss", dismiss);
    push("report", reports);
  };

  // (1) APPROVED + running - Laveen alumni event, targeted to alumni (continuing).
  const bbq: SponsoredPlacement = {
    id: did(),
    orgId: laveen.id,
    orgName: laveen.name,
    title: "Laveen Alumni BBQ - Saturday",
    body: "Alumni, families, and mentors - join us Saturday at noon for food, music, and a chance to reconnect. Bring someone you're walking beside.",
    ctaLabel: "RSVP",
    ctaUrl: "https://example.org/laveen/alumni-bbq",
    kind: "alumni_event",
    audienceScope: "circle",
    targeting: { circleId: "circle-laveen-alumni", phase: "continuing" },
    status: "running",
    startsAt: now - 6 * DAY,
    endsAt: now + 8 * DAY,
    budgetCents: 15000,
    approvedBy: sarah.id,
    createdAt: now - 10 * DAY,
  };
  // (2) APPROVED + running - fair-chance job opening, coarse employment interest.
  const job: SponsoredPlacement = {
    id: did(),
    orgId: southPhoenix.id,
    orgName: southPhoenix.name,
    title: "Warehouse Associates - Desert Logistics, fair-chance employer",
    body: "Desert Logistics is hiring warehouse associates and welcomes applicants in recovery - a fair-chance employer that hires on who you are today. Steady hours, weekly pay.",
    ctaLabel: "Apply",
    ctaUrl: "https://example.org/desert-logistics/warehouse",
    kind: "job_opening",
    audienceScope: "phase",
    targeting: { phase: "continuing", interestTags: ["employment"], metro: "Phoenix, AZ" },
    status: "running",
    startsAt: now - 12 * DAY,
    endsAt: now + 18 * DAY,
    budgetCents: 25000,
    approvedBy: sarah.id,
    createdAt: now - 15 * DAY,
  };
  // (3) APPROVED + running - IOP program starting, community-wide by metro.
  const iop: SponsoredPlacement = {
    id: did(),
    orgId: laveen.id,
    orgName: laveen.name,
    title: "New IOP cohort starts Monday",
    body: "Our next Intensive Outpatient cohort begins Monday. Daytime and evening tracks, transportation help available. Talk to us about whether it's the right next step.",
    ctaLabel: "Learn more",
    ctaUrl: "https://example.org/laveen/iop-cohort",
    kind: "program",
    audienceScope: "geo",
    targeting: { metro: "Phoenix, AZ", interestTags: ["recovery"] },
    status: "running",
    startsAt: now - 4 * DAY,
    endsAt: now + 10 * DAY,
    budgetCents: 20000,
    approvedBy: sarah.id,
    createdAt: now - 7 * DAY,
  };
  // (4) PENDING_REVIEW - waiting in the ms_admin queue (recovery-relevant, clean).
  const pending: SponsoredPlacement = {
    id: did(),
    orgId: southPhoenix.id,
    orgName: southPhoenix.name,
    title: "Free resume workshop for members",
    body: "Bring your work history - our navigators will help you build a fair-chance-ready resume in one sitting. Coffee provided.",
    ctaLabel: "Save my seat",
    ctaUrl: "https://example.org/south-phoenix/resume-workshop",
    kind: "service",
    audienceScope: "community",
    targeting: { interestTags: ["employment"] },
    status: "pending_review",
    budgetCents: 10000,
    createdAt: now - 1 * DAY,
  };
  // (5) REJECTED - kept as the ms_admin console's rejected example.
  const rejected: SponsoredPlacement = {
    id: did(),
    orgId: southPhoenix.id,
    orgName: southPhoenix.name,
    title: "Recovery social - happy hour mocktails and more",
    body: "Join us after work for drinks and connection. Wine and beer available for guests.",
    ctaLabel: "RSVP",
    ctaUrl: "https://example.org/south-phoenix/social",
    kind: "announcement",
    audienceScope: "community",
    targeting: {},
    status: "rejected",
    rejectionReason: "Off-policy: references alcohol.",
    createdAt: now - 3 * DAY,
  };
  sponsoredPlacements.push(bbq, job, iop, pending, rejected);
  seedEvents(bbq.id, int(70, 110));
  seedEvents(job.id, int(80, 120));
  seedEvents(iop.id, int(50, 90));

  // ── demo leads (marketing-page contact-sales queue, varied status) ─────
  const demoLeads: DemoLead[] = [
    {
      id: did(),
      orgName: "Sonoran Ridge Recovery",
      contactName: "Patricia Nguyen",
      email: "pnguyen@sonoranridge.example.org",
      phone: "(602) 555-0142",
      message: "We run three IOP tracks and want to keep alumni engaged after discharge. Interested in the continuum + ad product.",
      source: "centers-page",
      status: "new",
      createdAt: now - 2 * DAY - 3 * 3600e3,
    },
    {
      id: did(),
      orgName: "Grand Canyon Wellness Collective",
      contactName: "Marcus Bell",
      email: "mbell@gcwellness.example.org",
      phone: "(480) 555-0199",
      message: "Grant-ready outcomes reporting is our big need. Can we see the retention curves?",
      source: "centers-page",
      status: "contacted",
      createdAt: now - 9 * DAY - 5 * 3600e3,
    },
    {
      id: did(),
      orgName: "Copper State Recovery Homes",
      contactName: "Dana Whitfield",
      email: "dana@copperstatehomes.example.org",
      source: "centers-page",
      status: "new",
      createdAt: now - 1 * DAY - 6 * 3600e3,
    },
    {
      id: did(),
      orgName: "Rio Salado Behavioral Health",
      contactName: "Eli Ramirez",
      email: "eramirez@riosalado.example.org",
      phone: "(623) 555-0176",
      message: "Do sponsored placements ever target by diagnosis? Our compliance team needs to confirm they do not.",
      source: "centers-page",
      status: "contacted",
      createdAt: now - 18 * DAY - 2 * 3600e3,
    },
    {
      id: did(),
      orgName: "Desert Bloom Treatment Center",
      contactName: "Yolanda Price",
      email: "yprice@desertbloomtc.example.org",
      message: "Closed the loop - signed for the platform tier. Following up on ad-product add-on next quarter.",
      source: "centers-page",
      status: "closed",
      createdAt: now - 40 * DAY - 4 * 3600e3,
    },
    {
      id: did(),
      orgName: "Superstition Springs Recovery",
      contactName: "Andre Coleman",
      email: "acoleman@superstitionsprings.example.org",
      phone: "(480) 555-0123",
      source: "centers-page",
      status: "new",
      createdAt: now - 4 * DAY - 8 * 3600e3,
    },
  ];

  // ── Care Channels + Consent + Follow-up cadence (added in seed v9 - keep
  //    AFTER all v8 sections so earlier PRNG draws and seed-* ids stay
  //    byte-identical) ──────────────────────────────────────────────────
  // In-program engagement comms (NOT clinical), a granular revocable consent
  // grant per center, and the post-discharge follow-up cadence. Danielle's
  // IOP cohort channel + 1:1 + a Laveen announcement anchor the demo; breadth
  // makes the program cockpit roster + alumni cadence dashboard look alive.
  // Every timestamp hangs off EPOCH (never Date.now()).

  const careChannels: CareChannel[] = [];
  const careMessages: CareMessage[] = [];
  const consentGrants: ConsentGrant[] = [];
  const followUps: FollowUpCheckin[] = [];

  const mkMsg = (
    channelId: string,
    sender: User,
    body: string,
    createdAt: number,
    moderationStatus?: CareMessage["moderationStatus"]
  ): void => {
    careMessages.push({
      id: did(),
      channelId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      body,
      createdAt,
      moderationStatus,
    });
  };

  // Each center gets a program_group channel (its IOP cohort) + an announcement
  // channel. Deterministic string ids so the four downstream agents can
  // reference them directly. Laveen's group is Danielle's cohort.
  const centerKey = (c: Center) => c.id.replace(/^center-/, "");
  for (const c of centers) {
    careChannels.push({
      id: `channel-iop-${centerKey(c)}`,
      centerId: c.id,
      kind: "program_group",
      title: "IOP Cohort · Tuesdays",
      cohortId: `cohort-iop-${centerKey(c)}`,
      createdAt: now - 210 * DAY,
    });
    careChannels.push({
      id: `channel-ann-${centerKey(c)}`,
      centerId: c.id,
      kind: "announcement",
      title:
        c.id === laveen.id
          ? "Center closed July 4 · Alumni BBQ Saturday"
          : "Weekly schedule & transportation updates",
      createdAt: now - 210 * DAY,
    });
  }

  // ── Danielle's IOP cohort channel (cohort-iop-laveen) ─────────────────
  // ~14 warm, engagement (NOT clinical) messages across her in-program window
  // (dInProgramAt → dTransitionAt): Sarah posts schedule/assignments/
  // encouragement, 8 distinct peers keep the roster alive, Danielle chimes in.
  const groupChannelId = "channel-iop-laveen";
  const oneToOneId = "channel-1to1-danielle";
  const laveenAnnId = "channel-ann-laveen";

  const GROUP_STAFF_MSGS = [
    "Morning, cohort! Reminder: group meets Tuesday at 5:30. Doors open at 5:15 - come grab coffee first.",
    "This week we're on coping skills. Please finish Lesson 2 in the Learn tab before Tuesday.",
    "Proud of the energy in group yesterday. Keep leaning on each other this week - that's the whole point.",
    "Small assignment: jot down three things that went right this week. We'll share a few Tuesday.",
  ];
  const GROUP_PEER_MSGS = [
    "See everyone Tuesday. This group keeps me steady.",
    "Finished the lesson early this week - it actually helped.",
    "Rough couple days but I'm still here. Thanks for the check-ins.",
    "Anyone want to carpool Tuesday? I've got room for two.",
    "Grateful for this cohort. Didn't think I'd say that a month ago.",
    "Did my three good things - first time I could name that many.",
    "Made it to every group this month. Small win, but I'll take it.",
    "Thanks Sarah - the bus pass made this week possible.",
  ];

  // 8 distinct Laveen peers (reuse seeded member names) for the roster.
  const laveenGenerated = generated.filter((m) => m.centerId === laveen.id);
  const cohortPeerSet = new Set<User>();
  while (cohortPeerSet.size < 8 && cohortPeerSet.size < laveenGenerated.length)
    cohortPeerSet.add(pick(laveenGenerated));
  const cohortPeers = [...cohortPeerSet];

  const gWinStart = dInProgramAt;
  const gSpan = dTransitionAt - dInProgramAt;
  const groupAuthored: { author: User; body: string }[] = [
    { author: sarah, body: GROUP_STAFF_MSGS[0] },
    { author: cohortPeers[0], body: GROUP_PEER_MSGS[0] },
    { author: cohortPeers[1], body: GROUP_PEER_MSGS[1] },
    { author: sarah, body: GROUP_STAFF_MSGS[1] },
    { author: danielle, body: "Coping-skills worksheet done. Actually used one today at work." },
    { author: cohortPeers[2], body: GROUP_PEER_MSGS[2] },
    { author: cohortPeers[3], body: GROUP_PEER_MSGS[3] },
    { author: sarah, body: GROUP_STAFF_MSGS[2] },
    { author: cohortPeers[4], body: GROUP_PEER_MSGS[4] },
    { author: cohortPeers[5], body: GROUP_PEER_MSGS[5] },
    { author: danielle, body: "Made every group this month. Thank you all for holding the door open." },
    { author: cohortPeers[6], body: GROUP_PEER_MSGS[6] },
    { author: cohortPeers[7], body: GROUP_PEER_MSGS[7] },
    { author: sarah, body: GROUP_STAFF_MSGS[3] },
  ];
  for (let i = 0; i < groupAuthored.length; i++) {
    const at =
      Math.round(gWinStart + ((i + 0.5) / groupAuthored.length) * gSpan) +
      int(0, 8) * 3600e3;
    const a = groupAuthored[i];
    mkMsg(groupChannelId, a.author, a.body, at, "approved");
  }

  // ── Danielle's 1:1 channel (Sarah ↔ Danielle) - ~6 reminders/check-ins ─
  careChannels.push({
    id: oneToOneId,
    centerId: laveen.id,
    kind: "one_to_one",
    title: "Sarah & Danielle",
    memberId: danielle.id,
    createdAt: dInProgramAt,
  });
  const oneToOne: { author: User; body: string }[] = [
    { author: sarah, body: "Hi Danielle - welcome to the cohort. I'm your point of contact any time you need something." },
    { author: danielle, body: "Thank you. Nervous, but I'm here." },
    { author: sarah, body: "You missed group Tuesday - everything okay? No pressure, just checking on you." },
    { author: danielle, body: "Bus ran late and I got discouraged. I'll be there Thursday, promise." },
    { author: sarah, body: "That's all I needed to hear. Left a bus pass for you at the front desk." },
    { author: danielle, body: "You're the best. See you Thursday." },
  ];
  for (let i = 0; i < oneToOne.length; i++) {
    const at =
      Math.round(gWinStart + ((i + 0.5) / oneToOne.length) * gSpan) +
      int(0, 6) * 3600e3;
    const a = oneToOne[i];
    mkMsg(oneToOneId, a.author, a.body, at);
  }

  // ── Announcement channels (one-way broadcasts) ────────────────────────
  mkMsg(
    laveenAnnId,
    sarah,
    "The center will be closed Friday, July 4 for the holiday. We reopen Saturday morning.",
    now - 5 * DAY,
    "approved"
  );
  mkMsg(
    laveenAnnId,
    sarah,
    "Alumni BBQ this Saturday at noon - food, music, and familiar faces. Bring someone you're walking beside.",
    now - 4 * DAY,
    "approved"
  );
  const spStaff = mentors.find((m) => m.centerId === southPhoenix.id) ?? marcus;
  mkMsg(
    "channel-ann-south-phoenix",
    spStaff,
    "New evening IOP track opens Monday - daytime spots still available too. Talk to us about the right fit.",
    now - 6 * DAY,
    "approved"
  );

  // ── Danielle's consent grant (granted during intake) ──────────────────
  consentGrants.push({
    id: "consent-danielle-laveen",
    memberId: danielle.id,
    centerId: laveen.id,
    scope: "continuum",
    grantedAt: dIntakeAt,
  });

  // ── Danielle's follow-up cadence (post-discharge, anchored at continuing)
  //    30/60/90 done (BARC 31/36/41, matching her self-checks), 180 + 365
  //    pending. Each done check-in emits a checkin continuum_event. ────────
  const danielleCadence: {
    dueDay: FollowUpCheckin["dueDay"];
    status: FollowUpCheckin["status"];
    barc?: number;
  }[] = [
    { dueDay: 30, status: "done", barc: 31 },
    { dueDay: 60, status: "done", barc: 36 },
    { dueDay: 90, status: "done", barc: 41 },
    { dueDay: 180, status: "pending" },
    { dueDay: 365, status: "pending" },
  ];
  for (const f of danielleCadence) {
    const completedAt =
      f.status === "done" ? dContinuingAt + f.dueDay * DAY : undefined;
    const fu: FollowUpCheckin = {
      id: did(),
      memberId: danielle.id,
      centerId: laveen.id,
      dueDay: f.dueDay,
      status: f.status,
      completedAt,
      barcTotal: f.barc,
    };
    followUps.push(fu);
    if (f.status === "done") {
      continuumEvents.push({
        id: did(),
        memberId: danielle.id,
        source: "checkin",
        refId: fu.id,
        weight: 3,
        occurredAt: completedAt!,
      });
    }
  }

  // ── BREADTH: ~40 post-program members get a consent grant + a follow-up
  //    set so the alumni dashboard + cadence look alive. Selected from the
  //    v7 continuum episodes (prefer discharged: continuing/transition, then
  //    top up with in_program) so consent + cadence sit on real episodes. ──
  const phaseByMember = new Map<string, CarePhase>();
  for (const ep of careEpisodes) phaseByMember.set(ep.memberId, ep.carePhase);
  const isPost = (m: User, ...phases: CarePhase[]) =>
    !!m.centerId && phases.includes(phaseByMember.get(m.id) ?? "pre_care");
  const alumniMembers = [
    ...generated.filter((m) => isPost(m, "continuing", "transition")),
    ...generated.filter((m) => isPost(m, "in_program")),
  ].slice(0, 40);

  const DUE_DAYS: FollowUpCheckin["dueDay"][] = [30, 60, 90, 180, 365];
  for (const m of alumniMembers) {
    const ep = careEpisodes.find((e) => e.memberId === m.id);
    // consent granted a couple weeks into their episode (intake handshake).
    const grantedAt = ep
      ? ep.startedAt + int(3, 20) * DAY
      : now - int(120, 400) * DAY;
    const revoked = rnd() < 0.08; // a few revocations, for negative-test coverage
    consentGrants.push({
      id: did(),
      memberId: m.id,
      centerId: m.centerId!,
      scope: "continuum",
      grantedAt,
      revokedAt: revoked ? grantedAt + int(60, 200) * DAY : undefined,
    });

    // Cadence anchored at discharge (endedAt when present, else a plausible date).
    const dischargeAt = ep?.endedAt ?? now - int(30, 400) * DAY;
    for (const d of DUE_DAYS) {
      const dueAt = dischargeAt + d * DAY;
      let status: FollowUpCheckin["status"];
      let completedAt: number | undefined;
      let barcTotal: number | undefined;
      if (dueAt > now) {
        status = "pending";
      } else if (rnd() < 0.8) {
        status = "done";
        completedAt = dueAt + int(0, 5) * DAY;
        barcTotal = int(28, 48);
      } else {
        status = "missed";
      }
      const fu: FollowUpCheckin = {
        id: did(),
        memberId: m.id,
        centerId: m.centerId!,
        dueDay: d,
        status,
        completedAt,
        barcTotal,
      };
      followUps.push(fu);
      if (status === "done") {
        continuumEvents.push({
          id: did(),
          memberId: m.id,
          source: "checkin",
          refId: fu.id,
          weight: 3,
          occurredAt: completedAt!,
        });
      }
    }
  }

  // ── Employer accounts + job posts (added in seed v10 - keep AFTER all v9
  //    sections so earlier PRNG draws and seed-* ids stay byte-identical) ───
  // Four recovery-friendly employers (fair-chance businesses + a peer-support
  // provider) each posting real openings members can see on the community
  // Hiring rail and the public /jobs board. Employers are Users with role
  // "employer"; every account signs in with the shared demo password
  // ("mystruggle"). Every timestamp hangs off EPOCH (never Date.now()).
  const mkEmployer = (
    contact: string,
    company: string,
    email: string,
    ageDays: number
  ): User =>
    mk("employer", contact, email, pick(AVATAR_PALETTE), {
      company,
      createdAt: now - ageDays * DAY,
    });

  const empSunValley = mkEmployer(
    "Rosa",
    "Sun Valley Warehouse",
    "hiring@sunvalleywarehouse.example.org",
    120
  );
  const empRoosevelt = mkEmployer(
    "Marcus",
    "Roosevelt Row Kitchen",
    "jobs@rooseveltrow.example.org",
    90
  );
  const empDesertBloom = mkEmployer(
    "Grace",
    "Desert Bloom Foods",
    "careers@desertbloomfoods.example.org",
    150
  );
  const empPeerWorks = mkEmployer(
    "Elena",
    "PeerWorks Recovery Services",
    "team@peerworks.example.org",
    60
  );
  const employers = [empSunValley, empRoosevelt, empDesertBloom, empPeerWorks];

  // `extra` (seed v15, docs/17) carries the structured posting fields - metro,
  // remote, pay cents, requirements, benefits, fairChanceNotes. Spread LAST so
  // it can only ADD optional fields; ids, status, and PRNG draw order are
  // untouched (the v10 rows stay byte-identical apart from the new keys).
  const mkJob = (
    employer: User,
    title: string,
    location: string,
    type: JobPost["type"],
    payRange: string,
    description: string,
    ageDays: number,
    status: JobPost["status"] = "open",
    extra: Partial<JobPost> = {}
  ): JobPost => ({
    id: did(),
    employerId: employer.id,
    title,
    company: employer.company!,
    location,
    type,
    payRange,
    description,
    recoveryFriendly: true,
    status,
    createdAt: now - ageDays * DAY - int(0, 23) * 3600e3,
    ...extra,
  });

  const jobPosts: JobPost[] = [
    mkJob(
      empSunValley,
      "Warehouse Associate",
      "Laveen, AZ",
      "full-time",
      "$17–$19/hr",
      "Pick, pack, and keep our floor moving. We hire on who you are today - no experience needed, we train. Steady daytime hours, weekly pay, and a team that has your back. Bus route stops at our door.",
      3,
      "open",
      {
        metro: "Laveen",
        remote: false,
        payMinCents: 1700,
        payMaxCents: 1900,
        payPeriod: "hour",
        requirements:
          "Able to lift 40 lbs and stay on your feet for a shift. No experience needed - we train from day one.",
        benefits:
          "Weekly pay, paid training, health coverage after 60 days, and a bus route that stops at our door.",
        fairChanceNotes:
          "Fair-chance employer. Records are considered individually after we meet you - never as a blanket rule.",
      }
    ),
    mkJob(
      empSunValley,
      "Forklift Operator",
      "Laveen, AZ",
      "full-time",
      "$19–$22/hr",
      "Certified or in training - we'll help you finish your cert. Move product safely across the warehouse floor. Fair-chance employer; we welcome applicants rebuilding their story.",
      9,
      "open",
      {
        metro: "Laveen",
        remote: false,
        payMinCents: 1900,
        payMaxCents: 2200,
        payPeriod: "hour",
        requirements:
          "Forklift certification, or active enrollment in a cert program - we help you finish it on the clock.",
        benefits:
          "Weekly pay, cert-completion support, health coverage after 60 days.",
        fairChanceNotes:
          "We participate in the Federal Bonding Program and review any record individually.",
      }
    ),
    mkJob(
      empRoosevelt,
      "Line Cook",
      "Phoenix, AZ",
      "full-time",
      "$16–$18/hr + tips",
      "Join a warm, busy kitchen that runs on teamwork. We care about showing up and giving your best, not about your past. Free shift meals, flexible scheduling around recovery commitments.",
      5,
      "open",
      {
        metro: "Phoenix",
        remote: false,
        payMinCents: 1600,
        payMaxCents: 1800,
        payPeriod: "hour",
        requirements:
          "Six months of line or prep experience helps but is not required. Food handler card - we cover the fee.",
        benefits:
          "Free shift meals, shared tips, and scheduling that flexes around meetings and appointments.",
        fairChanceNotes:
          "Your past does not disqualify you here. We hire on how you show up.",
      }
    ),
    mkJob(
      empRoosevelt,
      "Dishwasher / Prep",
      "Phoenix, AZ",
      "part-time",
      "$15–$16/hr",
      "A great first step back to steady work. Learn the kitchen from the ground up with a crew that celebrates progress. Part-time shifts that fit around class or meetings.",
      12,
      "open",
      {
        metro: "Phoenix",
        remote: false,
        payMinCents: 1500,
        payMaxCents: 1600,
        payPeriod: "hour",
        requirements:
          "Reliability and a willingness to learn. That is the whole list.",
        benefits:
          "Free shift meals, flexible part-time shifts, and a clear path to prep and line roles.",
        fairChanceNotes:
          "First-job-back friendly - many of our leads started right here.",
      }
    ),
    mkJob(
      empDesertBloom,
      "Food Production Team Member",
      "Tolleson, AZ",
      "full-time",
      "$18/hr",
      "Help us pack fresh meals for the Valley. Reliable people welcome - we count on each other. Second-chance friendly, with a clear path to lead roles for those who stick with it.",
      7,
      "open",
      {
        metro: "Phoenix",
        remote: false,
        payMinCents: 1800,
        payMaxCents: 1800,
        payPeriod: "hour",
        requirements:
          "Food handler card within 30 days (we help you get it). Comfortable working in a cool production room.",
        benefits:
          "Set schedules, overtime available, and a lead-role path for people who stick with it.",
        fairChanceNotes:
          "Second-chance friendly; records considered individually per EEOC guidance.",
      }
    ),
    mkJob(
      empPeerWorks,
      "Peer Support Specialist",
      "Phoenix, AZ",
      "full-time",
      "$20–$23/hr",
      "Your lived experience is the qualification. Walk beside people early in recovery as a certified (or soon-to-be-certified) peer support specialist. We provide training, supervision, and certification support.",
      2,
      "open",
      {
        metro: "Phoenix",
        remote: false,
        payMinCents: 2000,
        payMaxCents: 2300,
        payPeriod: "hour",
        requirements:
          "Lived recovery experience plus an AZ peer support certification - or the willingness to earn one with our support.",
        benefits:
          "Paid certification track, weekly supervision, health coverage, PTO.",
        fairChanceNotes:
          "Lived experience is the qualification here - justice involvement included.",
      }
    ),
    mkJob(
      empPeerWorks,
      "Outreach Coordinator",
      "Phoenix, AZ (hybrid)",
      "part-time",
      "$19/hr",
      "Connect members with housing, jobs, and care. Great for someone with recovery capital and a heart for people. Flexible hours; recovery-friendly by design.",
      20,
      "closed",
      {
        metro: "Phoenix",
        remote: true,
        payMinCents: 1900,
        payMaxCents: 1900,
        payPeriod: "hour",
        requirements:
          "Recovery capital, people skills, and comfort working across housing and employment partners.",
        benefits: "Flexible hybrid hours, mileage reimbursement.",
        fairChanceNotes: "Recovery-friendly by design; fair-chance since day one.",
      }
    ),
  ];

  // ── Engagement backend (added in seed v11 - keep AFTER all v10 sections so
  //    earlier PRNG draws and seed-* ids stay byte-identical) ───────────────
  // Notifications inbox, member blocks (user-driven - left empty), and center
  // community events with RSVP. Danielle anchors the demo: a full inbox across
  // kinds (mix read/unread) and an RSVP to the Laveen Alumni BBQ. Every
  // timestamp hangs off EPOCH (never Date.now()).

  // ── community events (2–3 per center: meetings, a celebration, a workshop)
  const events: CommunityEvent[] = [];
  const mkEvent = (
    center: Center,
    creator: User,
    title: string,
    description: string,
    startsAt: number,
    durationHrs: number,
    location: string,
    kind: EventKind
  ): CommunityEvent => {
    const ev: CommunityEvent = {
      id: did(),
      centerId: center.id,
      creatorId: creator.id,
      title,
      description,
      startsAt,
      endsAt: startsAt + durationHrs * 3600e3,
      location,
      kind,
      createdAt: now - int(6, 20) * DAY,
    };
    events.push(ev);
    return ev;
  };

  const spMentor = mentors.find((m) => m.centerId === southPhoenix.id) ?? marcus;

  // Laveen (Danielle's center) - a weekly meeting, the Alumni BBQ, a workshop.
  const laveenMeeting = mkEvent(
    laveen,
    sarah,
    "Tuesday Alumni Meeting",
    "Our weekly alumni check-in - coffee, wins of the week, and a few minutes to set a goal together. Everyone welcome, no pressure to share.",
    now + 2 * DAY + 17.5 * 3600e3,
    1.5,
    "Laveen Center - Community Room",
    "meeting"
  );
  const laveenBbq = mkEvent(
    laveen,
    sarah,
    "Laveen Alumni BBQ",
    "Alumni, families, and mentors - join us Saturday at noon for food, music, and a chance to reconnect. Bring someone you're walking beside.",
    now + 4 * DAY + 12 * 3600e3,
    3,
    "Cesar Chavez Park - Ramada 3",
    "celebration"
  );
  mkEvent(
    laveen,
    marcus,
    "Resume & Interview Workshop",
    "Bring your work history - our navigators help you build a fair-chance-ready resume and practice interview answers in one sitting. Coffee provided.",
    now + 9 * DAY + 18 * 3600e3,
    2,
    "Laveen Center - Learning Lab",
    "workshop"
  );

  // South Phoenix - a meeting, a workshop, a community gathering.
  mkEvent(
    southPhoenix,
    spMentor,
    "New in Recovery - Welcome Circle",
    "A warm first step for anyone in their early weeks. Peer-led, confidential, and yours to attend as often as you need.",
    now + 3 * DAY + 18 * 3600e3,
    1.5,
    "South Phoenix Center - Circle Room",
    "meeting"
  );
  mkEvent(
    southPhoenix,
    spMentor,
    "Budgeting Basics Workshop",
    "A judgment-free hour on saving your first $100, reading a pay stub, and building a simple plan on paper. Snacks and bus passes available.",
    now + 6 * DAY + 17 * 3600e3,
    1.5,
    "South Phoenix Center - Room B",
    "workshop"
  );
  mkEvent(
    southPhoenix,
    spMentor,
    "Community Cookout & Resource Fair",
    "Food, music, and tables from local fair-chance employers, housing navigators, and health partners. Come for lunch, leave with a next step.",
    now + 11 * DAY + 12 * 3600e3,
    3,
    "South Mountain Park - Ramada 1",
    "community"
  );

  // ── event RSVPs - Danielle attends the Alumni BBQ + Tuesday meeting; a
  //    handful of Laveen alumni fill out the celebration roster. ────────────
  const eventRsvps: EventRsvp[] = [
    {
      id: did(),
      eventId: laveenBbq.id,
      userId: danielle.id,
      createdAt: now - 3 * DAY,
    },
    {
      id: did(),
      eventId: laveenMeeting.id,
      userId: danielle.id,
      createdAt: now - 1 * DAY,
    },
  ];
  const rsvpPool = new Set<User>();
  while (rsvpPool.size < 14 && rsvpPool.size < laveenGenerated.length)
    rsvpPool.add(pick(laveenGenerated));
  for (const m of rsvpPool) {
    eventRsvps.push({
      id: did(),
      eventId: laveenBbq.id,
      userId: m.id,
      createdAt: now - int(1, 6) * DAY - int(0, 23) * 3600e3,
    });
  }

  // ── member blocks - user-driven, seeded empty. ──────────────────────────
  const memberBlocks: MemberBlock[] = [];

  // ── notifications - Danielle's inbox across kinds, mix read/unread. ──────
  const danielleGedPost = posts.find(
    (p) => p.authorId === danielle.id && p.kind === "win"
  );
  const notifications: Notification[] = [];
  const mkNotif = (
    kind: NotificationKind,
    title: string,
    body: string,
    createdAt: number,
    read: boolean,
    refType?: string,
    refId?: string
  ): void => {
    notifications.push({
      id: did(),
      userId: danielle.id,
      kind,
      title,
      body,
      refType,
      refId,
      read,
      createdAt,
    });
  };

  mkNotif(
    "reaction",
    "Marcus reacted to your post",
    "Marcus sent a heart on “Got my GED today.”",
    now - 3 * 3600e3,
    false,
    "post",
    danielleGedPost?.id
  );
  mkNotif(
    "comment",
    "New comment on your post",
    "Rosa commented: “So proud of you - that door is wide open now!”",
    now - 6 * 3600e3,
    false,
    "post",
    danielleGedPost?.id
  );
  mkNotif(
    "care_message",
    "Message from Sarah",
    "Sarah: “Left a bus pass for you at the front desk. See you Thursday.”",
    now - 20 * 3600e3,
    false,
    "channel",
    "channel-1to1-danielle"
  );
  mkNotif(
    "follow_up",
    "A check-in is due",
    "Your 180-day check-in with Laveen Center is coming up. No pressure - we just like hearing how you're doing.",
    now - 1 * DAY,
    false,
    "followup",
    undefined
  );
  mkNotif(
    "job",
    "New job match",
    "Sun Valley Warehouse posted a Warehouse Associate role in Laveen - fair-chance, $17–$19/hr.",
    now - 2 * DAY,
    true,
    "job",
    undefined
  );
  mkNotif(
    "event",
    "You're invited: Laveen Alumni BBQ",
    "Saturday at noon - food, music, and familiar faces. Tap to RSVP.",
    now - 2 * DAY - 4 * 3600e3,
    true,
    "event",
    laveenBbq.id
  );
  mkNotif(
    "mention",
    "Tyrell mentioned you",
    "Tyrell mentioned you in Job Seekers: “@Danielle your resume tips helped me land the interview!”",
    now - 3 * DAY,
    true,
    "circle",
    "circle-job-seekers"
  );
  mkNotif(
    "reaction",
    "3 people cheered your milestone",
    "Your GED milestone is getting love from across the center.",
    now - 4 * DAY,
    true,
    "post",
    danielleGedPost?.id
  );
  mkNotif(
    "system",
    "You reached Silver",
    "You crossed 640 points and reached Silver. Every check-in and lesson got you here.",
    now - 8 * DAY,
    true,
    undefined,
    undefined
  );

  // ── post reports - a couple of open reports so the moderation queue is
  //    never empty (seed v12). Appended after all v11 sections so earlier
  //    seed-* ids stay byte-identical. Reporters are flagship members. ───────
  const flaggedForReport = posts.filter((p) => p.status === "flagged");
  const postReports: PostReport[] = [];
  if (flaggedForReport[0]) {
    postReports.push({
      id: did(),
      postId: flaggedForReport[0].id,
      reporterId: tyrell.id,
      reason: "harassment",
      note: "This felt targeted at someone. Can a person take a look?",
      status: "open",
      createdAt: now - 2 * DAY,
    });
  }
  if (flaggedForReport[1]) {
    postReports.push({
      id: did(),
      postId: flaggedForReport[1].id,
      reporterId: andre.id,
      reason: "spam",
      status: "open",
      createdAt: now - 1 * DAY,
    });
  }

  // ── Center Operations Suite (added in seed v13 - keep AFTER all v12
  //    sections so earlier PRNG draws and seed-* ids stay byte-identical) ──
  // Programs sit above courses (docs/16): 4 My Struggle starter templates
  // plus 3 live Laveen programs with a Summer 2026 cohort, weekly sessions,
  // and attendance history. Danielle anchors the demo: live IOP Core
  // enrollment, a care team of 3, a warm staff-touch history, a challenge,
  // and a pulse survey. Every timestamp hangs off EPOCH (never Date.now()).

  // Two new Laveen staff - appended AFTER every existing user (see the
  // `users` array in the return) so all prior seed-* ids stay byte-identical.
  // Same shared demo password ("mystruggle").
  const angela = mk("staff", "Angela", "angela@themystruggles.com", "#4E5B9B", {
    centerId: laveen.id,
    createdAt: now - 220 * DAY,
  });
  const devStaff = mk("staff", "Dev", "dev@themystruggles.com", "#12B76A", {
    centerId: laveen.id,
    createdAt: now - 140 * DAY,
  });

  const programs: Program[] = [];
  const programCurriculum: ProgramCurriculumItem[] = [];

  const mkProgram = (
    title: string,
    description: string,
    levelOfCare: LevelOfCare,
    category: Program["category"],
    durationWeeks: number,
    delivery: Program["delivery"],
    isTemplate: boolean,
    badge: string,
    centerId?: string
  ): Program => {
    const p: Program = {
      id: did(),
      centerId,
      title,
      description,
      levelOfCare,
      category,
      durationWeeks,
      delivery,
      isTemplate,
      status: "published",
      badge,
      createdAt: now - (isTemplate ? 120 : 45) * DAY,
    };
    programs.push(p);
    return p;
  };

  const mkItem = (
    programId: string,
    sort: number,
    kind: ProgramCurriculumItem["kind"],
    label: string,
    courseId?: string,
    config?: Record<string, unknown>
  ): void => {
    programCurriculum.push({
      id: did(),
      programId,
      sort,
      kind,
      courseId,
      label,
      config,
    });
  };

  // ── 4 My Struggle starter templates (shared library - no centerId) ─────
  const tplIse = mkProgram(
    "ISE 12-Step",
    "Our flagship Inner Strength Experience - the three ISE courses plus a weekly step group, walked together at a humane pace.",
    "op",
    "PON",
    12,
    "hybrid",
    true,
    "ISE Finisher"
  );
  mkItem(tplIse.id, 0, "course", "ISE Course 1 - Honesty", "course-ise-1");
  mkItem(tplIse.id, 1, "course", "ISE Course 2 - Hope", "course-ise-2");
  mkItem(tplIse.id, 2, "course", "ISE Course 3 - Decision", "course-ise-3");
  mkItem(tplIse.id, 3, "session_series", "Weekly step group", undefined, {
    cadence: "weekly",
    weeks: 8,
  });
  mkItem(tplIse.id, 4, "milestone", "Week 12: share your story with the cohort", undefined, {
    week: 12,
  });

  const tplIop = mkProgram(
    "IOP Core",
    "An intensive outpatient core: relapse-prevention curriculum, weekly group, and a family-session milestone at week four.",
    "iop",
    "IOP",
    8,
    "in_facility",
    true,
    "IOP Core Graduate"
  );
  mkItem(tplIop.id, 0, "course", "Relapse Prevention Basics", "course-relapse-basics");
  mkItem(tplIop.id, 1, "course", "ISE Course 2 - Hope", "course-ise-2");
  mkItem(tplIop.id, 2, "session_series", "Weekly IOP group", undefined, {
    cadence: "weekly",
    weeks: 8,
  });
  mkItem(tplIop.id, 3, "milestone", "Week 4: first family session", undefined, {
    week: 4,
  });

  const tplVoc = mkProgram(
    "Vocational Readiness",
    "From first application to first paycheck: forklift certification, a weekly job lab, and a job-search task pack.",
    "op",
    "VOC",
    6,
    "hybrid",
    true,
    "Work Ready"
  );
  mkItem(tplVoc.id, 0, "course", "Forklift Certification", "course-forklift");
  mkItem(tplVoc.id, 1, "session_series", "Weekly job lab", undefined, {
    cadence: "weekly",
    weeks: 8,
  });
  mkItem(tplVoc.id, 2, "task_pack", "Job Search Pack", undefined, {
    tasks: ["Finish my resume", "Apply to five places", "Practice interview answers"],
  });
  mkItem(tplVoc.id, 3, "milestone", "Mock interview passed");

  const tplNav = mkProgram(
    "Reentry Navigation",
    "The paperwork season, handled with dignity: documents and ID recovery, a weekly navigation huddle, and every form in hand.",
    "op",
    "NAV",
    6,
    "hybrid",
    true,
    "Navigator"
  );
  mkItem(tplNav.id, 0, "course", "Documents & ID Recovery", "course-docs-id");
  mkItem(tplNav.id, 1, "task_pack", "Reentry Documents Pack", undefined, {
    tasks: ["Get state ID", "Order Social Security card", "Visit the MVD"],
  });
  mkItem(tplNav.id, 2, "session_series", "Weekly navigation huddle", undefined, {
    cadence: "weekly",
    weeks: 8,
  });
  mkItem(tplNav.id, 3, "milestone", "All documents in hand");

  // ── 3 live Laveen programs - clones of the templates (docs/16 seeds the
  //    spec's "Desert Hope" demo center as center-laveen; see DECISIONS.md).
  const cloneCurriculum = (from: Program, to: Program): void => {
    const src = programCurriculum.filter((i) => i.programId === from.id);
    for (const item of src) {
      programCurriculum.push({ ...item, id: did(), programId: to.id });
    }
  };
  const liveIse = mkProgram(
    "ISE 12-Step",
    tplIse.description,
    "op",
    "PON",
    12,
    "hybrid",
    false,
    "ISE Finisher",
    laveen.id
  );
  cloneCurriculum(tplIse, liveIse);
  const liveIop = mkProgram(
    "IOP Core",
    tplIop.description,
    "iop",
    "IOP",
    8,
    "in_facility",
    false,
    "IOP Core Graduate",
    laveen.id
  );
  cloneCurriculum(tplIop, liveIop);
  const liveVoc = mkProgram(
    "Vocational Readiness",
    tplVoc.description,
    "op",
    "VOC",
    6,
    "hybrid",
    false,
    "Work Ready",
    laveen.id
  );
  cloneCurriculum(tplVoc, liveVoc);

  // ── cohort enrollments (Summer 2026) - existing Laveen members ─────────
  const programEnrollments: ProgramEnrollment[] = [];
  const episodeByMember = new Map(careEpisodes.map((e) => [e.memberId, e]));

  // Danielle first (hand-written): active in the live IOP Core, linked to
  // her existing care episode so Client 360 reads one continuous story.
  programEnrollments.push({
    id: did(),
    programId: liveIop.id,
    memberId: danielle.id,
    careEpisodeId: danielleEpisode.id,
    cohortLabel: "Summer 2026",
    enrolledAt: now - 24 * DAY,
    status: "active",
  });

  const enrolleesByProgram = new Map<string, User[]>([[liveIop.id, [danielle]]]);
  const enrollCohort = (program: Program, count: number): void => {
    const chosen = new Set<User>();
    while (chosen.size < count) chosen.add(pick(laveenGenerated));
    const list = enrolleesByProgram.get(program.id) ?? [];
    for (const m of chosen) {
      programEnrollments.push({
        id: did(),
        programId: program.id,
        memberId: m.id,
        careEpisodeId: episodeByMember.get(m.id)?.id,
        cohortLabel: "Summer 2026",
        enrolledAt: now - int(15, 32) * DAY,
        status: rnd() < 0.9 ? "active" : "withdrawn",
      });
      list.push(m);
    }
    enrolleesByProgram.set(program.id, list);
  };
  enrollCohort(liveIse, int(9, 14));
  enrollCohort(liveIop, int(8, 13)); // + Danielle = 9-14
  enrollCohort(liveVoc, int(9, 14));

  // ── weekly program sessions - a few past, a few future, Sarah facilitates.
  const programSessions: ProgramSession[] = [];
  const sessionAttendance: SessionAttendance[] = [];
  const mkSessionRun = (
    program: Program,
    sessionTitle: string,
    dayOffset: number, // staggers the three programs across the week
    hour: number,
    durationMin: number,
    location: string
  ): void => {
    const enrollees = enrolleesByProgram.get(program.id) ?? [];
    for (let w = 0; w < 8; w++) {
      const startsAt =
        now + (w - 5) * 7 * DAY + dayOffset * DAY + hour * 3600e3;
      const session: ProgramSession = {
        id: did(),
        programId: program.id,
        title: `${sessionTitle} - Week ${w + 1}`,
        startsAt,
        durationMin,
        location,
        facilitatorId: sarah.id,
        createdAt: now - 40 * DAY,
      };
      programSessions.push(session);
      if (startsAt >= now) continue; // attendance history on past sessions only
      for (const m of enrollees) {
        // Danielle's record stays demo-warm: present every week but one remote.
        const r = rnd();
        const status: SessionAttendance["status"] =
          m.id === danielle.id
            ? w === 2
              ? "remote"
              : "present"
            : r < 0.7
              ? "present"
              : r < 0.85
                ? "remote"
                : r < 0.94
                  ? "absent"
                  : "excused";
        sessionAttendance.push({
          id: did(),
          sessionId: session.id,
          memberId: m.id,
          status,
          markedBy: sarah.id,
          markedAt: startsAt + durationMin * 60e3 + int(0, 2) * 3600e3,
        });
      }
    }
  };
  mkSessionRun(liveIse, "Step group", 1, 17.5, 60, "Laveen Center - Community Room");
  mkSessionRun(liveIop, "IOP group", 2, 17.5, 90, "Laveen Center - Community Room");
  mkSessionRun(liveVoc, "Job lab", 4, 10, 60, "Laveen Center - Learning Lab");

  // ── Danielle's care team of 3 (Sarah primary + the two new staff) ──────
  const careTeamAssignments: CareTeamAssignment[] = [
    {
      id: did(),
      memberId: danielle.id,
      careEpisodeId: danielleEpisode.id,
      staffId: sarah.id,
      role: "case_manager",
      isPrimary: true,
      assignedAt: dInProgramAt,
    },
    {
      id: did(),
      memberId: danielle.id,
      careEpisodeId: danielleEpisode.id,
      staffId: angela.id,
      role: "counselor",
      isPrimary: false,
      assignedAt: now - 24 * DAY,
    },
    {
      id: did(),
      memberId: danielle.id,
      careEpisodeId: danielleEpisode.id,
      staffId: devStaff.id,
      role: "peer_support",
      isPrimary: false,
      assignedAt: now - 24 * DAY,
    },
  ];
  // Light caseload breadth: every other IOP Core cohort member gets Sarah as
  // case manager plus one of the new staff, so My Caseload views read alive.
  const iopPeersForTeams = (enrolleesByProgram.get(liveIop.id) ?? []).filter(
    (m) => m.id !== danielle.id
  );
  for (let i = 0; i < iopPeersForTeams.length; i++) {
    const m = iopPeersForTeams[i];
    careTeamAssignments.push({
      id: did(),
      memberId: m.id,
      careEpisodeId: episodeByMember.get(m.id)?.id,
      staffId: sarah.id,
      role: "case_manager",
      isPrimary: true,
      assignedAt: now - int(15, 32) * DAY,
    });
    careTeamAssignments.push({
      id: did(),
      memberId: m.id,
      careEpisodeId: episodeByMember.get(m.id)?.id,
      staffId: i % 2 === 0 ? angela.id : devStaff.id,
      role: i % 2 === 0 ? "counselor" : "peer_support",
      isPrimary: false,
      assignedAt: now - int(10, 28) * DAY,
    });
  }

  // ── Danielle's staff-touch history - 8 warm, engagement-only touches
  //    (never PHI/clinical) spread over recent weeks. ─────────────────────
  const staffEngagements: StaffEngagement[] = [];
  const touchDanielle = (
    staff: User,
    kind: StaffTouchKind,
    daysAgo: number,
    body?: string,
    mood?: number
  ): void => {
    staffEngagements.push({
      id: did(),
      memberId: danielle.id,
      staffId: staff.id,
      kind,
      body,
      mood,
      occurredAt: now - daysAgo * DAY - int(0, 8) * 3600e3,
    });
  };
  touchDanielle(sarah, "kudos", 2, "Sarah noticed your 12-day streak. Keep going!");
  touchDanielle(angela, "checkin", 4, "Quick check-in after group - steady week, housing on her mind.", 4);
  touchDanielle(devStaff, "hallway", 6, "Caught up by the coffee station - she is excited about the job offer.");
  touchDanielle(sarah, "nudge", 9, "Friendly reminder: bring your ID documents Tuesday.");
  touchDanielle(angela, "kudos", 12, "Best coping-skills share in group this week.");
  touchDanielle(sarah, "checkin", 16, "Weekly check-in - upbeat, focused on the housing goal.", 5);
  touchDanielle(devStaff, "hallway", 21, "Walked her out after group - she was smiling about the interview.");
  touchDanielle(angela, "checkin", 27, "Bus trouble made a rough week - we sorted a pass together.", 3);

  // ── Gratitude Week challenge - opt-in, no loser-boards (docs/07 holds) ──
  const gratitudeWeek: Challenge = {
    id: did(),
    centerId: laveen.id,
    title: "Gratitude Week",
    description:
      "Post one gratitude a day for seven days - big or small, it counts. Everyone who finishes earns the Gratitude Week badge.",
    startsAt: now - 2 * DAY,
    endsAt: now + 5 * DAY,
    badge: "Gratitude Week",
    createdBy: sarah.id,
    createdAt: now - 4 * DAY,
  };
  const challenges: Challenge[] = [gratitudeWeek];
  const challengeJoins: ChallengeJoin[] = [
    {
      id: did(),
      challengeId: gratitudeWeek.id,
      memberId: danielle.id,
      joinedAt: now - 2 * DAY,
    },
  ];
  const gratitudeJoiners = new Set<User>();
  while (gratitudeJoiners.size < 10) gratitudeJoiners.add(pick(laveenGenerated));
  for (const m of gratitudeJoiners) {
    challengeJoins.push({
      id: did(),
      challengeId: gratitudeWeek.id,
      memberId: m.id,
      joinedAt: now - int(0, 2) * DAY - int(1, 20) * 3600e3,
    });
  }

  // ── pulse survey on the live IOP Core cohort - anonymous to peers,
  //    trend visible to staff on the cockpit. ─────────────────────────────
  const supportPulse: PulseSurvey = {
    id: did(),
    centerId: laveen.id,
    programId: liveIop.id,
    question: "How supported do you feel this week?",
    createdBy: sarah.id,
    createdAt: now - 3 * DAY,
    closesAt: now + 4 * DAY,
  };
  const pulseSurveys: PulseSurvey[] = [supportPulse];
  const pulseResponses: PulseResponse[] = [
    {
      id: did(),
      surveyId: supportPulse.id,
      memberId: danielle.id,
      score: 4,
      note: "The bus pass and the check-ins - I feel seen.",
      createdAt: now - 2 * DAY,
    },
  ];
  const pulsePool = [
    ...iopPeersForTeams,
    ...(enrolleesByProgram.get(liveIse.id) ?? []),
  ];
  const pulseResponders = new Set<User>();
  while (pulseResponders.size < 11 && pulseResponders.size < pulsePool.length)
    pulseResponders.add(pick(pulsePool));
  for (const m of pulseResponders) {
    const r = rnd();
    pulseResponses.push({
      id: did(),
      surveyId: supportPulse.id,
      memberId: m.id,
      score: r < 0.1 ? 2 : r < 0.35 ? 3 : r < 0.75 ? 4 : 5,
      createdAt: now - int(0, 2) * DAY - int(1, 20) * 3600e3,
    });
  }

  // ── Sarah's staff task queue - follow-ups with due dates + done state ──
  const staffTasks: StaffTask[] = [
    {
      id: did(),
      staffId: sarah.id,
      memberId: danielle.id,
      title: "Call Danielle re: housing application",
      dueAt: now + 1 * DAY,
      done: false,
      createdBy: sarah.id,
      createdAt: now - 2 * DAY,
    },
    {
      id: did(),
      staffId: sarah.id,
      title: "Print the Summer 2026 IOP Core attendance sheet",
      dueAt: now + 2 * DAY,
      done: false,
      createdBy: sarah.id,
      createdAt: now - 1 * DAY,
    },
    {
      id: did(),
      staffId: sarah.id,
      memberId: tyrell.id,
      title: "Nudge Tyrell about the forklift practice test",
      dueAt: now - 1 * DAY,
      done: true,
      createdBy: sarah.id,
      createdAt: now - 6 * DAY,
    },
    {
      id: did(),
      staffId: sarah.id,
      title: "Confirm Gratitude Week badge copy with Angela",
      done: true,
      createdBy: angela.id,
      createdAt: now - 4 * DAY,
    },
  ];

  // ── Mock community ads (added in seed v14 - keep AFTER all v13 sections
  //    so earlier PRNG draws and seed-* ids stay byte-identical) ──────────
  // Three more running placements so the feed's everyN interleave shows a
  // realistic sponsored mix: a residential program, the other center's
  // evening IOP, and a fair-chance employer. All community-scoped (serve to
  // every signed-in member), all screened clean against ad-policy.ts, and
  // APPENDED - the v8 rows above are untouched. The residential advertiser
  // is an external org (no Center row) and the employer ad is owned by the
  // seeded Sun Valley Warehouse employer account; serve ignores orgId, and
  // center ad managers list only their own centerId rows (see DECISIONS.md).
  const residentialAd: SponsoredPlacement = {
    id: did(),
    orgId: "org-desert-bloom-residential",
    orgName: "Desert Bloom Residential",
    title: "A safe place to start over - tour our residential program",
    body: "Beds are available now in our residential program: private rooms, 24/7 support staff, and a community that treats you like family from day one. Come walk the grounds and meet the team - no commitment, just a conversation.",
    ctaLabel: "Visit their site",
    ctaUrl: "https://www.desertbloomrecovery.org",
    kind: "program",
    audienceScope: "community",
    targeting: { metro: "Phoenix, AZ", interestTags: ["recovery", "housing"] },
    status: "running",
    startsAt: now - 5 * DAY,
    endsAt: now + 16 * DAY,
    budgetCents: 30000,
    approvedBy: sarah.id,
    createdAt: now - 8 * DAY,
  };
  const eveningIopAd: SponsoredPlacement = {
    id: did(),
    orgId: southPhoenix.id,
    orgName: southPhoenix.name,
    title: "Evening IOP that works around your job",
    body: "Keep your shift and keep your recovery: our evening Intensive Outpatient track meets after work hours, three nights a week, with transportation help available. Talk to us about whether it's the right fit.",
    ctaLabel: "See their schedule",
    ctaUrl: "https://www.southphoenixrecovery.org/iop",
    kind: "program",
    audienceScope: "community",
    targeting: { metro: "Phoenix, AZ", interestTags: ["recovery"] },
    status: "running",
    startsAt: now - 3 * DAY,
    endsAt: now + 14 * DAY,
    budgetCents: 18000,
    approvedBy: sarah.id,
    createdAt: now - 6 * DAY,
  };
  const warehouseAd: SponsoredPlacement = {
    id: did(),
    orgId: empSunValley.id,
    orgName: "Sun Valley Warehouse",
    title: "Now hiring - fair-chance warehouse roles, apply with your resume",
    body: "Sun Valley Warehouse hires on who you are today: steady daytime hours, weekly pay, and training provided - forklift cert help included. Bring the resume you built here and come meet the team.",
    ctaLabel: "See open roles",
    ctaUrl: "https://careers.sunvalleywarehouse.com",
    kind: "job_opening",
    audienceScope: "community",
    targeting: { metro: "Phoenix, AZ", interestTags: ["employment"] },
    status: "running",
    startsAt: now - 2 * DAY,
    endsAt: now + 21 * DAY,
    budgetCents: 22000,
    approvedBy: sarah.id,
    createdAt: now - 4 * DAY,
  };
  sponsoredPlacements.push(residentialAd, eveningIopAd, warehouseAd);
  seedEvents(residentialAd.id, int(60, 100));
  seedEvents(eveningIopAd.id, int(50, 90));
  seedEvents(warehouseAd.id, int(70, 110));

  // ── Second-Chance Employer Platform (added in seed v15 - keep AFTER all
  //    v14 sections so earlier PRNG draws and seed-* ids stay byte-identical)
  // docs/17 / requirements/14, reuse-first: employers stay Users with role
  // "employer", postings stay jobPosts (upgraded in place with the new
  // OPTIONAL structured fields only - ids/status/draw order untouched), and
  // member applications stay jobApplications (+ postingId). New here: a
  // vetting profile for every employer, five more employer accounts (incl.
  // the docs/11 ecosystem loop - My Safety and The Store hiring from the
  // community), six more open postings (12 open total across types/metros),
  // the employer-side candidate pipeline, 30/90/180-day retention confirms,
  // saved jobs, and Danielle's posting→hired storyline. Every timestamp
  // hangs off EPOCH (never Date.now()).

  // ── five more employers: 2 verified ecosystem orgs, 2 pending, 1 suspended
  const empMySafety = mkEmployer(
    "Devon",
    "My Safety",
    "staffing@mysafety.example.org",
    45
  );
  const empTheStore = mkEmployer(
    "Nia",
    "The Store",
    "hiring@thestore.example.org",
    40
  );
  const empCopperState = mkEmployer(
    "Hector",
    "Copper State Logistics",
    "recruiting@copperstatelogistics.example.org",
    6
  );
  const empMaryvale = mkEmployer(
    "Lucia",
    "Maryvale Diner",
    "owner@maryvalediner.example.org",
    3
  );
  // Suspended example: signed the pledge, then submitted a commission-only
  // "street promotions crew" listing the moderation gate flagged predatory
  // (requirements/14 §B suspend switch). Their postings never went live.
  const empQuickCash = mkEmployer(
    "Gary",
    "QuickCash Promotions",
    "talent@quickcashpromo.example.org",
    30
  );
  const employersV15 = [
    empMySafety,
    empTheStore,
    empCopperState,
    empMaryvale,
    empQuickCash,
  ];

  // ── vetting profiles - one per employer account (docs/17 §Vetting) ──────
  const mkProfile = (
    employer: User,
    verificationStatus: EmployerProfile["verificationStatus"],
    ageDays: number,
    extra: Partial<EmployerProfile> = {}
  ): EmployerProfile => ({
    id: did(),
    employerId: employer.id,
    verificationStatus,
    createdAt: now - ageDays * DAY,
    ...extra,
  });

  const employerProfiles: EmployerProfile[] = [
    // The four v10 employers - all verified, pledge on record.
    mkProfile(empSunValley, "verified", 120, {
      ein: "86-2041175",
      website: "sunvalleywarehouse.example.org",
      industry: "Warehousing & logistics",
      about:
        "Family-run distribution warehouse in Laveen. We hire on who you are today and train the rest.",
      pledgeSignedAt: now - 119 * DAY,
      pledgeSignedBy: empSunValley.id,
      verifiedBy: sarah.id,
    }),
    mkProfile(empRoosevelt, "verified", 90, {
      ein: "86-3187744",
      website: "rooseveltrowkitchen.example.org",
      industry: "Restaurants & hospitality",
      about:
        "A busy downtown kitchen that believes the best crews are built on second chances and shift meals.",
      pledgeSignedAt: now - 89 * DAY,
      pledgeSignedBy: empRoosevelt.id,
      verifiedBy: sarah.id,
    }),
    mkProfile(empDesertBloom, "verified", 150, {
      ein: "86-1266980",
      website: "desertbloomfoods.example.org",
      industry: "Food production",
      about:
        "Fresh-meal producer for the Valley. Clear schedules, real advancement, second-chance friendly since our first hire.",
      pledgeSignedAt: now - 149 * DAY,
      pledgeSignedBy: empDesertBloom.id,
      verifiedBy: sarah.id,
    }),
    mkProfile(empPeerWorks, "verified", 60, {
      ein: "86-4452019",
      website: "peerworks.example.org",
      industry: "Peer recovery services",
      about:
        "Peer-run recovery services provider. Lived experience is the first line of every job description.",
      pledgeSignedAt: now - 59 * DAY,
      pledgeSignedBy: empPeerWorks.id,
      verifiedBy: sarah.id,
    }),
    // The docs/11 ecosystem loop, made real: members trained and hired to
    // keep community spaces safe (My Safety) and to run community retail
    // (The Store) - both verified fair-chance employers here.
    mkProfile(empMySafety, "verified", 45, {
      ein: "86-5570331",
      website: "mysafety.example.org",
      industry: "Peer safety staffing",
      about:
        "Peer-led safety staffing: trained members keeping community spaces, events, and centers safe - de-escalation first, always.",
      pledgeSignedAt: now - 44 * DAY,
      pledgeSignedBy: empMySafety.id,
      verifiedBy: sarah.id,
    }),
    mkProfile(empTheStore, "verified", 40, {
      ein: "86-6019482",
      website: "thestore.example.org",
      industry: "Community retail",
      about:
        "Community retail staffed by the community it serves. Every register shift is a step in someone's story.",
      pledgeSignedAt: now - 39 * DAY,
      pledgeSignedBy: empTheStore.id,
      verifiedBy: sarah.id,
    }),
    // Two pending verifications - applied with the pledge, awaiting review.
    mkProfile(empCopperState, "pending", 6, {
      ein: "86-7130856",
      website: "copperstatelogistics.example.org",
      industry: "Trucking & logistics",
      about:
        "Regional carrier hiring dock crew and drivers. New to fair-chance hiring and ready to learn.",
      pledgeSignedAt: now - 6 * DAY,
      pledgeSignedBy: empCopperState.id,
    }),
    mkProfile(empMaryvale, "pending", 3, {
      website: "maryvalediner.example.org",
      industry: "Restaurants & hospitality",
      about:
        "Neighborhood diner in Maryvale looking for kitchen and counter help who want steady mornings.",
      pledgeSignedAt: now - 3 * DAY,
      pledgeSignedBy: empMaryvale.id,
    }),
    // Suspended - the reason was predatory (commission-only listing).
    mkProfile(empQuickCash, "suspended", 30, {
      industry: "Marketing & promotions",
      about: "High-energy street teams. Unlimited earning potential.",
      pledgeSignedAt: now - 29 * DAY,
      pledgeSignedBy: empQuickCash.id,
      verifiedBy: sarah.id, // ms_admin who threw the suspend switch
    }),
  ];

  // ── six more open postings → 12 open total across types and metros ──────
  const mySafetyOfficer = mkJob(
    empMySafety,
    "Peer Safety Officer",
    "Phoenix, AZ",
    "full-time",
    "$19–$21/hr",
    "Keep community spaces and events safe as a trained peer safety officer. De-escalation first, always - your lived experience is exactly what makes you good at this. Paid training and certification.",
    44,
    "open",
    {
      metro: "Phoenix",
      remote: false,
      payMinCents: 1900,
      payMaxCents: 2100,
      payPeriod: "hour",
      requirements:
        "Lived recovery experience, a calm presence, and completion of our paid de-escalation training.",
      benefits: "Paid training and certification, health coverage, wellness days.",
      fairChanceNotes:
        "Built inside the recovery community - fair-chance hiring is the whole point.",
    }
  );
  const mySafetyEvents = mkJob(
    empMySafety,
    "Event Safety Team (Peer)",
    "Tempe, AZ",
    "temporary",
    "$18–$20/hr",
    "Weekend and evening event coverage across the East Valley. Work alongside experienced peer officers, pick the shifts that fit your schedule, and get paid weekly.",
    10,
    "open",
    {
      metro: "Tempe",
      remote: false,
      payMinCents: 1800,
      payMaxCents: 2000,
      payPeriod: "hour",
      requirements:
        "18+, reliable transportation to event sites, and our two-day paid orientation.",
      benefits: "Weekly pay, flexible shift picks, path to full-time officer roles.",
      fairChanceNotes: "Records reviewed individually - lived experience welcome.",
    }
  );
  const storeAssociate = mkJob(
    empTheStore,
    "Retail Associate",
    "Laveen, AZ",
    "part-time",
    "$16–$17/hr",
    "Run the register, stock the floor, and greet the neighborhood at the community's own store. Shifts that flex around class, meetings, and family.",
    38,
    "open",
    {
      metro: "Laveen",
      remote: false,
      payMinCents: 1600,
      payMaxCents: 1700,
      payPeriod: "hour",
      requirements: "Friendly, dependable, comfortable learning a register. We train.",
      benefits: "Store discount, flexible scheduling, mentorship from shift leads.",
      fairChanceNotes:
        "Staffed by the community it serves - your story is a strength here.",
    }
  );
  const storeLead = mkJob(
    empTheStore,
    "Assistant Store Lead",
    "Laveen, AZ",
    "full-time",
    "$18–$20/hr",
    "Open and close the store, coach associates, and own the floor when the manager is out. A real leadership step for someone rebuilding their resume.",
    9,
    "open",
    {
      metro: "Laveen",
      remote: false,
      payMinCents: 1800,
      payMaxCents: 2000,
      payPeriod: "hour",
      requirements:
        "Six months of retail or customer-facing experience, or our associate track completed.",
      benefits: "Store discount, health coverage after 90 days, leadership training.",
      fairChanceNotes: "We promote from within and hire on trajectory, not history.",
    }
  );
  const bloomSeasonal = mkJob(
    empDesertBloom,
    "Seasonal Packing Crew",
    "Tolleson, AZ",
    "seasonal",
    "$17/hr",
    "Join the packing crew for our busy season. Straightforward work, steady hours, and a crew lead who started exactly where you are. Strong performers convert to full-time.",
    110,
    "open",
    {
      metro: "Phoenix",
      remote: false,
      payMinCents: 1700,
      payMaxCents: 1700,
      payPeriod: "hour",
      requirements: "Show up on time and lift 30 lbs. Everything else is trainable.",
      benefits: "Weekly pay, seasonal-to-permanent conversion path.",
      fairChanceNotes: "Second-chance friendly; many of our leads converted from this crew.",
    }
  );
  const peerworksRemote = mkJob(
    empPeerWorks,
    "Recovery Support Line Specialist",
    "Remote (Arizona)",
    "part-time",
    "$19/hr",
    "Answer our warm line from home: listen, encourage, and connect callers to resources. Evening and weekend blocks available - a meaningful remote role for someone with recovery capital.",
    6,
    "open",
    {
      metro: "Phoenix",
      remote: true,
      payMinCents: 1900,
      payMaxCents: 1900,
      payPeriod: "hour",
      requirements:
        "Lived recovery experience, a quiet space to take calls, and our paid warm-line training.",
      benefits: "Fully remote, paid training, flexible evening/weekend blocks.",
      fairChanceNotes: "Lived experience is the qualification - fair-chance by design.",
    }
  );
  jobPosts.push(
    mySafetyOfficer,
    mySafetyEvents,
    storeAssociate,
    storeLead,
    bloomSeasonal,
    peerworksRemote
  );

  // ── candidate pipeline + retention (privacy-first, docs/17 §Pipeline) ────
  // Each pipeline row wraps a NEW jobApplications row linked via postingId -
  // the member's existing external self-tracked rows are untouched. Applying
  // through a posting requires the first-apply disclosure, so jobConsentAt is
  // stamped on every member who appears here.
  const postingCandidates: PostingCandidate[] = [];
  const retentionConfirms: RetentionConfirm[] = [];

  const mkPipeline = (
    member: User,
    posting: JobPost,
    stage: PostingCandidate["stage"],
    appliedDaysAgo: number,
    stageDaysAgo: number,
    notes?: string,
    employerNotes?: string
  ): PostingCandidate => {
    member.jobConsentAt ??= now - appliedDaysAgo * DAY;
    const app: JobApplication = {
      id: did(),
      memberId: member.id,
      company: posting.company,
      role: posting.title,
      status:
        stage === "hired"
          ? "hired"
          : stage === "offer"
            ? "offer"
            : stage === "interview"
              ? "interview"
              : "applied",
      notes,
      postingId: posting.id,
      createdAt: now - appliedDaysAgo * DAY,
    };
    jobApplications.push(app);
    const cand: PostingCandidate = {
      id: did(),
      postingId: posting.id,
      jobApplicationId: app.id,
      memberId: member.id,
      stage,
      stageChangedAt: now - stageDaysAgo * DAY,
      employerNotes,
      createdAt: app.createdAt,
    };
    postingCandidates.push(cand);
    return cand;
  };
  const mkRetention = (
    cand: PostingCandidate,
    employer: User,
    day: RetentionConfirm["day"],
    stillEmployed: boolean,
    daysAgo: number
  ): void => {
    retentionConfirms.push({
      id: did(),
      candidateId: cand.id,
      memberId: cand.memberId,
      employerId: employer.id,
      day,
      stillEmployed,
      confirmedAt: now - daysAgo * DAY,
    });
  };

  // DANIELLE: applied through the Sun Valley "Warehouse Associate" posting,
  // moved through the pipeline, hired ~a month ago, day-30 confirm in. (Her
  // hire arc predates that posting row's createdAt, which is frozen
  // byte-identical per the append-only mandate - read it as a repost.)
  const danielleCandidate = mkPipeline(
    danielle,
    jobPosts[0], // Sun Valley Warehouse - "Warehouse Associate"
    "hired",
    45,
    32,
    "I said YES. Four weeks in and I have not missed a shift.",
    "Interviewed steady and honest, showed up fifteen minutes early. Started on the days crew."
  );
  mkRetention(danielleCandidate, empSunValley, 30, true, 2);

  // The hire writes the continuum heartbeat - same "goal" source the
  // recovery-goals flow uses for employment progress (docs/17: hired =
  // community-capital event). refId points at the pipeline row.
  continuumEvents.push({
    id: did(),
    memberId: danielle.id,
    source: "goal",
    weight: 4,
    refId: danielleCandidate.id,
    occurredAt: now - 32 * DAY,
  });

  // Her consented celebration post - kind "win", approved, feed-visible.
  posts.push({
    id: did(),
    authorId: danielle.id,
    authorName: "Danielle",
    authorRole: "member",
    avatarColor: "#2E7CD6",
    body: "I got the job at Sun Valley Warehouse. Six months ago I could not have imagined this.",
    kind: "win",
    status: "approved",
    hearts: heartsFrom(everyone, 24),
    comments: commentsFor(now - 32 * DAY + 6 * 3600e3),
    createdAt: now - 32 * DAY + 6 * 3600e3,
  });

  // Earlier-stage candidates so every kanban column reads alive.
  mkPipeline(
    tyrell,
    jobPosts[1], // Sun Valley - "Forklift Operator"
    "interview",
    8,
    2,
    "Interview Thursday. My cert course finishes the same week - perfect timing.",
    "Cert in progress - schedule the floor walk-through for Thursday."
  );
  mkPipeline(
    andre,
    storeAssociate, // The Store - "Retail Associate"
    "applied",
    3,
    3,
    "First application through the board. Fingers crossed."
  );
  mkPipeline(
    generated[12],
    jobPosts[2], // Roosevelt Row Kitchen - "Line Cook"
    "screening",
    4,
    2,
    undefined,
    "Resume looks solid - two years of prep work. Phone screen Friday."
  );

  // Older hires powering the retention stat (30/90-day confirms).
  const safetyHire = mkPipeline(
    generated[27],
    mySafetyOfficer,
    "hired",
    42,
    35,
    undefined,
    "Completed de-escalation training top of the cohort."
  );
  mkRetention(safetyHire, empMySafety, 30, true, 4);

  const storeHire = mkPipeline(
    generated[33],
    storeAssociate,
    "hired",
    36,
    31,
    undefined,
    "Regulars ask for them by name already."
  );
  mkRetention(storeHire, empTheStore, 30, true, 1);

  const bloomHire = mkPipeline(
    generated[41],
    bloomSeasonal,
    "hired",
    100,
    95,
    undefined,
    "Converted to the permanent crew after week six."
  );
  mkRetention(bloomHire, empDesertBloom, 30, true, 65);
  mkRetention(bloomHire, empDesertBloom, 90, true, 5);

  // One honest data point - a hire that did not stick past day 30.
  const bloomHire2 = mkPipeline(generated[8], bloomSeasonal, "hired", 68, 62);
  mkRetention(bloomHire2, empDesertBloom, 30, false, 32);

  // ── saved jobs - members bookmarking the board ──────────────────────────
  const savedJobs: SavedJob[] = [
    {
      id: did(),
      memberId: tyrell.id,
      postingId: jobPosts[0].id, // Warehouse Associate - his backup plan
      savedAt: now - 2 * DAY,
    },
    {
      id: did(),
      memberId: andre.id,
      postingId: jobPosts[3].id, // Dishwasher / Prep - a first step back
      savedAt: now - 1 * DAY,
    },
    {
      id: did(),
      memberId: generated[12].id,
      postingId: mySafetyOfficer.id,
      savedAt: now - 3 * DAY,
    },
  ];

  // ── v16 additions (appended AFTER every existing draw so all prior seed-*
  //    ids and PRNG output stay byte-identical) ───────────────────────────

  // (a) Program completions so the ROI completion stat is non-zero: six
  // Spring 2026 alumni across the three live Laveen programs. New rows only -
  // non-Danielle members not already enrolled, so the Summer 2026 cohort
  // (30+ active) is untouched.
  const v16EnrolledIds = new Set(programEnrollments.map((e) => e.memberId));
  const v16CompletionPool = laveenGenerated.filter(
    (m) => !v16EnrolledIds.has(m.id)
  );
  const v16CompletionPrograms = [liveIse, liveIop, liveVoc];
  for (let i = 0; i < 6; i++) {
    const m = v16CompletionPool[i];
    const program = v16CompletionPrograms[i % 3];
    const completedAt = now - (18 + i * 9) * DAY;
    programEnrollments.push({
      id: did(),
      programId: program.id,
      memberId: m.id,
      careEpisodeId: episodeByMember.get(m.id)?.id,
      cohortLabel: "Spring 2026",
      enrolledAt: completedAt - (program.durationWeeks ?? 8) * 7 * DAY,
      completedAt,
      status: "completed",
    });
  }

  // (b) Employer-application leads from the employers marketing page - the
  // same contact-sales queue, employer flavor (message prefix is the marker).
  demoLeads.push(
    {
      id: did(),
      orgName: "Canyon Gate Logistics",
      contactName: "Priya Shah",
      email: "priya@canyongatelogistics.example.com",
      phone: "(602) 555-0188",
      message:
        "EMPLOYER APPLICATION - We run a 40-person warehouse team in Laveen and want to post second-chance roles and hire directly from the platform.",
      source: "employers-page",
      status: "new",
      createdAt: now - 1 * DAY - 4 * 3600e3,
    },
    {
      id: did(),
      orgName: "Fourth Street Kitchen",
      contactName: "Tomas Rivera",
      email: "tomas@fourthstreetkitchen.example.com",
      message:
        "EMPLOYER APPLICATION - Family restaurant hiring prep and line cooks. We have hired people in recovery before and want to do it through My Struggle.",
      source: "employers-page",
      status: "contacted",
      createdAt: now - 6 * DAY - 2 * 3600e3,
    }
  );

  // (c) Website mentor applications in mixed statuses so the dashboard
  // Applications queue demos. Shape matches the public intake route
  // (app/api/mentor-applications): area chips + availability labels come
  // from the marketing form's fixed lists.
  const mentorApplications: MentorApplication[] = [
    {
      id: did(),
      name: "Rochelle Baptiste",
      phone: "(602) 555-0114",
      email: "rochelle.baptiste@example.com",
      areas: ["Addiction & recovery", "Housing"],
      availability: "Weekly",
      story:
        "Six years in recovery. A mentor sat with me through my first ninety days and I want to be that person for someone else.",
      status: "new",
      createdAt: now - 2 * DAY - 5 * 3600e3,
    },
    {
      id: did(),
      name: "Gus Alvarado",
      phone: "(480) 555-0167",
      email: "gus.alvarado@example.com",
      areas: ["Incarceration & reentry", "Employment"],
      availability: "Every other week",
      story:
        "Came home in 2019, got steady work in 2020, and kept every promise since. I know the paperwork season and I can walk it with someone.",
      status: "contacted",
      createdAt: now - 9 * DAY - 3 * 3600e3,
    },
    {
      id: did(),
      name: "Denise Okafor",
      phone: "(623) 555-0139",
      email: "denise.okafor@example.com",
      areas: ["Homelessness", "Addiction & recovery"],
      availability: "Flexible",
      status: "approved",
      createdAt: now - 23 * DAY - 6 * 3600e3,
    },
  ];

  return {
    seedVersion: SEED_VERSION,
    // v15 employers appended LAST so every pre-v15 user keeps its position.
    users: [
      sarah,
      ...mentors,
      ...members,
      ...employers,
      angela,
      devStaff,
      ...employersV15,
    ],
    posts,
    threads: [dmThread, tyThread],
    donations,
    requests,
    centers,
    sessions,
    courses,
    enrollments,
    concerns: [],
    applications: mentorApplications,
    profileDetails,
    barcChecks,
    circles,
    circleMemberships,
    recoveryGoals,
    goalMilestones,
    jobApplications,
    resumes,
    resumeSections,
    careEpisodes,
    phaseTransitions,
    continuumEvents,
    sponsoredPlacements,
    placementEvents,
    demoLeads,
    careChannels,
    careMessages,
    consentGrants,
    followUps,
    jobPosts,
    notifications,
    memberBlocks,
    events,
    eventRsvps,
    postReports,
    programs,
    programCurriculum,
    programEnrollments,
    programSessions,
    sessionAttendance,
    careTeamAssignments,
    staffEngagements,
    challenges,
    challengeJoins,
    pulseSurveys,
    pulseResponses,
    staffTasks,
    employerProfiles,
    postingCandidates,
    retentionConfirms,
    savedJobs,
  };
}

function load(): DB {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as DB;
      // Older/foreign seed → discard and reseed so new installs see v2 data.
      if (parsed.seedVersion === SEED_VERSION) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return seed();
}

export function db(): DB {
  // A cached store from an older seed (dev-server HMR keeps globalThis alive
  // across recompiles) is discarded too, so a SEED_VERSION bump takes effect
  // without a server restart.
  if (!globalThis.__msdb || globalThis.__msdb.seedVersion !== SEED_VERSION) {
    globalThis.__msdb = load();
    save();
  }
  return globalThis.__msdb;
}

export function save(): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(globalThis.__msdb ?? db()));
  } catch {
    // read-only FS - in-memory only, acceptable for demo
  }
}

// ── helpers ────────────────────────────────────────────────────────────

export function findUserByEmail(email: string): User | undefined {
  return db().users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}

export function findUserById(id: string): User | undefined {
  return db().users.find((u) => u.id === id);
}

export function findMemberBySlug(slug: string): User | undefined {
  return db().users.find((u) => u.role === "member" && u.slug === slug);
}

export function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let slug = base || "member";
  let n = 2;
  while (findMemberBySlug(slug)) slug = `${base}-${n++}`;
  return slug;
}

export function newMemberNumber(): string {
  let num: string;
  do {
    num = "0" + String(Math.floor(10_000_000 + Math.random() * 89_999_999));
  } while (db().users.some((u) => u.memberNumber === num));
  return num;
}

/** Find or create the DM thread between two users. */
export function threadBetween(a: string, b: string): Thread {
  const d = db();
  let t = d.threads.find(
    (t) => t.participantIds.includes(a) && t.participantIds.includes(b)
  );
  if (!t) {
    t = { id: uid(), participantIds: [a, b], messages: [], createdAt: Date.now() };
    d.threads.push(t);
    save();
  }
  return t;
}

export function addMessage(
  thread: Thread,
  sender: User,
  body: string,
  kind: Message["kind"] = "text",
  mood?: number
): Message {
  const msg: Message = {
    id: uid(),
    senderId: sender.id,
    senderName: sender.name,
    kind,
    body,
    mood,
    createdAt: Date.now(),
  };
  thread.messages.push(msg);
  save();
  return msg;
}

/** The single write path into the continuum heartbeat. Every module hook
 *  (posts, lessons, donations, sessions, BARC, goals, phase changes) calls
 *  this - one row, many readers (score, timeline, export). Live events use
 *  Date.now(); seed events are EPOCH-anchored. Modules are extended with a
 *  one-line call, never rewritten. */
export function emitContinuumEvent(
  memberId: string,
  source: ContinuumSource,
  weight: number,
  refId?: string
): ContinuumEvent {
  const evt: ContinuumEvent = {
    id: uid(),
    memberId,
    source,
    refId,
    weight,
    occurredAt: Date.now(),
  };
  db().continuumEvents.push(evt);
  save();
  return evt;
}

/** Fire-and-forget notification into a user's inbox. The single write path for
 *  live notifications (mirrors emitContinuumEvent). Guards `d.notifications`,
 *  unshifts newest-first, persists. Returns null when there is no valid target
 *  (empty userId) - call sites additionally skip self-notification (never notify
 *  a user about their OWN action) by comparing target vs. actor before calling. */
export function emitNotification(
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  refType?: string,
  refId?: string
): Notification | null {
  if (!userId) return null;
  const d = db();
  d.notifications ??= [];
  const n: Notification = {
    id: uid(),
    userId,
    kind,
    title,
    body,
    refType,
    refId,
    read: false,
    createdAt: Date.now(),
  };
  d.notifications.unshift(n);
  save();
  return n;
}

export function addComment(post: Post, author: User, body: string): Comment {
  const c: Comment = {
    id: uid(),
    authorId: author.id,
    authorName: author.name,
    authorRole: author.role,
    body,
    createdAt: Date.now(),
  };
  post.comments.push(c);
  save();
  return c;
}
