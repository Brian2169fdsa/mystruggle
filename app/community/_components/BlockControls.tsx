"use client";

// Shared member-safety block/unblock plumbing for the /community surface.
// Talks to the /api/blocks contract (owned by another agent):
//   GET  /api/blocks                                  -> { blocked: string[] }
//   POST /api/blocks { targetId, action:"block"|"unblock" }
//                                                     -> { ok, blocked: string[] }
// Everything here fails OPEN: if the API isn't live yet or the viewer is
// signed out (401), we behave as though nobody is blocked rather than hiding
// the whole feed. Blocking is a quiet, dignified control - never punitive.

import { useEffect, useState } from "react";
import { UserRoundX, UserRoundCheck } from "lucide-react";
import type { SafeUser } from "@/app/lib/types";

/** Broadcast after a block/unblock so any mounted feed re-filters at once. */
export const BLOCKS_CHANGED_EVENT = "ms:blocks-changed";

export type BlockAction = "block" | "unblock";

/** The current member's blocked userIds. Returns [] on 401 / offline / not-live. */
export async function fetchBlockedIds(): Promise<string[]> {
  try {
    const res = await fetch("/api/blocks", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.blocked)
      ? (data.blocked as unknown[]).filter(
          (x): x is string => typeof x === "string"
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Block or unblock a member. Returns the new blocked list, or null when the
 * request couldn't be completed (signed out / offline / API not live).
 * On success it broadcasts BLOCKS_CHANGED_EVENT so open feeds re-filter.
 */
export async function setBlock(
  targetId: string,
  action: BlockAction
): Promise<string[] | null> {
  try {
    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, action }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const blocked = Array.isArray(data?.blocked)
      ? (data.blocked as unknown[]).filter(
          (x): x is string => typeof x === "string"
        )
      : [];
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(BLOCKS_CHANGED_EVENT, { detail: { blocked } })
      );
    }
    return blocked;
  } catch {
    return null;
  }
}

/**
 * Live set of blocked userIds for the current member. Fetches once on mount
 * and stays in sync with BLOCKS_CHANGED_EVENT (so blocking from a post card
 * updates the feed instantly). Fails open to an empty set.
 */
export function useBlockedIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let alive = true;
    fetchBlockedIds().then((list) => {
      if (alive) setIds(new Set(list));
    });

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { blocked?: string[] }
        | undefined;
      if (detail && Array.isArray(detail.blocked)) {
        setIds(new Set(detail.blocked));
      } else {
        fetchBlockedIds().then((list) => alive && setIds(new Set(list)));
      }
    };
    window.addEventListener(BLOCKS_CHANGED_EVENT, onChange);
    return () => {
      alive = false;
      window.removeEventListener(BLOCKS_CHANGED_EVENT, onChange);
    };
  }, []);

  return ids;
}

/**
 * Block / Unblock control for a member profile. Signed-in, non-self only -
 * renders nothing for the viewer's own profile, for signed-out visitors, or
 * until we know who's looking (so it never flickers the wrong state).
 */
export function BlockButton({
  targetId,
  targetName,
}: {
  targetId: string;
  targetName: string;
}) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/auth/me")
        .then((r) => r.json())
        .catch(() => ({ user: null }) as { user: SafeUser | null }),
      fetchBlockedIds(),
    ]).then(([me, list]) => {
      if (!alive) return;
      setViewerId((me as { user: SafeUser | null })?.user?.id ?? null);
      setBlocked(list.includes(targetId));
      setReady(true);
    });

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { blocked?: string[] }
        | undefined;
      if (detail && Array.isArray(detail.blocked)) {
        setBlocked(detail.blocked.includes(targetId));
      }
    };
    window.addEventListener(BLOCKS_CHANGED_EVENT, onChange);
    return () => {
      alive = false;
      window.removeEventListener(BLOCKS_CHANGED_EVENT, onChange);
    };
  }, [targetId]);

  // Nothing to show until we know the viewer, for our own profile, or signed out.
  if (!ready || !viewerId || viewerId === targetId) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const result = await setBlock(targetId, blocked ? "unblock" : "block");
    if (result) setBlocked(result.includes(targetId));
    setBusy(false);
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={blocked}
        className={
          "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border-2 px-6 text-[13px] font-bold transition-colors disabled:cursor-default disabled:opacity-50 " +
          (blocked
            ? "border-blue-primary bg-white text-blue-primary hover:bg-sky-tint"
            : "border-sky-tint-2 bg-white text-ink-600 hover:border-blue-primary hover:text-blue-primary")
        }
      >
        {blocked ? (
          <>
            <UserRoundCheck size={15} />
            {busy ? "One sec…" : `Unblock ${targetName}`}
          </>
        ) : (
          <>
            <UserRoundX size={15} />
            {busy ? "One sec…" : `Block ${targetName}`}
          </>
        )}
      </button>
      <p className="max-w-[320px] text-center text-[12px] font-medium text-ink-600">
        {blocked
          ? `You won't see ${targetName}'s posts. You can undo this anytime.`
          : `Blocking hides their posts from your feed. This is just for you - they aren't told.`}
      </p>
    </div>
  );
}
