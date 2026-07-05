import { NextResponse } from "next/server";
import { db, save } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";

/** Cash redemption desk — staff records a card-present cash payout.
 *  Dual record per docs/04: member card scan (the desk looked the member up
 *  by card #) + staff PIN entered here. Staff-only (was demo-open; P0 gap
 *  closed — a staff session is now required on top of the desk PIN). */

// Demo constant — real staff PINs live in the auth system (P0 gap, tracked).
const STAFF_PIN = "1234";

/** Org-configurable daily cash cap (docs/04 guardrails — default $100/day). */
const DAILY_CAP = 100;

/** Per-member running total for the current day. Module-scope and
 *  NON-PERSISTENT — resets on server restart/redeploy. Acceptable for the
 *  demo; the real ledger (append-only ledger_entries) replaces this. */
const redeemedByDay = new Map<string, { day: string; total: number }>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // UTC day — fine for demo
}

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401 }
    );
  }
  let body: { memberId?: unknown; amount?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON body.");
  }

  const { memberId, amount, pin } = body;
  if (typeof memberId !== "string" || !memberId) {
    return bad(400, "memberId is required.");
  }
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > DAILY_CAP
  ) {
    return bad(400, `Amount must be a whole dollar amount from $1 to $${DAILY_CAP}.`);
  }
  if (typeof pin !== "string" || pin !== STAFF_PIN) {
    return bad(400, "That staff PIN didn't match. Please try again.");
  }

  const member = db().users.find(
    (u) => u.id === memberId && u.role === "member"
  );
  if (!member) return bad(404, "Member not found — rescan the ID card.");

  const day = todayKey();
  const entry = redeemedByDay.get(member.id);
  const already = entry && entry.day === day ? entry.total : 0;
  const capRemaining = DAILY_CAP - already;
  if (amount > capRemaining) {
    return bad(
      422,
      `Daily cash cap is $${DAILY_CAP} — $${already} already redeemed today, $${capRemaining} remaining.`
    );
  }

  const cash = member.balances?.cash ?? 0;
  if (amount > cash) {
    return bad(422, `Insufficient cash balance — $${cash} available.`);
  }

  member.balances = {
    cash: cash - amount,
    credits: member.balances?.credits ?? 0,
    savings: member.balances?.savings ?? 0,
  };
  save();
  redeemedByDay.set(member.id, { day, total: already + amount });

  return NextResponse.json({
    ok: true,
    newCash: member.balances.cash,
    redeemedToday: already + amount,
    capRemaining: DAILY_CAP - (already + amount),
  });
}
