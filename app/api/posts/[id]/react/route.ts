import { NextResponse } from "next/server";
import { db, save } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";

type ReactionKind = "heart" | "proud" | "same";

/** Toggle a reaction — heart (default, byte-compatible with the original
 *  contract), plus the docs/13 Part B shared-experience pair: "proud" and
 *  "same". Body is optional JSON: { kind?: "heart" | "proud" | "same" }. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const kind: ReactionKind =
    body?.kind === "proud" || body?.kind === "same" ? body.kind : "heart";

  const { id } = await params;
  const post = db().posts.find((p) => p.id === id);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  // Runtime-additive arrays — pre-expansion posts gain them on first use.
  post.proud ??= [];
  post.same ??= [];

  const arr =
    kind === "heart" ? post.hearts : kind === "proud" ? post.proud : post.same;
  const i = arr.indexOf(user.id);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(user.id);
  save();

  return NextResponse.json({
    // Original heart contract — unchanged keys for existing clients.
    hearts: post.hearts.length,
    hearted: post.hearts.includes(user.id),
    // Expansion contract — all three counts + the viewer's own toggles.
    counts: {
      hearts: post.hearts.length,
      proud: post.proud.length,
      same: post.same.length,
    },
    mine: {
      heart: post.hearts.includes(user.id),
      proud: post.proud.includes(user.id),
      same: post.same.includes(user.id),
    },
  });
}
