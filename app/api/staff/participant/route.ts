// /api/staff/participant - CONSENT-GATED staff read of a member's BARC-10
// self-check trend + résumé (requirements/11 §C - the granular ConsentGrant).
//
// A member's BARC trend and résumé are member-private surfaces (see
// /api/profile and /api/resumes - both owner-only). This route opens a
// READ-ONLY staff path that is gated on an ACTIVE ConsentGrant from that
// member to the signed-in staff's center. No consent → no data, ever.
//
// GET ?memberId=…  staff-only.
//   401 signed-out · 403 non-staff · 400 missing memberId.
//   No active consent → { consent: false, barc: null, resume: null } (200) -
//     a clean "not shared" state, never the data.
//   Active consent → { consent: true, barc: { trend: [{ takenAt, total }] },
//     resume: { …public-safe projection… } | null }.
//
// This is the FIRST route to gate on the explicit ConsentGrant. The continuum
// staff reads (outcomes, care-channels) use center affiliation as an implicit
// grant; here we honor the member's revocable, center-specific grant literally,
// mirroring the ConsentGrant contract in app/lib/types (revokedAt undefined =
// active - a revoked/expired grant cuts access).

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { db } from "@/app/lib/store";
import type {
  BarcSelfCheck,
  ConsentGrant,
  Resume,
  ResumeSection,
} from "@/app/lib/types";

// ── defensive store access ──────────────────────────────────────────────
// These expansion arrays may be seeded by a concurrent pass or absent on a
// fresh store - default them in place so both orders of arrival work.
type ParticipantStore = {
  consentGrants?: ConsentGrant[];
  barcChecks?: BarcSelfCheck[];
  resumes?: Resume[];
  resumeSections?: ResumeSection[];
};

function pstore() {
  const d = db() as ReturnType<typeof db> & ParticipantStore;
  d.consentGrants ??= [];
  d.barcChecks ??= [];
  d.resumes ??= [];
  d.resumeSections ??= [];
  return d as ReturnType<typeof db> & Required<ParticipantStore>;
}

/** An ACTIVE continuum grant from this member to this center, or undefined.
 *  Active = not revoked (revokedAt undefined, or a revoke/expiry date still in
 *  the future). Mirrors the ConsentGrant contract in app/lib/types. */
function activeGrant(
  memberId: string,
  centerId: string | undefined
): ConsentGrant | undefined {
  if (!centerId) return undefined;
  const now = Date.now();
  return pstore().consentGrants.find(
    (g) =>
      g.memberId === memberId &&
      g.centerId === centerId &&
      g.scope === "continuum" &&
      (g.revokedAt == null || g.revokedAt > now)
  );
}

/** BARC trend projection - totals over time only, oldest → newest. Parity
 *  with /api/profile's private trend: never the raw 10-domain scores. */
function barcTrend(memberId: string): { takenAt: number; total: number }[] {
  return pstore()
    .barcChecks.filter((c) => c.memberId === memberId)
    .sort((a, b) => a.takenAt - b.takenAt)
    .map((c) => ({ takenAt: c.takenAt, total: c.total }));
}

/** Public-safe résumé projection - the member's primary résumé + sections.
 *  Deliberately omits the account email (never leak email). Returns null when
 *  the member has no résumé on file. */
function resumeProjection(memberId: string) {
  const t = pstore();
  const resume =
    t.resumes.find((r) => r.memberId === memberId && r.isPrimary) ??
    t.resumes.find((r) => r.memberId === memberId);
  if (!resume) return null;

  const sections = t.resumeSections
    .filter((s) => s.resumeId === resume.id)
    .sort((a, b) => a.sort - b.sort)
    .map((s) => ({ id: s.id, kind: s.kind, content: s.content, sort: s.sort }));

  return {
    fullName: resume.fullName,
    headline: resume.headline,
    summary: resume.summary,
    // Contact minus email - a member's account email is never surfaced to
    // staff here (phone/city are résumé-authored, safe to show).
    contact: resume.contact
      ? { phone: resume.contact.phone, city: resume.contact.city }
      : undefined,
    template: resume.template,
    updatedAt: resume.updatedAt,
    sections,
  };
}

export async function GET(req: Request) {
  // 401 signed-out vs. 403 non-staff - resolved explicitly so the two states
  // are distinct (getRoleUser("staff") collapses both to null). The gate is
  // still staff-only: only role "staff" passes.
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  if (me.role !== "staff") {
    return NextResponse.json(
      { error: "This view is for center staff." },
      { status: 403 }
    );
  }

  const memberId = new URL(req.url).searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json(
      { error: "memberId is required." },
      { status: 400 }
    );
  }

  // The consent gate: an active grant from THIS member to THIS staff's center.
  // No grant → the clean "not shared" state, never the data.
  const grant = activeGrant(memberId, me.centerId);
  if (!grant) {
    return NextResponse.json({ consent: false, barc: null, resume: null });
  }

  return NextResponse.json({
    consent: true,
    barc: { trend: barcTrend(memberId) },
    resume: resumeProjection(memberId),
  });
}
