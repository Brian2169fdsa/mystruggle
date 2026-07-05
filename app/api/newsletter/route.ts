import { NextResponse } from "next/server";

/**
 * Newsletter signups. Deliberately self-contained: a module-level array (no
 * store.ts) — resets per server restart, which is fine for a monthly-letter
 * waitlist demo. Swap for the real store/ESP when the data layer lands.
 */
const subscribers: { email: string; createdAt: string }[] = [];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email =
    typeof (body as { email?: unknown })?.email === "string"
      ? (body as { email: string }).email.trim().toLowerCase()
      : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (subscribers.some((s) => s.email === email)) {
    return NextResponse.json(
      { error: "This email is already subscribed." },
      { status: 409 },
    );
  }

  subscribers.push({ email, createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ count: subscribers.length });
}
