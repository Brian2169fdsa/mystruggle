"use client";

// Mobile bottom tab bar for the community surface — app-like navigation on
// small screens (hidden at lg+ where the three-column rails take over).
// Alerts shows a live unread badge from GET /api/notifications; a 401
// (signed out) or zero unread simply hides the badge.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Home,
  Menu,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra paths (prefixes) that should light this tab up. */
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/community",
    label: "Feed",
    icon: Home,
    match: (p) => p === "/community" || p.startsWith("/community/u"),
  },
  {
    href: "/community/circles",
    label: "Circles",
    icon: Users,
    match: (p) => p.startsWith("/community/circles"),
  },
  {
    href: "/community/events",
    label: "Events",
    icon: CalendarDays,
    match: (p) => p.startsWith("/community/events"),
  },
  {
    href: "/notifications",
    label: "Alerts",
    icon: Bell,
    match: (p) => p.startsWith("/notifications"),
  },
  {
    href: "/community/menu",
    label: "Menu",
    icon: Menu,
    match: (p) => p.startsWith("/community/menu"),
  },
];

/**
 * Fixed bottom tab bar, mobile-only (`lg:hidden`). Five destinations across
 * the community surface; the active tab is blue with a 2px top indicator.
 * Safe-area padded for phones with home indicators.
 */
export default function CommunityTabBar() {
  const pathname = usePathname() ?? "";
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      // 401 (signed out) or any error → no badge.
      if (!res.ok) {
        setUnread(0);
        return;
      }
      const data = (await res.json()) as {
        unreadCount?: number;
        notifications?: { read?: boolean }[];
      };
      setUnread(
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : (data.notifications ?? []).filter((n) => !n.read).length
      );
    } catch {
      // Network hiccup — keep the last known count.
    }
  }, []);

  // Poll on mount, refresh gently, and re-check when the tab regains focus.
  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <nav
      aria-label="Community"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(11,37,69,.08)] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-[520px] items-stretch">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  "relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1 " +
                  (active
                    ? "text-blue-primary"
                    : "text-ink-600 hover:text-ink-900")
                }
              >
                {/* 2px active indicator along the top edge of the tab */}
                <span
                  aria-hidden
                  className={
                    "absolute inset-x-3 top-0 h-[2px] rounded-full " +
                    (active ? "bg-blue-primary" : "bg-transparent")
                  }
                />
                <span className="relative">
                  <Icon size={23} strokeWidth={active ? 2.25 : 2} />
                  {label === "Alerts" && unread > 0 && (
                    <span className="absolute -right-2 -top-1 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-blue-primary px-1 text-[9px] font-bold leading-none text-white shadow-[0_0_0_2px_#fff]">
                      {badge}
                    </span>
                  )}
                </span>
                <span
                  className={
                    "text-[10.5px] leading-none " +
                    (active ? "font-bold" : "font-semibold")
                  }
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
