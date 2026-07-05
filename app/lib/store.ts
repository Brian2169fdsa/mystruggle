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
} from "./types";

interface DB {
  users: User[];
  posts: Post[];
  threads: Thread[];
  donations: Donation[];
  requests: SupportRequest[];
}

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

function seed(): DB {
  const now = Date.now();
  const mk = (
    role: Role,
    name: string,
    email: string,
    avatarColor: string,
    extra: Partial<User> = {}
  ): User => {
    const salt = newSalt();
    return {
      id: uid(),
      role,
      name,
      email,
      salt,
      passwordHash: hashPassword("mystruggle", salt),
      createdAt: now - 90 * 86400e3,
      avatarColor,
      ...extra,
    };
  };

  const marcus = mk("mentor", "Marcus", "marcus@themystruggles.com", "#4E5B9B");
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
  });

  const requests: SupportRequest[] = [
    {
      id: uid(),
      memberId: danielle.id,
      label: "Hallway house",
      weeklyTarget: 175,
      raised: 105,
      status: "active",
      createdAt: now - 30 * 86400e3,
    },
    {
      id: uid(),
      memberId: tyrell.id,
      label: "Forklift certification fee",
      weeklyTarget: 60,
      raised: 15,
      status: "active",
      createdAt: now - 10 * 86400e3,
    },
  ];

  const posts: Post[] = [
    {
      id: uid(),
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
          id: uid(),
          authorId: danielle.id,
          authorName: "Danielle",
          authorRole: "member",
          body: "So proud of you Marcus. You showed me it's possible.",
          createdAt: now - 2 * 86400e3,
        },
      ],
      createdAt: now - 2 * 86400e3,
    },
    {
      id: uid(),
      authorId: danielle.id,
      authorName: "Danielle",
      authorRole: "member",
      avatarColor: "#2E7CD6",
      body: "Got my GED today. The whole center stopped to cheer. Next stop: my own place.",
      kind: "win",
      status: "approved",
      hearts: [marcus.id],
      comments: [],
      createdAt: now - 4 * 86400e3,
    },
  ];

  const dmThread: Thread = {
    id: uid(),
    participantIds: [danielle.id, marcus.id],
    createdAt: now - 60 * 86400e3,
    messages: [
      {
        id: uid(),
        senderId: marcus.id,
        senderName: "Marcus",
        kind: "text",
        body: "Proud of you for Tuesday. Same time this week?",
        createdAt: now - 3600e3 * 5,
      },
      {
        id: uid(),
        senderId: danielle.id,
        senderName: "Danielle",
        kind: "text",
        body: "Yes! And I finished lesson 2 already 😊",
        createdAt: now - 3600e3 * 4,
      },
    ],
  };
  const tyThread: Thread = {
    id: uid(),
    participantIds: [tyrell.id, marcus.id],
    createdAt: now - 40 * 86400e3,
    messages: [
      {
        id: uid(),
        senderId: marcus.id,
        senderName: "Marcus",
        kind: "text",
        body: "Hey Tyrell — haven't seen you check in this week. No pressure, just thinking of you. Coffee Friday?",
        createdAt: now - 6 * 86400e3,
      },
    ],
  };

  return {
    users: [marcus, danielle, tyrell, andre],
    posts,
    threads: [dmThread, tyThread],
    donations: [],
    requests,
  };
}

function load(): DB {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as DB;
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
