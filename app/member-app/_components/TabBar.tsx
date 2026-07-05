"use client";

import { Home, GraduationCap, Heart, MessageCircle, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TabKey = "home" | "learn" | "give" | "chat" | "me";

const TABS: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: "home", label: "Home", Icon: Home },
  { key: "learn", label: "Learn", Icon: GraduationCap },
  { key: "give", label: "Give", Icon: Heart },
  { key: "chat", label: "Chat", Icon: MessageCircle },
  { key: "me", label: "Me", Icon: User },
];

/** Sticky bottom 5-tab bar. Active = blue, inactive = ink-400. */
export default function TabBar({
  active,
  onSelect,
}: {
  active: TabKey;
  onSelect: (key: TabKey) => void;
}) {
  return (
    <div className="sticky bottom-0 z-20 grid grid-cols-5 border-t border-sky-tint bg-white pb-[22px] pt-2">
      {TABS.map(({ key, label, Icon }) => {
        const on = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={
              "flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-[3px] " +
              (on ? "text-blue-primary" : "text-ink-400")
            }
          >
            <Icon size={19} strokeWidth={on ? 2.4 : 2} />
            <span className={"text-[11px] " + (on ? "font-bold" : "font-semibold")}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
