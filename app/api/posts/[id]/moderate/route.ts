import { NextResponse } from "next/server";
import { db, save } from "@/app/lib/store";
import type { PostStatus } from "@/app/lib/types";

const ACTIONS: Record<string, PostStatus> = {
  approve: "approved",
  flag: "flagged",
  remove: "removed",
};

/** Resolve a moderation item: approve / flag (request edit) / remove.
 *  Demo-open; lock behind staff auth before production. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = db().posts.find((p) => p.id === id);
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const status = ACTIONS[String(body?.action ?? "")];
  if (!status) {
    return NextResponse.json(
      { error: "Action must be approve, flag, or remove." },
      { status: 400 }
    );
  }
  post.status = status;
  save();
  return NextResponse.json({ post });
}
