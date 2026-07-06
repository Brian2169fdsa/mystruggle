import { NextResponse } from "next/server";
import { db, addComment, emitNotification } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";

/** Add a comment to a post. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const post = db().posts.find((p) => p.id === id);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text || text.length > 1000) {
    return NextResponse.json({ error: "Write something first (max 1,000 chars)." }, { status: 400 });
  }
  const comment = addComment(post, user, text);

  // Notify the post author (never on your own post).
  if (post.authorId !== user.id) {
    emitNotification(
      post.authorId,
      "comment",
      "New comment",
      `${user.name} commented on your post.`,
      "post",
      post.id
    );
  }

  return NextResponse.json({ comment });
}
