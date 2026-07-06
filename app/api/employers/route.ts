import { NextResponse } from "next/server";
import {
  db,
  save,
  uid,
  newSalt,
  hashPassword,
  findUserByEmail,
} from "@/app/lib/store";
import { setSessionCookie } from "@/app/lib/auth";
import { toSafeUser, type User } from "@/app/lib/types";

const AVATAR_COLORS = ["#2E7CD6", "#4E5B9B", "#0B2545", "#12B76A", "#4E7BC4"];

/**
 * POST - create a recovery-friendly employer account and sign in.
 * Body: { company, name (contact), email, password }. Reuses the same HMAC
 * session cookie as every other role; the account is a User with role
 * "employer" and their business on `company`.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const company = String(body?.company ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");

  if (!company || !name || !email.includes("@") || password.length < 6) {
    return NextResponse.json(
      {
        error:
          "Company, contact name, valid email, and a 6+ character password are required.",
      },
      { status: 400 }
    );
  }
  if (findUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const salt = newSalt();
  const employer: User = {
    id: uid(),
    role: "employer",
    name: name.split(/\s+/)[0], // first name only, per privacy rules
    email,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: Date.now(),
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    company,
  };

  db().users.push(employer);
  save();

  await setSessionCookie(employer.id);
  return NextResponse.json({ user: toSafeUser(employer) });
}
