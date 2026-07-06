// /api/profile — member profiles + BARC-10 self-checks (docs/13 Part A).
//
// GET  ?slug=…  PUBLIC, consent-gated exactly like /api/members/[slug]:
//               { profile } only when the member consented AND created
//               profile details; otherwise { profile: null }. Never leaks
//               BARC data, balances, email, or anything un-consented.
// GET  (none)   Session member's own full view: user + details + BARC trend.
// POST          Session member updates profile details, or records a BARC
//               self-check ({ barc: { scores } }). BARC results are private
//               to the member + supporting staff — never public.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { findMemberBySlug, save, uid, emitContinuumEvent } from "@/app/lib/store";
import { toSafeUser, type BarcSelfCheck, type ProfileDetails } from "@/app/lib/types";
import {
  barcChecksStore,
  buildPublicProfile,
  checksFor,
  deriveMilestones,
  deriveRecoveryCapital,
  detailsFor,
  profileDetailsStore,
} from "./profile-lib";

const defaultDetails = (userId: string): ProfileDetails => ({
  userId,
  interests: [],
  recoveryCapitalPublic: false,
  showMilestones: true,
});

/** Private trend projection — totals over time, member-eyes only. */
const trendOf = (checks: BarcSelfCheck[]) =>
  checks.map((c) => ({ id: c.id, takenAt: c.takenAt, total: c.total }));

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");

  // Public, consent-gated profile lookup.
  if (slug) {
    const profile = buildPublicProfile(findMemberBySlug(slug));
    return NextResponse.json({ profile });
  }

  // Own profile — session required.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to see your profile." }, { status: 401 });
  }
  const details = detailsFor(user.id) ?? defaultDetails(user.id);
  return NextResponse.json({
    user: toSafeUser(user),
    details,
    checks: trendOf(checksFor(user.id)),
    recoveryCapital: deriveRecoveryCapital(user),
    milestones: deriveMilestones(user),
  });
}

// ── POST: profile-details update or BARC self-check ─────────────────────

const BARC_DOMAIN_COUNT = 10;

function validateBarcScores(scores: unknown): Record<string, number> | null {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) return null;
  const entries = Object.entries(scores as Record<string, unknown>);
  if (entries.length !== BARC_DOMAIN_COUNT) return null;
  const clean: Record<string, number> = {};
  for (const [domain, value] of entries) {
    if (typeof domain !== "string" || !domain.trim()) return null;
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 5
    ) {
      return null;
    }
    clean[domain] = value;
  }
  return clean;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (user.role !== "member") {
    return NextResponse.json(
      { error: "Profiles and self-checks belong to members." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // ── BARC-10 self-check — warm self-reflection, never clinical ────────
  if (body.barc !== undefined) {
    const barc = body.barc as { scores?: unknown } | null;
    const scores = validateBarcScores(barc?.scores);
    if (!scores) {
      return NextResponse.json(
        {
          error:
            "A check-in needs all 10 areas, each rated 0–5. Take your time — there are no wrong answers.",
        },
        { status: 400 }
      );
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const check: BarcSelfCheck = {
      id: uid(),
      memberId: user.id,
      takenAt: Date.now(),
      scores,
      total,
    };
    barcChecksStore().push(check);
    save();

    // Continuum: a self-check is a reflection/engagement signal.
    emitContinuumEvent(user.id, "checkin", 3, check.id);

    return NextResponse.json({
      check: { id: check.id, takenAt: check.takenAt, total: check.total },
      checks: trendOf(checksFor(user.id)),
    });
  }

  // ── profile details update (partial, member-owned) ───────────────────
  const store = profileDetailsStore();
  const existing = detailsFor(user.id);
  const next: ProfileDetails = existing
    ? { ...existing }
    : defaultDetails(user.id);

  if (body.tagline !== undefined) {
    if (typeof body.tagline !== "string" || body.tagline.length > 140) {
      return NextResponse.json(
        { error: "Taglines are short — 140 characters or fewer." },
        { status: 400 }
      );
    }
    const tagline = body.tagline.trim();
    next.tagline = tagline || undefined;
  }
  if (body.journeySince !== undefined) {
    if (
      typeof body.journeySince !== "string" ||
      (body.journeySince !== "" && !/^\d{4}-\d{2}(-\d{2})?$/.test(body.journeySince))
    ) {
      return NextResponse.json(
        { error: "Journey-since needs a date (YYYY-MM-DD), or blank to clear." },
        { status: 400 }
      );
    }
    next.journeySince = body.journeySince || undefined;
  }
  if (body.interests !== undefined) {
    if (
      !Array.isArray(body.interests) ||
      body.interests.length > 8 ||
      body.interests.some(
        (i) => typeof i !== "string" || !i.trim() || i.trim().length > 28
      )
    ) {
      return NextResponse.json(
        { error: "Interests are up to 8 short tags (28 characters each)." },
        { status: 400 }
      );
    }
    // de-dupe, keep the member's order
    const seen = new Set<string>();
    next.interests = (body.interests as string[])
      .map((i) => i.trim())
      .filter((i) => {
        const key = i.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
  if (body.recoveryCapitalPublic !== undefined) {
    if (typeof body.recoveryCapitalPublic !== "boolean") {
      return NextResponse.json({ error: "Invalid toggle value." }, { status: 400 });
    }
    next.recoveryCapitalPublic = body.recoveryCapitalPublic;
  }
  if (body.showMilestones !== undefined) {
    if (typeof body.showMilestones !== "boolean") {
      return NextResponse.json({ error: "Invalid toggle value." }, { status: 400 });
    }
    next.showMilestones = body.showMilestones;
  }

  if (existing) {
    const idx = store.findIndex((p) => p.userId === user.id);
    store[idx] = next;
  } else {
    store.push(next);
  }
  save();
  return NextResponse.json({ details: next });
}
