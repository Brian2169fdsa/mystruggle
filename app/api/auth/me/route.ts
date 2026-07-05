import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { db } from "@/app/lib/store";
import { toSafeUser } from "@/app/lib/types";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  const requests = db().requests.filter((r) => r.memberId === user.id);
  return NextResponse.json({ user: toSafeUser(user), requests });
}
