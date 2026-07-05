// Session auth — HMAC-signed cookie, no external deps. Demo-grade secret
// fallback; set SESSION_SECRET in production.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { findUserById } from "./store";
import type { User } from "./types";

const SECRET = process.env.SESSION_SECRET || "my-struggle-demo-secret";
export const SESSION_COOKIE = "ms_session";

function sign(userId: string): string {
  return createHmac("sha256", SECRET).update(userId).digest("hex");
}

export function sessionToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const userId = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = sign(userId);
  try {
    if (
      sig.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return userId;
    }
  } catch {
    // fall through
  }
  return null;
}

/** Signed-in user if they hold one of the given roles, else null.
 *  Staff passes every check (staff supervise all surfaces). */
export async function getRoleUser(
  ...roles: Array<User["role"]>
): Promise<User | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role === "staff" || roles.includes(user.role)) return user;
  return null;
}

/** Current signed-in user from the request cookie, or null. */
export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = verifyToken(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return findUserById(userId) ?? null;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
