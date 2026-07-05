import { NextResponse } from "next/server";
import { db, save, uid, findUserById } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { isCrisisText } from "@/app/lib/crisis";
import {
  canReadCircle,
  findCircle,
  isCircleMember,
  type CirclePost,
} from "@/app/api/circles/_lib";
import {
  TOPICS,
  type Post,
  type PostKind,
  type PostStatus,
  type Topic,
} from "@/app/lib/types";

/** Attach public-safe request/giving context to a feed post. */
function decorate(post: Post) {
  const d = db();
  const author = findUserById(post.authorId);
  const request = post.requestId
    ? d.requests.find((r) => r.id === post.requestId)
    : undefined;
  return {
    ...post,
    // Give button target — only when the author's page is public.
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

/** Community feed — approved posts, newest first.
 *  Query params: topic (channel filter) · circle=<id> (that circle's posts;
 *  alumni circles are center-private) · author=me (own posts, any status
 *  except removed) · before=<timestamp> cursor · limit (≤50, default 20).
 *  Without ?circle, circle posts are EXCLUDED — they live in their circle. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic");
  const circleId = url.searchParams.get("circle");
  const author = url.searchParams.get("author");
  const before = Number(url.searchParams.get("before") ?? 0);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

  const user = await getSessionUser();

  // Circle read access — anyone may read topic/cohort circles; alumni
  // circles only that center's people or staff (docs/13 Part B).
  if (circleId) {
    const circle = findCircle(circleId);
    if (!circle) {
      return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    }
    if (!canReadCircle(circle, user)) {
      return NextResponse.json(
        { error: "This alumni circle is private to its center's members." },
        { status: 403 }
      );
    }
  }

  let posts: CirclePost[] = [...db().posts];
  if (author === "me") {
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    posts = posts.filter((p) => p.authorId === user.id && p.status !== "removed");
  } else {
    posts = posts.filter((p) => p.status === "approved");
  }
  if (circleId) {
    posts = posts.filter((p) => p.circleId === circleId);
  } else if (author !== "me") {
    // Main feed: circle posts stay inside their circle.
    posts = posts.filter((p) => !p.circleId);
  }
  if (topic && TOPICS.includes(topic as Topic)) {
    posts = posts.filter((p) => (p.topic ?? "general") === topic);
  }
  posts.sort((a, b) => b.createdAt - a.createdAt);
  if (before > 0) posts = posts.filter((p) => p.createdAt < before);

  const page = posts.slice(0, limit);
  return NextResponse.json({
    posts: page.map(decorate),
    viewerId: user?.id ?? null,
    nextBefore: posts.length > limit ? page[page.length - 1]?.createdAt ?? null : null,
  });
}

/** Create a post — members and mentors both. Optional topic + requestId
 *  (support-request posts link to the author's own active goal) + circleId
 *  (posts into a circle the author has joined — 403 otherwise). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  const kind: PostKind = ["milestone", "win"].includes(body?.kind)
    ? body.kind
    : "regular";
  const topic: Topic = TOPICS.includes(body?.topic) ? body.topic : "general";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Write something first (max 2,000 chars)." }, { status: 400 });
  }

  let requestId: string | undefined;
  if (body?.requestId) {
    const r = db().requests.find(
      (r) => r.id === String(body.requestId) && r.memberId === user.id
    );
    if (!r) {
      return NextResponse.json(
        { error: "That support request isn't yours or doesn't exist." },
        { status: 400 }
      );
    }
    requestId = r.id;
  }

  // Circle posts require membership — reading is open(er), posting is not.
  let circleId: string | undefined;
  if (body?.circleId) {
    const circle = findCircle(String(body.circleId));
    if (!circle) {
      return NextResponse.json({ error: "Circle not found." }, { status: 404 });
    }
    if (!isCircleMember(circle.id, user.id)) {
      return NextResponse.json(
        { error: "Join this circle before posting in it." },
        { status: 403 }
      );
    }
    circleId = circle.id;
  }

  // SAFETY: crisis language is HELD from the feed (docs/05 §Moderation step 4).
  // Held posts get the existing "flagged" status — GET only serves "approved",
  // so they never reach the public feed. A human must follow up; the poster is
  // shown supportive resources instead of a published post.
  const crisis = isCrisisText(text);

  const post: CirclePost = {
    id: uid(),
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    avatarColor: user.avatarColor,
    body: text,
    kind,
    topic,
    requestId,
    circleId,
    status: (crisis ? "flagged" : "approved") as PostStatus,
    hearts: [],
    comments: [],
    createdAt: Date.now(),
  };
  db().posts.unshift(post);
  save();

  if (crisis) {
    return NextResponse.json({
      post,
      held: true,
      resources: {
        line: "988 Suicide & Crisis Lifeline — call or text 988",
        note: "A member of the care team will reach out today.",
      },
    });
  }
  return NextResponse.json({ post: decorate(post) });
}
