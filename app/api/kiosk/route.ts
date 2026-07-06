// Kiosk quick sign-in (docs/16 Part D) - shared facility devices.
// Member number + first name -> a SHORT-LIVED session (2 hours instead of the
// 30-day login session). Reuses the exact HMAC token from app/lib/auth.ts
// (sessionToken + SESSION_COOKIE) but sets the cookie locally because
// setSessionCookie hard-codes a 30-day maxAge and auth.ts is not ours to edit.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionToken } from "@/app/lib/auth";
import { db } from "@/app/lib/store";
import { toSafeUser } from "@/app/lib/types";

const KIOSK_MAX_AGE = 60 * 60 * 2; // 2 hours, session-scoped by design

// Light in-memory rate limit: 5 failed attempts per 10 minutes per client.
// Resets on cold start - fine for a front-desk kiosk speed bump.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;
const fails = new Map<string, number[]>();

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

function recentFails(key: string): number[] {
  const now = Date.now();
  const kept = (fails.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  fails.set(key, kept);
  return kept;
}

export async function POST(req: Request) {
  const key = clientKey(req);
  if (recentFails(key).length >= MAX_FAILS) {
    return NextResponse.json(
      {
        error:
          "Too many tries on this device. Please wait a few minutes or ask a staff member for help.",
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const memberNumber = String(body?.memberNumber ?? "").trim();
  const firstName = String(body?.firstName ?? "").trim();

  // Exact member number + case-insensitive first token of the stored name.
  const user =
    memberNumber && firstName
      ? db().users.find(
          (u) =>
            u.memberNumber === memberNumber &&
            (u.name.trim().split(/\s+/)[0] ?? "").toLowerCase() ===
              firstName.toLowerCase()
        )
      : undefined;

  if (!user) {
    recentFails(key).push(Date.now());
    return NextResponse.json(
      { error: "Check your member number and first name with a staff member." },
      { status: 404 }
    );
  }

  fails.delete(key); // success clears the counter

  const jar = await cookies();
  // Same HMAC session token as /api/auth/login, shorter life.
  jar.set(SESSION_COOKIE, sessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: KIOSK_MAX_AGE,
  });
  // Server-truth kiosk marker (httpOnly) + client-readable mirror for the
  // idle-logout timer on the kiosk page.
  jar.set("ms_kiosk", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: KIOSK_MAX_AGE,
  });
  jar.set("ms_kiosk_ui", "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: KIOSK_MAX_AGE,
  });

  return NextResponse.json({ user: toSafeUser(user) });
}
