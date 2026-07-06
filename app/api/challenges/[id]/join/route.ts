import { NextResponse } from "next/server";
import { db, save, uid, emitContinuumEvent } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";

// Join / leave a challenge (docs/16 Part E). Strictly opt-in, idempotent,
// participation-only - joining adds you to a COUNT, never to a public list.

// Local shapes - kept in sync with /api/challenges (DB is being extended
// concurrently; these match the agreed contract).
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

/** Same decorated shape GET /api/challenges returns. */
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

/** POST - { join: boolean }. Add or remove the signed-in member's opt-in.
 *  Idempotent: joining twice keeps one row (and emits one continuum event);
 *  leaving when not joined is a no-op. A fresh join is an engagement signal
 *  → emitContinuumEvent(memberId, "community", 2, challengeId). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRoleUser("member");
  if (!user) {
    return NextResponse.json(
      { error: "Sign in as a member to join challenges." },
      { status: 401 }
    );
  }
  const { id } = await params;
  const d = challengeStore();
  const challenge = d.challenges.find((c) => c.id === id);
  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge not found." },
      { status: 404 }
    );
  }
  const body = await req.json().catch(() => null);
  const join = Boolean(body?.join);

  const existing = d.challengeJoins.find(
    (j) => j.challengeId === id && j.memberId === user.id
  );
  if (join) {
    if (!existing) {
      d.challengeJoins.push({
        id: uid(),
        challengeId: id,
        memberId: user.id,
        joinedAt: Date.now(),
      });
      save();
      // Opting in is an engagement signal → the continuum heartbeat.
      emitContinuumEvent(user.id, "community", 2, id);
    }
  } else if (existing) {
    d.challengeJoins = d.challengeJoins.filter(
      (j) => !(j.challengeId === id && j.memberId === user.id)
    );
    save();
  }

  return NextResponse.json({ challenge: enrichChallenge(challenge, user.id) });
}
