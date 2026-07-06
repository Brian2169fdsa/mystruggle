import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getRoleUser } from "@/app/lib/auth";
import type { MentorApplication } from "@/app/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const AVAILABILITIES = ["Weekly", "Every other week", "Flexible"];
const STATUSES: MentorApplication["status"][] = ["contacted", "approved"];

/**
 * Website mentor applications.
 * POST - public (it's the marketing-site form): validate + queue as "new".
 * GET  - staff-only: full queue, newest first.
 * PUT  - staff-only: advance an application's status (new→contacted→approved).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 120) : "";
  const areas = Array.isArray(body.areas)
    ? (body.areas as unknown[])
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .map((a) => a.trim().slice(0, 60))
        .slice(0, 10)
    : [];
  const availability =
    typeof body.availability === "string" ? body.availability.trim() : "";
  const story =
    typeof body.story === "string" ? body.story.trim().slice(0, 2000) : "";

  // Field-level errors so the form can show them inline.
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please tell us your name.";
  if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address.";
  if (phone.replace(/\D/g, "").length < 7)
    errors.phone = "Please enter a phone number we can reach you at.";
  if (areas.length === 0)
    errors.areas = "Please select at least one lived-experience area.";
  if (!AVAILABILITIES.includes(availability))
    errors.availability = "Please choose your availability.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", errors },
      { status: 400 }
    );
  }

  // Gentle anti-spam: one open application per email at a time.
  const existing = db().applications.find(
    (a) => a.email.toLowerCase() === email && a.status === "new"
  );
  if (existing) {
    return NextResponse.json(
      {
        error:
          "You're already on our list - a coordinator will call you.",
      },
      { status: 409 }
    );
  }

  const application: MentorApplication = {
    id: uid(),
    name,
    phone,
    email,
    areas,
    availability,
    ...(story ? { story } : {}),
    status: "new",
    createdAt: Date.now(),
  };
  db().applications.push(application);
  save();

  return NextResponse.json({ ok: true });
}

/** Staff queue - newest first. */
export async function GET() {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }
  const applications = db()
    .applications.slice()
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ applications });
}

/** Staff status advance: {id, status: "contacted" | "approved"}. */
export async function PUT(req: Request) {
  const staff = await getRoleUser();
  if (!staff) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status as MentorApplication["status"];

  if (!STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "status must be contacted or approved." },
      { status: 400 }
    );
  }
  const application = db().applications.find((a) => a.id === id);
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  application.status = status;
  save();
  return NextResponse.json({ ok: true, application });
}
