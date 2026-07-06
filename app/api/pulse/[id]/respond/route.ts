import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";

// Answer a pulse survey (docs/16 Part E). One response per member per
// survey - answering again REPLACES the previous answer (latest feeling
// wins; no duplicate rows, no 409 friction). ANONYMOUS-TO-PEERS: the
// response is stored with the member id for dedupe only; no API ever
// returns it - staff read counts and averages, never names or notes.

// Local shapes - kept in sync with /api/pulse (DB is being extended
// concurrently; these match the agreed contract).
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

/** POST - { score: 1-5, note? (≤200 chars) } → { ok: true }.
 *  Member-only. Replaces any earlier answer from the same member. Returns
 *  no survey data and no aggregate - a member's answer is between them and
 *  the trend line. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRoleUser("member");
  if (!user) {
    return NextResponse.json(
      { error: "Sign in as a member to answer." },
      { status: 401 }
    );
  }
  const { id } = await params;
  const d = pulseStore();
  const survey = d.pulseSurveys.find((s) => s.id === id);
  if (!survey) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  }
  if (survey.closesAt != null && survey.closesAt <= Date.now()) {
    return NextResponse.json(
      { error: "This survey has closed." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const score = Number(body?.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json(
      { error: "Score must be a whole number from 1 to 5." },
      { status: 400 }
    );
  }
  const rawNote = body?.note == null ? "" : String(body.note).trim();
  if (rawNote.length > 200) {
    return NextResponse.json(
      { error: "Notes are limited to 200 characters." },
      { status: 400 }
    );
  }
  const note = rawNote || undefined;

  // One response per member per survey - replace, don't duplicate.
  const existing = d.pulseResponses.find(
    (r) => r.surveyId === id && r.memberId === user.id
  );
  if (existing) {
    existing.score = score;
    existing.note = note;
    existing.createdAt = Date.now();
  } else {
    d.pulseResponses.push({
      id: uid(),
      surveyId: id,
      memberId: user.id,
      score,
      note,
      createdAt: Date.now(),
    });
  }
  save();
  return NextResponse.json({ ok: true });
}
