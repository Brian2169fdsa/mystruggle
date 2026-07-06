import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser, getRoleUser } from "@/app/lib/auth";

// Pulse surveys (docs/16 Part E). ANONYMOUS-TO-PEERS, VISIBLE-TO-STAFF AS
// TRENDS ONLY: this endpoint never returns who answered - staff see a
// response COUNT and an AVERAGE per survey, never names, member ids, or
// individual notes. Members only ever see the questions still open for them.

// Local shapes - the store's DB interface is being extended concurrently;
// these match the agreed contract and are structurally compatible.
type PulseSurvey = {
  id: string;
  centerId?: string;
  programId?: string;
  question: string;
  createdBy: string;
  createdAt: number;
  closesAt?: number;
};

type PulseResponse = {
  id: string;
  surveyId: string;
  memberId: string;
  score: number;
  note?: string;
  createdAt: number;
};

// ── defensive store access (arrays may not be seeded yet) ──────────────
type PulseStore = {
  pulseSurveys?: PulseSurvey[];
  pulseResponses?: PulseResponse[];
};

function pulseStore() {
  const d = db() as ReturnType<typeof db> & PulseStore;
  d.pulseSurveys ??= [];
  d.pulseResponses ??= [];
  return d as ReturnType<typeof db> & Required<PulseStore>;
}

/** Aggregate view of one survey - counts and average ONLY. No member ids,
 *  no names, no notes: the anonymity boundary is enforced here. */
function aggregate(survey: PulseSurvey) {
  const d = pulseStore();
  const scores = d.pulseResponses
    .filter((r) => r.surveyId === survey.id)
    .map((r) => r.score);
  const avg = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
      100
    : null;
  return { ...survey, responses: scores.length, avg };
}

/** GET - staff: every survey (newest first) with { responses, avg } - trends,
 *  never names. Members: { open } - surveys they have NOT answered yet and
 *  that are not closed, newest first. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const d = pulseStore();
  const newestFirst = [...d.pulseSurveys].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  if (user.role === "staff") {
    return NextResponse.json({ surveys: newestFirst.map(aggregate) });
  }

  const nowTs = Date.now();
  const open = newestFirst.filter(
    (s) =>
      (s.closesAt == null || s.closesAt > nowTs) &&
      !d.pulseResponses.some(
        (r) => r.surveyId === s.id && r.memberId === user.id
      )
  );
  return NextResponse.json({ open });
}

/** POST - staff create a pulse survey. { question, programId?, closesAt? } */
export async function POST(req: Request) {
  const user = await getRoleUser(); // staff only (staff pass every gate)
  if (!user) {
    return NextResponse.json(
      { error: "Only staff can create pulse surveys." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => null);
  const question = String(body?.question ?? "").trim().slice(0, 200);
  const programId = String(body?.programId ?? "").trim() || undefined;
  if (!question) {
    return NextResponse.json(
      { error: "A question is required." },
      { status: 400 }
    );
  }
  let closesAt: number | undefined;
  if (body?.closesAt != null && body.closesAt !== "") {
    const c = Number(body.closesAt);
    if (!Number.isFinite(c) || c <= 0) {
      return NextResponse.json(
        { error: "The close time must be a valid time." },
        { status: 400 }
      );
    }
    closesAt = c;
  }

  const d = pulseStore();
  const survey: PulseSurvey = {
    id: uid(),
    centerId: user.centerId,
    programId,
    question,
    createdBy: user.id,
    createdAt: Date.now(),
    closesAt,
  };
  d.pulseSurveys.push(survey);
  save();
  return NextResponse.json({ survey: aggregate(survey) });
}
