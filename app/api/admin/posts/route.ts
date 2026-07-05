import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";

/** Moderation queue — every post regardless of status, newest first,
 *  capped at 100. Demo-open; lock behind staff auth before production. */
export async function GET() {
  const posts = [...db().posts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 100);
  return NextResponse.json({ posts });
}
