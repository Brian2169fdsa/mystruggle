import { NextResponse } from "next/server";
import { findUserByEmail, hashPassword } from "@/app/lib/store";
import { setSessionCookie } from "@/app/lib/auth";
import { toSafeUser } from "@/app/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");

  const user = findUserByEmail(email);
  if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 }
    );
  }
  await setSessionCookie(user.id);
  return NextResponse.json({ user: toSafeUser(user) });
}
