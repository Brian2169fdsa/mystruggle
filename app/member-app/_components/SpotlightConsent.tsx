"use client";

// Spotlight consent card (docs/16 deferred set). Staff draft a celebration;
// it reaches the community feed ONLY if the member says yes here. Renders
// null when signed out or when nothing is waiting - zero footprint.

import { useEffect, useState } from "react";
import { PartyPopper, Heart } from "lucide-react";

type PendingSpotlight = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: number;
  staffName?: string | null;
};

export default function SpotlightConsent() {
  const [items, setItems] = useState<PendingSpotlight[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/spotlights");
        if (!res.ok) return; // 401 signed out / anything else → render null
        const data = (await res.json().catch(() => null)) as {
          spotlights?: PendingSpotlight[];
        } | null;
        if (!alive) return;
        setItems(
          (data?.spotlights ?? []).filter(
            (s) => s.status === "pending_consent"
          )
        );
      } catch {
        // offline - stay hidden
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const decide = (item: PendingSpotlight, decision: "approve" | "decline") => {
    // Optimistic: the card leaves immediately, a warm flash takes its place.
    setItems((cur) => cur.filter((i) => i.id !== item.id));
    setFlash(
      decision === "approve"
        ? "It's live! Thank you for letting your community celebrate with you 💙"
        : "No problem - your story stays yours. We'll keep cheering privately 💙"
    );
    setTimeout(() => setFlash(null), 5000);
    fetch("/api/spotlights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, decision }),
    }).catch(() => {});
  };

  if (items.length === 0 && !flash) return null;

  return (
    <div className="flex flex-col gap-3">
      {flash && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#E8F8F0] px-5 py-3.5 text-[13.5px] font-bold text-success">
          <Heart size={16} strokeWidth={2.4} className="flex-none" />
          {flash}
        </div>
      )}

      {items.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl border-[1.5px] border-sky-tint-2 bg-gradient-to-br from-sky-tint to-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-blue-primary shadow-[0_1px_3px_rgba(11,37,69,.08)]">
              <PartyPopper size={17} strokeWidth={2.2} />
            </span>
            <div className="text-[14.5px] font-extrabold text-ink-900">
              🎉 {s.staffName || "Your care team"} wants to celebrate you
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white/80 px-4 py-3">
            <div className="text-[14px] font-extrabold text-ink-900">
              {s.title}
            </div>
            <div className="mt-1 text-[13px]/[1.55] font-medium text-ink-600">
              {s.body}
            </div>
          </div>

          <div className="mt-2.5 text-[12px] font-semibold text-ink-400">
            Your story, your call - nothing posts unless you say so.
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => decide(s, "approve")}
              className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full bg-blue-primary px-5 text-[13.5px] font-extrabold text-white hover:bg-blue-hover"
            >
              Share it with the community
            </button>
            <button
              type="button"
              onClick={() => decide(s, "decline")}
              className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-sky-tint-2 bg-white px-5 text-[13.5px] font-bold text-ink-600 hover:border-blue-primary hover:text-blue-primary"
            >
              Not this time
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
