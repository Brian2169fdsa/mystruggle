// Shared platform types — the contract between the API and every surface.

export type Role = "member" | "mentor";

export interface User {
  id: string;
  role: Role;
  name: string; // first name only is ever shown publicly
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  avatarColor: string; // hex used for initial-avatar tiles
  // member fields
  slug?: string; // public giving page /p/[slug]
  memberNumber?: string; // e.g. 039521464
  story?: string; // approved public story
  consentPublic?: boolean; // public giving page on/off
  balances?: { cash: number; credits: number; savings: number };
  streak?: number;
  points?: number;
  level?: string;
  mentorId?: string;
  centerId?: string; // outreach center this person belongs to
}

/** An outreach center (e.g. Laveen Center). */
export interface Center {
  id: string;
  name: string;
  city: string;
}

export type SessionMode = "in-person" | "phone" | "video";

/** A logged mentor session with a mentee. */
export interface Session {
  id: string;
  mentorId: string;
  memberId: string;
  mode: SessionMode;
  minutes: number;
  note?: string;
  createdAt: number;
}

/** Public-safe projection of a member (what a donor may see). */
export interface PublicMember {
  slug: string;
  name: string;
  memberNumber: string;
  story: string;
  consentPublic: boolean;
  requests: SupportRequest[];
  savings: number;
}

export interface SupportRequest {
  id: string;
  memberId: string;
  label: string; // e.g. "Hallway house"
  weeklyTarget: number; // e.g. 175
  raised: number; // raised this week
  status: "active" | "funded";
  createdAt: number;
}

export interface Donation {
  id: string;
  memberId: string;
  requestId?: string;
  amount: number;
  weekly: boolean;
  createdAt: number;
}

export type PostKind = "regular" | "milestone" | "win";
export type PostStatus = "approved" | "pending" | "flagged" | "removed";

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  avatarColor: string;
  body: string;
  kind: PostKind;
  status: PostStatus;
  hearts: string[]; // user ids who reacted
  comments: Comment[];
  createdAt: number;
}

export type MessageKind = "text" | "mood" | "cheer";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  kind: MessageKind;
  body: string;
  mood?: number; // 1–5 when kind === "mood"
  createdAt: number;
}

export interface Thread {
  id: string;
  participantIds: string[]; // [memberId, mentorId]
  messages: Message[];
  createdAt: number;
}

/** What /api/auth/me returns — never includes credentials. */
export type SafeUser = Omit<User, "passwordHash" | "salt">;

export function toSafeUser(u: User): SafeUser {
  const { passwordHash: _p, salt: _s, ...safe } = u;
  return safe;
}
