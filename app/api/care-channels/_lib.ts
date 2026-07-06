// Continuum of Care - CENTER↔CLIENT communication layer (docs/14 §D IN-PROGRAM,
// requirements/11 §D). EXPANSION, additive. These are ENGAGEMENT comms, NOT
// clinical notes / therapy delivery - no PHI ever lives here (docs/10 hard line).
//
// The shared types (CareChannel / CareMessage) live in app/lib/types and are
// seeded by the store. We import them here and still access the store
// DEFENSIVELY via the cast pattern, so this module is resilient to a store
// that predates the seed (fresh boot / hot-reload).

import type { User, CareChannel, CareMessage } from "@/app/lib/types";
import { db as rawDb } from "@/app/lib/store";

export type { CareChannel, CareMessage };

type CareDB = ReturnType<typeof rawDb> & {
  careChannels?: CareChannel[];
  careMessages?: CareMessage[];
};

/** Defensive store accessor - guarantees the two collections exist even if the
 *  seed hasn't populated them yet. */
export function careDb(): CareDB & {
  careChannels: CareChannel[];
  careMessages: CareMessage[];
} {
  const d = rawDb() as CareDB;
  d.careChannels ??= [];
  d.careMessages ??= [];
  return d as CareDB & {
    careChannels: CareChannel[];
    careMessages: CareMessage[];
  };
}

/** Crisis-held messages are never broadcast - only "ok" messages are shown. */
export function visibleMessages(channelId: string): CareMessage[] {
  return careDb()
    .careMessages.filter(
      (m) => m.channelId === channelId && m.moderationStatus !== "flagged"
    )
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Can this user READ the channel?
 * - staff: any channel (they supervise the surface)
 * - one_to_one: only the member on the channel
 * - program_group / announcement: any member/mentor of that center
 */
export function canRead(c: CareChannel, user: User, isStaff: boolean): boolean {
  if (isStaff) return true;
  if (c.kind === "one_to_one") return c.memberId === user.id;
  // program_group + announcement are readable by the center's people. Without a
  // separate membership table (not in the contract), center affiliation is the
  // grant - the demo center has exactly one cohort group + one announcement.
  return !!user.centerId && c.centerId === user.centerId;
}

/**
 * Can this user POST to the channel?
 * - staff: anywhere
 * - announcement: staff-only (members read, never post)
 * - one_to_one: only the member on the channel
 * - program_group: the center's members/mentors
 */
export function canPost(c: CareChannel, user: User, isStaff: boolean): boolean {
  if (isStaff) return true;
  if (c.kind === "announcement") return false;
  if (c.kind === "one_to_one") return c.memberId === user.id;
  return !!user.centerId && c.centerId === user.centerId; // program_group
}

/** The channels a member/mentor belongs to: their center announcement, their
 *  center's program group(s), and their own 1:1. */
export function channelsForMember(user: User): CareChannel[] {
  return careDb().careChannels.filter((c) => canRead(c, user, false));
}

/** "Unread-ish" - messages from someone else that arrived after the viewer last
 *  spoke here. No read-receipts in the store, so this is a warm approximation. */
export function unreadish(channelId: string, viewerId: string): number {
  const msgs = visibleMessages(channelId);
  let lastMine = 0;
  for (const m of msgs) if (m.senderId === viewerId && m.createdAt > lastMine) lastMine = m.createdAt;
  return msgs.filter((m) => m.senderId !== viewerId && m.createdAt > lastMine).length;
}

/** Client-facing message shape - enough for a ChatThread-style renderer. */
export function toClientMessage(m: CareMessage) {
  return {
    id: m.id,
    senderId: m.senderId,
    senderName: m.senderName,
    senderRole: m.senderRole,
    body: m.body,
    createdAt: m.createdAt,
    kind: "text" as const,
  };
}

export type ClientCareMessage = ReturnType<typeof toClientMessage>;

/** The banner + care-record disclaimer that rides on every care channel. */
export const CARE_NOTICE =
  "Messages here are for support & scheduling - never clinical records.";

/** Crisis resources returned when a message is held. Never dismissive. */
export const CRISIS_RESOURCES = {
  line: "988 Suicide & Crisis Lifeline - call or text 988",
  note: "You matter, and you're not alone. A member of your care team will reach out today.",
};
