import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { DemoLead } from "@/app/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Demo / contact-sales requests from the "For Recovery Centers" marketing page.
 * POST - PUBLIC (it's the marketing-site form): validate + queue as "new".
 * GET  - staff-only: the lead queue, newest first.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orgName =
    typeof body.orgName === "string" ? body.orgName.trim().slice(0, 120) : "";
  const contactName =
    typeof body.contactName === "string" ? body.contactName.trim().slice(0, 80) : "";
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase().slice(0, 120)
      : "";
  const phone =
    typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "";
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const source =
    typeof body.source === "string" ? body.source.trim().slice(0, 60) : "centers-page";

  const errors: Record<string, string> = {};
  if (!orgName) errors.orgName = "Tell us your center's name.";
  if (!contactName) errors.contactName = "Who should we reach out to?";
  if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address.";
  if (Object.keys(errors).length) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", errors },
      { status: 400 }
    );
  }

  const lead: DemoLead = {
    id: uid(),
    orgName,
    contactName,
    email,
    ...(phone ? { phone } : {}),
    ...(message ? { message } : {}),
    source,
    status: "new",
    createdAt: Date.now(),
  };
  db().demoLeads.push(lead);
  save();
  return NextResponse.json({ ok: true });
}

/** Staff lead queue - newest first. */
export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  const leads = db()
    .demoLeads.slice()
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ leads });
}
