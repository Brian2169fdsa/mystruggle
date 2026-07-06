import { NextResponse } from "next/server";
import { db, addComment, emitNotification } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { isCrisisText } from "@/app/lib/crisis";

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

  // @mention notifications - non-fatal, must never block the comment response.
  // SAFETY: comments carrying crisis language are skipped entirely (mirrors the
  // feed's crisis hold in /api/posts) - no @mention pings out of a crisis post.
  try {
    if (!isCrisisText(text)) {
      const authorFirst = user.name.split(/\s+/)[0];
      // Collect the distinct first-name tokens referenced as @FirstName.
      const mentioned = new Set(
        Array.from(text.matchAll(/@([A-Za-z][A-Za-z'-]*)/g)).map((m) =>
          m[1].toLowerCase()
        )
      );
      const notified = new Set<string>([user.id]); // never notify the author
      for (const first of mentioned) {
        // Match against the FIRST token of a member/mentor's name. If several
        // people share a first name we notify at most the first match, to keep
        // it simple and avoid spamming everyone who happens to share a name.
        const match = db().users.find(
          (u) =>
            (u.role === "member" || u.role === "mentor") &&
            u.name.split(/\s+/)[0].toLowerCase() === first &&
            !notified.has(u.id)
        );
        if (!match) continue;
        notified.add(match.id);
        emitNotification(
          match.id,
          "mention",
          "You were mentioned",
          `${authorFirst} mentioned you in a comment.`,
          "post",
          post.id
        );
      }
    }
  } catch {
    // Notifications are best-effort; the comment is already saved.
  }

  return NextResponse.json({ comment });
}
