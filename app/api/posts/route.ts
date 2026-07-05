import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { PostKind } from "@/app/lib/types";

/** Community feed — approved posts, newest first. */
export async function GET() {
  const posts = db()
    .posts.filter((p) => p.status === "approved")
    .sort((a, b) => b.createdAt - a.createdAt);
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

  const post = {
    id: uid(),
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    avatarColor: user.avatarColor,
    body: text,
    kind,
    status: "approved" as const, // dashboard moderation can flag/remove after
    hearts: [],
    comments: [],
    createdAt: Date.now(),
  };
  db().posts.unshift(post);
  save();
  return NextResponse.json({ post });
}
