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
import { toSafeUser, type EmployerProfile, type User } from "@/app/lib/types";

const AVATAR_COLORS = ["#2E7CD6", "#4E5B9B", "#0B2545", "#12B76A", "#4E7BC4"];

/**
 * POST - create a recovery-friendly employer account and sign in.
 * Body: { company, name (contact), email, password } plus optional vetting
 * fields { pledge, ein, website, industry, about }. Reuses the same HMAC
 * session cookie as every other role; the account is a User with role
 * "employer" and their business on `company`.
 *
 * EXPANSION (docs/17 §Vetting): signup now also opens an EmployerProfile in
 * verificationStatus "pending" - the ms_admin review queue. When the body
 * carries `pledge: true` the Fair-Chance Pledge acceptance is recorded
 * (pledgeSignedAt now, pledgeSignedBy the new account). The response shape is
 * unchanged, so every existing caller keeps working.
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

  // Vetting profile (docs/17): pending until ms_admin verifies - nothing the
  // employer posts is publicly visible before that. Pledge acceptance is
  // recorded exactly once, at signup, when the applicant checked it.
  const pledged = body?.pledge === true;
  const strOrUndef = (v: unknown): string | undefined => {
    const s = String(v ?? "").trim();
    return s ? s : undefined;
  };
  const profile: EmployerProfile = {
    id: uid(),
    employerId: employer.id,
    ein: strOrUndef(body?.ein),
    website: strOrUndef(body?.website),
    industry: strOrUndef(body?.industry),
    about: strOrUndef(body?.about),
    pledgeSignedAt: pledged ? Date.now() : undefined,
    pledgeSignedBy: pledged ? employer.id : undefined,
    verificationStatus: "pending",
    createdAt: Date.now(),
  };
  db().employerProfiles.push(profile);
  save();

  await setSessionCookie(employer.id);
  return NextResponse.json({ user: toSafeUser(employer) });
}
