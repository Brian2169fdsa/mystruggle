import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { isCrisisText } from "@/app/lib/crisis";
import type { PostKind, PostStatus } from "@/app/lib/types";

/** Community feed — approved posts, newest first, capped at 50. */
export async function GET() {
  const posts = db()
    .posts.filter((p) => p.status === "approved")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
  const user = await getSessionUser();
  return NextResponse.json({ posts, viewerId: user?.id ?? null });
}

/** Create a post — members and mentors both. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  const kind: PostKind = ["milestone", "win"].includes(body?.kind)
    ? body.kind
    : "regular";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Write something first (max 2,000 chars)." }, { status: 400 });
  }

  // SAFETY: crisis language is HELD from the feed (docs/05 §Moderation step 4).
  // Held posts get the existing "flagged" status — GET only serves "approved",
  // so they never reach the public feed. A human must follow up; the poster is
  // shown supportive resources instead of a published post.
  const crisis = isCrisisText(text);

  const post = {
    id: uid(),
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    avatarColor: user.avatarColor,
    body: text,
    kind,
    status: (crisis ? "flagged" : "approved") as PostStatus, // dashboard moderation can flag/remove after
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
  return NextResponse.json({ post });
}
