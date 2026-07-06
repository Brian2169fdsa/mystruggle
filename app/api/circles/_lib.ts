// Circle helpers shared by /api/circles and /api/posts (docs/13 Part B).
//
// The circles/memberships collections are seeded separately; an older
// .data/db.json snapshot may not carry them yet, so every access goes
// through the defensive cast below and self-heals with empty arrays.

import { db } from "@/app/lib/store";
import type { Circle, CircleMembership, Post, User } from "@/app/lib/types";

type CircleDB = ReturnType<typeof db> & {
  circles?: Circle[];
  circleMemberships?: CircleMembership[];
};

/** The store with circle collections guaranteed present (possibly empty). */
export function circleDb(): ReturnType<typeof db> & {
  circles: Circle[];
  circleMemberships: CircleMembership[];
} {
  const d = db() as CircleDB;
  d.circles ??= [];
  d.circleMemberships ??= [];
  return d as ReturnType<typeof db> & {
    circles: Circle[];
    circleMemberships: CircleMembership[];
  };
}

/** A post that may live inside a circle - circleId is runtime-additive. */
export type CirclePost = Post & { circleId?: string };

export function findCircle(id: string): Circle | undefined {
  return circleDb().circles.find((c) => c.id === id);
}

export function isCircleMember(circleId: string, userId: string): boolean {
  return circleDb().circleMemberships.some(
    (m) => m.circleId === circleId && m.memberId === userId
  );
}

export function circleMemberCount(circleId: string): number {
  return circleDb().circleMemberships.filter((m) => m.circleId === circleId)
    .length;
}

/** Read access - topic/cohort circles are open reads for everyone; alumni
 *  circles are center-private: that center's people (any role) or staff. */
export function canReadCircle(circle: Circle, user: User | null): boolean {
  if (circle.kind !== "alumni") return true;
  if (!user) return false;
  if (user.role === "staff") return true;
  return !!circle.centerId && user.centerId === circle.centerId;
}
