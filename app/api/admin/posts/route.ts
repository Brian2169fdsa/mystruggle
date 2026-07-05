import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";

/** Moderation queue — every post regardless of status, newest first,
 *  capped at 100. Staff-only (was demo-open; P0 gap closed). */
export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  const posts = [...db().posts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 100);
  return NextResponse.json({ posts });
}
