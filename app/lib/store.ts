// Platform data store — in-memory singleton with JSON file persistence.
// Dev: persists to .data/db.json. Vercel: persists to /tmp (per-instance,
// resets on cold start — demo-grade). Swap this module for Supabase/Postgres
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
  // continuum of care (seed v7 — docs/14 / requirements/11 §A/B/K)
  careEpisodes: CareEpisode[];
  phaseTransitions: PhaseTransition[];
  continuumEvents: ContinuumEvent[];
  // community ad product (seed v8 — docs/15 §B / requirements/12 §B/E)
  sponsoredPlacements: SponsoredPlacement[];
  placementEvents: PlacementEvent[];
  demoLeads: DemoLead[];
}

/** Bump when the seed shape/volume changes — stale .data/db.json is discarded
 *  on load so existing installs pick up the new seed. */
const SEED_VERSION = 8;

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

/** True when the platform-wide ad kill switch is engaged — /serve returns []
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

/** ms_admin updates the ad config (additive patch — only given keys change). */
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

const EPOCH = 1751500000000; // ~2026-07-03 — fixed so output is stable
const DAY = 86400e3;

/** mulberry32 — tiny deterministic PRNG, returns floats in [0, 1). */
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

// Dignified, person-first story sentences — composed 2–3 at a time.
const STORY_SENTENCES = [
  "I'm showing up for myself every day, and it's starting to show.",
  "After a hard season, I found the center and a mentor who believed in me before I did.",
  "I'm studying for my GED and I haven't missed a class in weeks.",
  "I started my first steady job this year and I'm proud of every shift.",
  "My savings account is small but growing, and it's mine.",
  "I check in with my mentor every week — that consistency changed everything.",
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
  "Hit a 14-day check-in streak — longest one yet.",
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
  "Inspiring — thank you for sharing.",
  "One day at a time. You've got this.",
  "The whole center is cheering for you.",
  "Love this. Congratulations!",
];

const SESSION_NOTES = [
  "Reviewed weekly budget together — on track.",
  "Talked through job interview prep.",
  "Checked in on housing application progress.",
  "Celebrated the check-in streak; set next week's goal.",
  "Worked on GED study plan.",
  "Discussed transportation options for the new job.",
  "Quiet week — mostly listened. Follow up Friday.",
];

const DONATION_AMOUNTS = [5, 10, 10, 15, 20, 25, 25, 25, 30, 40, 50, 50, 75, 100];

// ── community-expansion templates (seed v6 — dignified voice) ───────────

/** BARC-10 self-check domains — warm, non-clinical framing. */
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
    why: "This place gave me my start — I want to give back.",
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
  "Dependable — on time, every time",
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
  "Manager seemed friendly — send a thank-you note.",
  "They asked about weekend availability. I said yes.",
  "Bus route works — 20 minutes door to door.",
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
    "Alumni meetup Saturday — who's coming?",
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

  // Deterministic ids — counter-based, can never collide with runtime uuids.
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
      "I earned my GED, started my first job, and moved into transitional housing — three milestones in eight months. Right now I'm working toward $175 a week for my hallway house, the last step before a place of my own.",
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
      body: "One year sober today. To everyone at the center who never gave up on me — this one's for you. Now I get to walk it with my mentees.",
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
    // Community channel — weighted toward general/recovery; jobs/housing
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
        body: "Hey Tyrell — haven't seen you check in this week. No pressure, just thinking of you. Coffee Friday?",
        createdAt: now - 6 * 86400e3,
      },
    ],
  };

  // ── LMS: courses + enrollments (added in seed v3 — keep AFTER all v2
  //    sections so earlier PRNG draws and seed-* ids stay byte-identical) ─
  const courses: Course[] = [
    { id: "course-ise-1", title: "ISE Course 1 — Honesty", program: "PON", lessonCount: 6 },
    { id: "course-ise-2", title: "ISE Course 2 — Hope", program: "PON", lessonCount: 6 },
    { id: "course-ise-3", title: "ISE Course 3 — Decision", program: "PON", lessonCount: 6 },
    { id: "course-forklift", title: "Forklift Certification", program: "VOC", lessonCount: 8 },
    { id: "course-docs-id", title: "Documents & ID Recovery", program: "NAV", lessonCount: 4 },
    { id: "course-relapse-basics", title: "Relapse Prevention Basics", program: "IOP", lessonCount: 5 },
  ];

  // Danielle mirrors her demo cards: ISE Course 3 in progress (lesson 3 is
  // next — 2/6 done, the closest integers get to the demo's 45%), Forklift
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

  // ── Community expansion (added in seed v6 — keep AFTER all v5 sections
  //    so earlier PRNG draws and seed-* ids stay byte-identical) ─────────

  // ── circles ──────────────────────────────────────────────────────────
  const circles: Circle[] = [
    {
      id: "circle-job-seekers",
      name: "Job Seekers",
      kind: "topic",
      description:
        "Applications, interviews, first days — we keep each other going.",
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
      description: "Daily gratitude and wins of the week — big or small, they count.",
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

  // Housing goal — linked to her existing "Hallway house" QR funding request.
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

  // BARC-10 trend — three self-checks over three months, trending up.
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

  // ── generated breadth — circles, goals, profiles, résumés, BARC ───────

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

  // ── circle posts (~20) — same shape as existing posts + circleId ──────
  // Main-feed posts keep circleId undefined; circle posts are scoped.
  type CirclePost = Post & { circleId: string };

  // Danielle's circle posts (hand-written — flagship storyline).
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

  // ── Continuum of Care (added in seed v7 — keep AFTER all v6 sections so
  //    earlier PRNG draws and seed-* ids stay byte-identical) ─────────────
  // The spine: care_episodes + phase_transitions + continuum_events. Danielle
  // traverses ALL FIVE phases end to end; her continuum_events are DERIVED
  // from her already-seeded artifacts (the "hooks in seed" idea — no module
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
    "Assessment complete — welcomed them into the next step of their care.",
    "Great progress this week; ready to move forward together.",
    "Stepped down a level after hitting their goals. Proud of them.",
    "Discharge planning underway — housing and work goals set.",
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
    endedAt: undefined, // continuing is indefinite — the relationship stays open
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
        "Assessment done — Danielle's a great fit for our IOP cohort. Welcome to the program.",
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
        "Danielle finished her IOP hours. We started planning her step-down together — housing and work first.",
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

  // (7) one phase event (weight 5) per transition — the outcomes markers.
  for (const t of danielleTransitions) emitSeed("phase", 5, t.at, t.id);

  // (8) ongoing rhythm across the full 14-month arc — her day-to-day
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

  // ── Community Ad Product (added in seed v8 — keep AFTER all v7 sections
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
          memberId: pick(members).id, // internal cap/dedup only — never surfaced
          occurredAt: now - int(0, 14) * DAY - int(0, 23) * 3600e3,
        });
      }
    };
    push("impression", impressions);
    push("click", clicks);
    push("dismiss", dismiss);
    push("report", reports);
  };

  // (1) APPROVED + running — Laveen alumni event, targeted to alumni (continuing).
  const bbq: SponsoredPlacement = {
    id: did(),
    orgId: laveen.id,
    orgName: laveen.name,
    title: "Laveen Alumni BBQ — Saturday",
    body: "Alumni, families, and mentors — join us Saturday at noon for food, music, and a chance to reconnect. Bring someone you're walking beside.",
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
  // (2) APPROVED + running — fair-chance job opening, coarse employment interest.
  const job: SponsoredPlacement = {
    id: did(),
    orgId: southPhoenix.id,
    orgName: southPhoenix.name,
    title: "Warehouse Associates — Desert Logistics, fair-chance employer",
    body: "Desert Logistics is hiring warehouse associates and welcomes applicants in recovery — a fair-chance employer that hires on who you are today. Steady hours, weekly pay.",
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
  // (3) APPROVED + running — IOP program starting, community-wide by metro.
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
  // (4) PENDING_REVIEW — waiting in the ms_admin queue (recovery-relevant, clean).
  const pending: SponsoredPlacement = {
    id: did(),
    orgId: southPhoenix.id,
    orgName: southPhoenix.name,
    title: "Free resume workshop for members",
    body: "Bring your work history — our navigators will help you build a fair-chance-ready resume in one sitting. Coffee provided.",
    ctaLabel: "Save my seat",
    ctaUrl: "https://example.org/south-phoenix/resume-workshop",
    kind: "service",
    audienceScope: "community",
    targeting: { interestTags: ["employment"] },
    status: "pending_review",
    budgetCents: 10000,
    createdAt: now - 1 * DAY,
  };
  // (5) REJECTED — kept as the ms_admin console's rejected example.
  const rejected: SponsoredPlacement = {
    id: did(),
    orgId: southPhoenix.id,
    orgName: southPhoenix.name,
    title: "Recovery social — happy hour mocktails and more",
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
      message: "Closed the loop — signed for the platform tier. Following up on ad-product add-on next quarter.",
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

  return {
    seedVersion: SEED_VERSION,
    users: [sarah, ...mentors, ...members],
    posts,
    threads: [dmThread, tyThread],
    donations,
    requests,
    centers,
    sessions,
    courses,
    enrollments,
    concerns: [],
    applications: [],
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
  if (!globalThis.__msdb) {
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
    // read-only FS — in-memory only, acceptable for demo
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
 *  this — one row, many readers (score, timeline, export). Live events use
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
