import { NextResponse } from "next/server";
import { db, save, uid, findUserById } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { MemberBlock } from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
type EngagementStore = { memberBlocks?: MemberBlock[] };

function blockStore() {
  const d = db() as ReturnType<typeof db> & EngagementStore;
  d.memberBlocks ??= [];
  return d as ReturnType<typeof db> & Required<EngagementStore>;
}

function blockedFor(blockerId: string): string[] {
  return blockStore()
    .memberBlocks.filter((b) => b.blockerId === blockerId)
    .map((b) => b.blockedId);
}

/** GET - the ids the signed-in user has blocked. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  return NextResponse.json({ blocked: blockedFor(user.id) });
}

/** POST - { targetId, action: "block" | "unblock" }. You cannot block
 *  yourself; blocking is idempotent (one row per blocker→blocked pair). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const targetId = String(body?.targetId ?? "");
  const action = String(body?.action ?? "");
  if (!targetId || (action !== "block" && action !== "unblock")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (targetId === user.id) {
    return NextResponse.json(
      { error: "You cannot block yourself." },
      { status: 400 }
    );
  }
  const d = blockStore();

  if (action === "block") {
    if (!findUserById(targetId)) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const exists = d.memberBlocks.some(
      (b) => b.blockerId === user.id && b.blockedId === targetId
    );
    if (!exists) {
      d.memberBlocks.push({
        id: uid(),
        blockerId: user.id,
        blockedId: targetId,
        createdAt: Date.now(),
      });
      save();
    }
  } else {
    const before = d.memberBlocks.length;
    d.memberBlocks = d.memberBlocks.filter(
      (b) => !(b.blockerId === user.id && b.blockedId === targetId)
    );
    if (d.memberBlocks.length !== before) save();
  }

  return NextResponse.json({ ok: true, blocked: blockedFor(user.id) });
}
