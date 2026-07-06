import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { detailsFor } from "@/app/api/profile/profile-lib";
import type { MemberBlock, ProfileDetails, User } from "@/app/lib/types";

// GET /api/community/highlights - right-rail celebration data.
//
// Two lists, both strictly consent-gated with the SAME top gate as
// buildPublicProfile (app/api/profile/profile-lib.ts): a member only appears
// when they are role "member", have consentPublic, a slug + memberNumber,
// AND have created profile details. We reuse `detailsFor` from profile-lib
// directly (no circularity - this route only imports downward).
//
//   anniversaries - members whose journeySince month matches the current
//                   month (any year): full years (or months when < 1 year)
//                   on the journey as of today. Cap 6, longest first.
//   suggestions   - up to 6 other public members ("Members you may know"),
//                   excluding the signed-in viewer and anyone they block.
//                   Deterministic order (memberNumber hash) so it's stable.
//
// NEVER includes BARC data, balances, emails, or ids beyond the public slug.

interface AnniversaryRow {
  slug: string;
  name: string;
  avatarColor: string;
  years: number;
  months: number;
}

interface SuggestionRow {
  slug: string;
  name: string;
  avatarColor: string;
  tagline?: string;
  interests: string[];
}

type PublicUser = User & { slug: string; memberNumber: string };

/** Same consent gate as buildPublicProfile: consentPublic + slug +
 *  memberNumber + existing profile details, members only. */
function publicMembers(): { member: PublicUser; details: ProfileDetails }[] {
  const out: { member: PublicUser; details: ProfileDetails }[] = [];
  for (const u of db().users) {
    if (u.role !== "member") continue;
    if (!u.consentPublic || !u.slug || !u.memberNumber) continue;
    const details = detailsFor(u.id);
    if (!details) continue;
    out.push({ member: u as PublicUser, details });
  }
  return out;
}

// ── defensive memberBlocks access (same pattern as /api/blocks) ─────────
function blockedIdsFor(blockerId: string): Set<string> {
  const d = db() as ReturnType<typeof db> & { memberBlocks?: MemberBlock[] };
  const blocks = Array.isArray(d.memberBlocks) ? d.memberBlocks : [];
  return new Set(
    blocks.filter((b) => b.blockerId === blockerId).map((b) => b.blockedId)
  );
}

/** Parse "YYYY-MM" or "YYYY-MM-DD" → { y, m (1–12), day }. */
function parseJourneySince(
  s: string
): { y: number; m: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const day = match[3] ? Number(match[3]) : 1;
  if (m < 1 || m > 12) return null;
  return { y, m, day };
}

/** Full months elapsed from journeySince to `now` (never negative). */
function monthsOnJourney(
  start: { y: number; m: number; day: number },
  now: Date
): number {
  let months =
    (now.getFullYear() - start.y) * 12 + (now.getMonth() + 1 - start.m);
  if (now.getDate() < start.day) months -= 1;
  return Math.max(0, months);
}

/** Small deterministic string hash (FNV-1a) for stable suggestion order. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export async function GET() {
  const viewer = await getSessionUser(); // null when signed out - still OK
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const pub = publicMembers();

  // ── Recovery anniversaries: journeySince month === current month ──────
  const anniversaries: AnniversaryRow[] = pub
    .flatMap(({ member, details }) => {
      if (!details.journeySince) return [];
      const start = parseJourneySince(details.journeySince);
      if (!start || start.m !== currentMonth) return [];
      const total = monthsOnJourney(start, now);
      if (total < 1) return []; // just started - nothing to celebrate yet
      return [
        {
          slug: member.slug,
          name: member.name,
          avatarColor: member.avatarColor,
          years: Math.floor(total / 12),
          months: total % 12,
          _total: total,
        },
      ];
    })
    .sort((a, b) => b._total - a._total)
    .slice(0, 6)
    .map(({ slug, name, avatarColor, years, months }) => ({
      slug,
      name,
      avatarColor,
      years,
      months,
    }));

  // ── Members you may know: stable, viewer-aware suggestions ───────────
  const blocked = viewer ? blockedIdsFor(viewer.id) : new Set<string>();
  const suggestions: SuggestionRow[] = pub
    .filter(
      ({ member }) =>
        (!viewer || member.id !== viewer.id) && !blocked.has(member.id)
    )
    .sort(
      (a, b) =>
        hash(a.member.memberNumber) - hash(b.member.memberNumber)
    )
    .slice(0, 6)
    .map(({ member, details }) => ({
      slug: member.slug,
      name: member.name,
      avatarColor: member.avatarColor,
      tagline: details.tagline || undefined,
      interests: details.interests ?? [],
    }));

  return NextResponse.json({ anniversaries, suggestions });
}
