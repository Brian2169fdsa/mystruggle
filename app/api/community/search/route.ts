import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { detailsFor } from "@/app/api/profile/profile-lib";
import {
  canReadCircle,
  circleDb,
  circleMemberCount,
  type CirclePost,
} from "@/app/api/circles/_lib";
import type { ProfileDetails, User } from "@/app/lib/types";

// GET /api/community/search?q= - one search box across the community.
//
// Case-insensitive substring match, each list capped at 8:
//   posts   - body match; only status "approved" AND !hidden. Circle posts
//             appear only when the session viewer canRead that circle
//             (reuses the circles _lib gate), so alumni-circle posts never
//             leak across centers or to signed-out visitors.
//   members - name / tagline / interests match; SAME consent gate as
//             /api/community/highlights + buildPublicProfile: role "member",
//             consentPublic, slug + memberNumber, existing profile details.
//   circles - name / description match; circles locked for the viewer
//             (alumni circles of another center) are excluded entirely.
//
// Signed-out works: public posts, public members, and open circles only.
// q under 2 chars -> 400 (the UI debounces and never sends those).

const CAP = 8;
const EXCERPT_MAX = 140;

interface PostHit {
  id: string;
  excerpt: string;
  authorName: string;
  createdAt: number;
}

interface MemberHit {
  slug: string;
  name: string;
  avatarColor: string;
  tagline?: string;
}

interface CircleHit {
  id: string;
  name: string;
  description: string;
  members: number;
}

/** <=140-char excerpt of whitespace-collapsed `text`, centered on the first
 *  match so the query stays in context. Head of the text when it fits. */
function excerptAround(text: string, matchIndex: number, qLen: number): string {
  if (text.length <= EXCERPT_MAX) return text;
  const idx = matchIndex >= 0 ? matchIndex : 0;
  const window = EXCERPT_MAX - 2; // room for the ellipses
  let start = Math.max(0, idx - Math.floor((window - qLen) / 2));
  const end = Math.min(text.length, start + window);
  start = Math.max(0, end - window);
  const head = start > 0 ? "…" : "";
  const tail = end < text.length ? "…" : "";
  return head + text.slice(start, end).trim() + tail;
}

type PublicUser = User & { slug: string; memberNumber: string };

/** Same consent gate as /api/community/highlights (buildPublicProfile). */
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "Type at least 2 characters to search." },
      { status: 400 }
    );
  }
  const needle = q.toLowerCase();
  const viewer = await getSessionUser(); // null when signed out - still OK

  const d = circleDb();

  // ── Circles: name/description match, locked ones hidden from this viewer ─
  const readableCircleIds = new Set(
    d.circles.filter((c) => canReadCircle(c, viewer)).map((c) => c.id)
  );
  const circles: CircleHit[] = d.circles
    .filter(
      (c) =>
        readableCircleIds.has(c.id) &&
        (c.name.toLowerCase().includes(needle) ||
          c.description.toLowerCase().includes(needle))
    )
    .slice(0, CAP)
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      members: circleMemberCount(c.id),
    }));

  // ── Posts: approved + not hidden; circle posts only when readable ───────
  const posts: PostHit[] = (d.posts as CirclePost[])
    .filter((p) => {
      if (p.status !== "approved" || p.hidden) return false;
      if (p.circleId && !readableCircleIds.has(p.circleId)) return false;
      return p.body.toLowerCase().includes(needle);
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, CAP)
    .map((p) => {
      const collapsed = p.body.replace(/\s+/g, " ").trim();
      return {
        id: p.id,
        excerpt: excerptAround(
          p.body,
          collapsed.toLowerCase().indexOf(needle),
          needle.length
        ),
        authorName: p.authorName,
        createdAt: p.createdAt,
      };
    });

  // ── People: consent-gated public members only ───────────────────────────
  const members: MemberHit[] = publicMembers()
    .filter(
      ({ member, details }) =>
        member.name.toLowerCase().includes(needle) ||
        (details.tagline ?? "").toLowerCase().includes(needle) ||
        (details.interests ?? []).some((i) => i.toLowerCase().includes(needle))
    )
    .slice(0, CAP)
    .map(({ member, details }) => ({
      slug: member.slug,
      name: member.name,
      avatarColor: member.avatarColor,
      tagline: details.tagline || undefined,
    }));

  return NextResponse.json({ posts, members, circles });
}
