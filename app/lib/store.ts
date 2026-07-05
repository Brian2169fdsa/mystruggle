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
}

/** Bump when the seed shape/volume changes — stale .data/db.json is discarded
 *  on load so existing installs pick up the new seed. */
const SEED_VERSION = 5;

const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

declare global {
  // eslint-disable-next-line no-var
  var __msdb: DB | undefined;
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
