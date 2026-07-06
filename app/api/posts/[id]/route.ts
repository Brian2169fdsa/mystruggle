import { NextResponse } from "next/server";
import { db, findUserById } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import {
  canReadCircle,
  findCircle,
  type CirclePost,
} from "@/app/api/circles/_lib";
import type { Post } from "@/app/lib/types";

/** Attach public-safe request/giving context - mirrors GET /api/posts
 *  decorate() exactly so the permalink payload is FeedPost-compatible. */
function decorate(post: Post) {
  const d = db();
  const author = findUserById(post.authorId);
  const request = post.requestId
    ? d.requests.find((r) => r.id === post.requestId)
    : undefined;
  return {
    ...post,
    // Give button target - only when the author's page is public.
    authorSlug: author?.consentPublic ? author.slug ?? null : null,
    request: request
      ? {
          id: request.id,
          label: request.label,
          weeklyTarget: request.weeklyTarget,
          raised: request.raised,
          status: request.status,
        }
      : null,
  };
}

/** GET /api/posts/[id] - single-post permalink payload.
 *  Same visibility gates as the community feed: only approved AND not-hidden
 *  posts are public. The AUTHOR may fetch their own post in any status (so
 *  a pending/held post's permalink still works for them); everyone else gets
 *  a plain 404 - never a hint that a hidden/held post exists. Posts that
 *  live inside a circle keep the feed's circle read gate (alumni circles
 *  are private to their center's people and staff). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  const post = (db().posts as CirclePost[]).find((p) => p.id === id);
  const notFound = NextResponse.json({ error: "Post not found." }, { status: 404 });

  if (!post) return notFound;

  const isAuthor = !!user && user.id === post.authorId;
  if (!isAuthor) {
    // Community visibility gate - identical to the feed's filter.
    if (post.status !== "approved" || post.hidden) return notFound;
    // Circle posts keep their circle's read access (alumni = center-private).
    if (post.circleId) {
      const circle = findCircle(post.circleId);
      if (!circle || !canReadCircle(circle, user)) return notFound;
    }
  }

  return NextResponse.json({
    post: decorate(post),
    viewerId: user?.id ?? null,
  });
}
