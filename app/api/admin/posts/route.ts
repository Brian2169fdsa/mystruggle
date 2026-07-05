import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";

/** Moderation queue — every post regardless of status, newest first.
 *  Demo-open; lock behind staff auth before production. */
export async function GET() {
  const posts = [...db().posts].sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ posts });
}
