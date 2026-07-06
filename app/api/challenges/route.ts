import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser, getRoleUser } from "@/app/lib/auth";

// Engagement Toolkit - challenges (docs/16 Part E). Opt-in, time-boxed,
// participation-only: the API exposes a participants COUNT and never a
// ranked list, so no leaderboard can be built from it (docs/07 anti-toxicity).

// Local shapes - the store's DB interface is being extended concurrently;
// these match the agreed contract and are structurally compatible.
type Challenge = {
  id: string;
  centerId?: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt: number;
  badge?: string;
  createdBy: string;
  createdAt: number;
};

type ChallengeJoin = {
  id: string;
  challengeId: string;
  memberId: string;
  joinedAt: number;
};

// ── defensive store access (arrays may not be seeded yet) ──────────────
type ChallengeStore = {
  challenges?: Challenge[];
  challengeJoins?: ChallengeJoin[];
};

function challengeStore() {
  const d = db() as ReturnType<typeof db> & ChallengeStore;
  d.challenges ??= [];
  d.challengeJoins ??= [];
  return d as ReturnType<typeof db> & Required<ChallengeStore>;
}

/** Decorate a challenge with the viewer's join state, the participation
 *  count, and whether its window is open right now. Count only - never a
 *  roster, never a ranking. */
function enrichChallenge(challenge: Challenge, viewerId?: string) {
  const d = challengeStore();
  const joins = d.challengeJoins.filter(
    (j) => j.challengeId === challenge.id
  );
  const nowTs = Date.now();
  return {
    ...challenge,
    joined: viewerId ? joins.some((j) => j.memberId === viewerId) : false,
    participants: joins.length,
    active: nowTs >= challenge.startsAt && nowTs <= challenge.endsAt,
  };
}

/** GET - every challenge, newest first, decorated for the signed-in viewer. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const d = challengeStore();
  const challenges = [...d.challenges]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((c) => enrichChallenge(c, user.id));
  return NextResponse.json({ challenges });
}

/** POST - staff create a time-boxed, opt-in challenge with an optional
 *  badge emoji. { title, description, startsAt, endsAt, badge? } */
export async function POST(req: Request) {
  const user = await getRoleUser(); // staff only (staff pass every gate)
  if (!user) {
    return NextResponse.json(
      { error: "Only staff can create challenges." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const startsAt = Number(body?.startsAt);
  const endsAt = Number(body?.endsAt);
  const badge = String(body?.badge ?? "").trim().slice(0, 16) || undefined;

  if (!title || !description) {
    return NextResponse.json(
      { error: "A title and a description are required." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(startsAt) || startsAt <= 0) {
    return NextResponse.json(
      { error: "A valid start time is required." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(endsAt) || endsAt <= startsAt) {
    return NextResponse.json(
      { error: "The end time must be after the start time." },
      { status: 400 }
    );
  }

  const d = challengeStore();
  const challenge: Challenge = {
    id: uid(),
    centerId: user.centerId,
    title,
    description,
    startsAt,
    endsAt,
    badge,
    createdBy: user.id,
    createdAt: Date.now(),
  };
  d.challenges.push(challenge);
  save();
  return NextResponse.json({ challenge: enrichChallenge(challenge, user.id) });
}
