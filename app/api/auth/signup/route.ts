import { NextResponse } from "next/server";
import {
  db,
  save,
  uid,
  newSalt,
  hashPassword,
  findUserByEmail,
  slugify,
  newMemberNumber,
} from "@/app/lib/store";
import { setSessionCookie } from "@/app/lib/auth";
import { toSafeUser, type Role, type User } from "@/app/lib/types";

const AVATAR_COLORS = ["#2E7CD6", "#4E5B9B", "#0B2545", "#12B76A", "#4E7BC4"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");
  const role: Role = body?.role === "mentor" ? "mentor" : "member";
  const story = String(body?.story ?? "").trim();
  // Consent is opt-in: only an explicit true turns the public page on.
  const consentPublic = body?.consentPublic === true;
  const goalLabel = String(body?.goalLabel ?? "").trim();
  const goalAmount = Number(body?.goalAmount ?? 0);

  if (!name || !email.includes("@") || password.length < 6) {
    return NextResponse.json(
      { error: "Name, valid email, and a password of 6+ characters required." },
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
  const user: User = {
    id: uid(),
    role,
    name: name.split(/\s+/)[0], // first name only, per privacy rules
    email,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: Date.now(),
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  };

  if (role === "member") {
    user.slug = slugify(user.name);
    user.memberNumber = newMemberNumber();
    user.story = story;
    // Slug + member number exist either way; the public page (and /api/members
    // gate) stays hidden until the member opts in.
    user.consentPublic = consentPublic;
    user.balances = { cash: 0, credits: 0, savings: 0 };
    user.streak = 0;
    user.points = 0;
    user.level = "Bronze";
    // assign the seeded mentor so chat works out of the box
    const mentor = db().users.find((u) => u.role === "mentor");
    if (mentor) user.mentorId = mentor.id;
  }

  db().users.push(user);

  if (role === "member" && goalLabel && goalAmount > 0) {
    db().requests.push({
      id: uid(),
      memberId: user.id,
      label: goalLabel,
      weeklyTarget: goalAmount,
      raised: 0,
      status: "active",
      createdAt: Date.now(),
    });
  }
  save();

  await setSessionCookie(user.id);
  return NextResponse.json({ user: toSafeUser(user) });
}
