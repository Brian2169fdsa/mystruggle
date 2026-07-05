import { NextResponse } from "next/server";
import { db, save } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";

/** Toggle a heart reaction. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const post = db().posts.find((p) => p.id === id);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const i = post.hearts.indexOf(user.id);
  if (i >= 0) post.hearts.splice(i, 1);
  else post.hearts.push(user.id);
  save();
  return NextResponse.json({ hearts: post.hearts.length, hearted: i < 0 });
}
