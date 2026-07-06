"use client";

import { Users, MessageCircle, Home, CircleUser } from "lucide-react";

export type MentorView =
  | "roster"
  | "detail"
  | "chatlist"
  | "thread"
  | "channel"
  | "community"
  | "me";

/** Bottom tab bar - shown everywhere except mentee detail. */
export default function TabBar({
  view,
  onMentees,
  onChat,
  onCommunity,
  onMe,
}: {
  view: MentorView;
  onMentees: () => void;
  onChat: () => void;
  onCommunity: () => void;
  onMe: () => void;
}) {
  const tabs = [
    {
      label: "Mentees",
      Icon: Users,
      active: view === "roster",
      onClick: onMentees,
    },
    {
      label: "Chat",
      Icon: MessageCircle,
      active: view === "chatlist" || view === "thread" || view === "channel",
      onClick: onChat,
    },
    {
      label: "Community",
      Icon: Home,
      active: view === "community",
      onClick: onCommunity,
    },
    { label: "Me", Icon: CircleUser, active: view === "me", onClick: onMe },
  ];

  return (
    <div className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-sky-tint bg-white pb-[22px] pt-2">
      {tabs.map(({ label, Icon, active, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className={
            "flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-[3px] " +
            (active ? "text-blue-primary" : "text-ink-400")
          }
        >
          <Icon size={20} strokeWidth={active ? 2.25 : 2} />
          <span
            className={"text-[11px] " + (active ? "font-bold" : "font-semibold")}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
