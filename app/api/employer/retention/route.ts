import { NextResponse } from "next/server";
import {
  db,
  save,
  uid,
  findUserById,
  emitContinuumEvent,
} from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { JobPost } from "@/app/lib/types";

/**
 * /api/employer/retention - 30/90/180-day retention check-ins (docs/17).
 *
 * GET  → { hires } for the signed-in employer's OWN postings: each hire with
 *        its confirm history and the next due checkpoint.
 * POST → { candidateId, day, stillEmployed } - record one confirm. Idempotent
 *        per (candidateId, day). Each stillEmployed=true confirm emits a
 *        continuum event (source "goal", weight 3) - retention IS recovery
 *        signal; staying employed is sustained community capital.
 *
 * PRIVACY WALL (same as /api/employer/pipeline): the payload carries the
 * member's chosen FIRST NAME and nothing else about them - no memberId,
 * memberNumber, slug, center, journey/continuum data, balances, or email.
 * memberId lives server-side only, on the candidate and confirm rows.
 */

type CandidateStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "closed";

interface PostingCandidate {
  id: string;
  postingId: string;
  jobApplicationId: string;
  memberId: string; // SERVER-SIDE ONLY
  stage: CandidateStage;
  stageChangedAt: number;
  employerNotes?: string;
  createdAt: number;
}

type RetentionDay = 30 | 90 | 180;
const RETENTION_DAYS: RetentionDay[] = [30, 90, 180];
const DAY_MS = 86_400_000;

/** When a day-N check-in becomes confirmable: hiredAt + N days. */
function dueAt(hiredAt: number, day: RetentionDay): number {
  return hiredAt + day * DAY_MS;
}

interface RetentionConfirm {
  id: string;
  candidateId: string;
  memberId: string; // SERVER-SIDE ONLY
  employerId: string;
  day: RetentionDay;
  stillEmployed: boolean;
  confirmedAt: number;
}

type RetentionStore = {
  jobPosts?: JobPost[];
  postingCandidates?: PostingCandidate[];
  retentionConfirms?: RetentionConfirm[];
};

function store() {
  const d = db() as ReturnType<typeof db> & RetentionStore;
  d.jobPosts ??= [];
  d.postingCandidates ??= [];
  d.retentionConfirms ??= [];
  return d as ReturnType<typeof db> & Required<RetentionStore>;
}

function firstNameOnly(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

async function requireEmployer() {
  // Direct role check - getRoleUser() waves staff through every gate, and
  // this surface is strictly the employer's own hires.
  const user = await getSessionUser();
  if (!user || user.role !== "employer") return null;
  return user;
}

function hireView(c: PostingCandidate, posting: JobPost) {
  const confirms = store()
    .retentionConfirms.filter((rc) => rc.candidateId === c.id)
    .sort((a, b) => a.day - b.day)
    .map((rc) => ({
      day: rc.day,
      stillEmployed: rc.stillEmployed,
      confirmedAt: rc.confirmedAt,
    }));
  const confirmedDays = new Set(confirms.map((rc) => rc.day));
  const now = Date.now();
  const hiredAt = c.stageChangedAt;
  const unconfirmed = RETENTION_DAYS.filter((day) => !confirmedDays.has(day));
  // nextDue = the first unconfirmed checkpoint that is actually DUE (its
  // day-N date has passed). If nothing is due yet, nextDue is null and
  // `upcoming` carries the earliest unconfirmed checkpoint still ahead.
  const nextDue =
    unconfirmed.find((day) => now >= dueAt(hiredAt, day)) ?? null;
  const upcomingDay =
    unconfirmed.find((day) => now < dueAt(hiredAt, day)) ?? null;
  return {
    candidateId: c.id,
    chosenName: firstNameOnly(findUserById(c.memberId)?.name ?? "Member"),
    postingTitle: posting.title,
    hiredAt,
    confirms,
    nextDue,
    upcoming: upcomingDay
      ? { day: upcomingDay, dueAt: dueAt(hiredAt, upcomingDay) }
      : null,
  };
}

// ── GET - the employer's hires + retention check-in state ──────────────
export async function GET() {
  const user = await requireEmployer();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in as an employer first." },
      { status: 401 }
    );
  }
  const d = store();
  const ownPostings = new Map(
    d.jobPosts.filter((j) => j.employerId === user.id).map((j) => [j.id, j])
  );
  const hires = d.postingCandidates
    .filter((c) => c.stage === "hired" && ownPostings.has(c.postingId))
    .sort((a, b) => b.stageChangedAt - a.stageChangedAt)
    .map((c) => hireView(c, ownPostings.get(c.postingId)!));
  return NextResponse.json({ hires });
}

// ── POST - record one retention confirm (idempotent per candidate+day) ─
export async function POST(req: Request) {
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
  const day = Number(body.day) as RetentionDay;
  if (!RETENTION_DAYS.includes(day)) {
    return NextResponse.json(
      { error: "day must be 30, 90, or 180." },
      { status: 400 }
    );
  }

  const d = store();
  const candidate = d.postingCandidates.find((c) => c.id === body.candidateId);
  const posting =
    candidate && d.jobPosts.find((j) => j.id === candidate.postingId);
  if (!candidate || !posting || posting.employerId !== user.id) {
    return NextResponse.json({ error: "Hire not found." }, { status: 404 });
  }
  if (candidate.stage !== "hired") {
    return NextResponse.json(
      { error: "Retention check-ins apply to hired candidates." },
      { status: 400 }
    );
  }

  // Idempotent: one confirm per (candidateId, day). A repeat returns the
  // existing row unchanged - no duplicate rows, no double continuum event.
  const existing = d.retentionConfirms.find(
    (rc) => rc.candidateId === candidate.id && rc.day === day
  );
  if (existing) {
    return NextResponse.json({
      confirm: {
        day: existing.day,
        stillEmployed: existing.stillEmployed,
        confirmedAt: existing.confirmedAt,
      },
    });
  }

  // Time gate: a day-N check-in only opens once N days have passed since the
  // hire. Confirming early would inflate the retention story we publish.
  const openAt = dueAt(candidate.stageChangedAt, day);
  if (Date.now() < openAt) {
    const openDate = new Date(openAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    return NextResponse.json(
      {
        error: `Not just yet - the ${day}-day check-in opens on day ${day} (${openDate}). Check back then and tell us how it's going.`,
      },
      { status: 400 }
    );
  }

  const confirm: RetentionConfirm = {
    id: uid(),
    candidateId: candidate.id,
    memberId: candidate.memberId,
    employerId: user.id,
    day,
    stillEmployed: Boolean(body.stillEmployed),
    confirmedAt: Date.now(),
  };
  d.retentionConfirms.push(confirm);

  // Still employed at the checkpoint = sustained recovery signal. Same
  // continuum source as the hired event ("goal" - the recovery-goal flow's
  // source), weight 3.
  if (confirm.stillEmployed) {
    emitContinuumEvent(candidate.memberId, "goal", 3, candidate.id);
  }
  save();

  return NextResponse.json({
    confirm: {
      day: confirm.day,
      stillEmployed: confirm.stillEmployed,
      confirmedAt: confirm.confirmedAt,
    },
  });
}
