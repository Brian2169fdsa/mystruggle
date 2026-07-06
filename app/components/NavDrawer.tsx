"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Briefcase,
  ChevronDown,
  Gift,
  GraduationCap,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  MessageCircle,
  QrCode,
  ScrollText,
  Smartphone,
  Sparkles,
  Target,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const WORDMARK_WHITE =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png";

type DrawerItem = { href: string; label: string; icon: LucideIcon };
type DrawerGroup = { heading: string; items: DrawerItem[] };

/** Platform accordion - mirrors the desktop mega-menu groups. */
const PLATFORM_GROUPS: DrawerGroup[] = [
  {
    heading: "The Community",
    items: [
      { href: "/community", label: "Community feed", icon: MessageCircle },
      { href: "/community", label: "Circles", icon: Users },
      { href: "/giving", label: "QR Code Giving", icon: QrCode },
    ],
  },
  {
    heading: "For Members",
    items: [
      { href: "/member-app", label: "Member app", icon: Smartphone },
      { href: "/member-app", label: "Learn & programs", icon: GraduationCap },
      { href: "/member-app", label: "Goals & résumé", icon: Target },
      { href: "/member-app", label: "The Guide", icon: Sparkles },
    ],
  },
  {
    heading: "Programs & Mentors",
    items: [
      { href: "/about", label: "Position of Neutrality", icon: BookOpen },
      { href: "/mentor", label: "Peer Mentorship", icon: HeartHandshake },
      { href: "/mentor", label: "Become a Mentor", icon: UserPlus },
    ],
  },
];

const CENTER_ITEMS: DrawerItem[] = [
  { href: "/centers", label: "Platform overview", icon: LayoutDashboard },
  { href: "/dashboard", label: "Center dashboard", icon: Activity },
  { href: "/mentor-app", label: "Mentor app", icon: Smartphone },
];

const DONATE_ITEMS: DrawerItem[] = [
  { href: "/donate", label: "Give monthly", icon: HeartHandshake },
  { href: "/give", label: "Give to a member", icon: QrCode },
  { href: "/mentor", label: "Donate items or time", icon: Gift },
  { href: "/giving", label: "How giving works", icon: ScrollText },
];

/**
 * Mobile nav drawer (below lg) - hamburger trigger + full-screen navy-deep
 * panel. Mirrors the desktop Platform / Donate mega-menus as tidy expandable
 * accordion groups. Renders nothing visible at lg+.
 */
export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  const rowClass =
    "flex min-h-[52px] items-center border-b border-white/10 py-2.5";
  const accordionBtnClass =
    rowClass +
    " w-full cursor-pointer justify-between bg-transparent p-0 py-2.5 text-left text-[20px] font-bold text-white";

  const renderItem = (item: DrawerItem, muted = false) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.label + item.href + (muted ? "-c" : "")}
        href={item.href}
        onClick={close}
        className={
          "flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] font-semibold hover:bg-white/[.08] " +
          (muted ? "text-white/70" : "text-white/90")
        }
      >
        <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-white/10 text-[#9DBEEC]">
          <Icon size={16} />
        </span>
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center bg-transparent text-ink-900 lg:hidden"
      >
        <Menu size={26} />
      </button>

      <div
        aria-hidden={!open}
        inert={!open}
        className={
          "fixed inset-0 z-[100] flex flex-col bg-navy-deep transition-transform duration-300 ease-out lg:hidden " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <div className="hairline" />
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" onClick={close}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={WORDMARK_WHITE}
              alt="My Struggle"
              className="block h-9 w-auto"
            />
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="flex h-11 w-11 cursor-pointer items-center justify-center bg-transparent text-white"
          >
            <X size={26} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-5 pb-4 pt-1 text-[20px] font-bold text-white">
          <Link href="/about" onClick={close} className={rowClass}>
            About us
          </Link>

          {/* Platform accordion */}
          <button
            type="button"
            onClick={() => setPlatformOpen((v) => !v)}
            className={accordionBtnClass}
            aria-expanded={platformOpen}
          >
            Platform
            <ChevronDown
              size={20}
              className={
                "text-[#8FBCF0] transition-transform " +
                (platformOpen ? "rotate-180" : "")
              }
            />
          </button>
          {platformOpen && (
            <div className="flex flex-col gap-3 border-b border-white/10 py-3">
              {PLATFORM_GROUPS.map((group) => (
                <div key={group.heading} className="flex flex-col">
                  <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[.14em] text-[#8FBCF0]">
                    {group.heading}
                  </div>
                  {group.items.map((item) => renderItem(item))}
                </div>
              ))}
              <div className="flex flex-col">
                <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[.14em] text-[#8FBCF0]">
                  For recovery centers
                </div>
                {CENTER_ITEMS.map((item) => renderItem(item, true))}
              </div>
            </div>
          )}

          <Link href="/community" onClick={close} className={rowClass}>
            Community
          </Link>

          {/* Donate accordion */}
          <button
            type="button"
            onClick={() => setDonateOpen((v) => !v)}
            className={accordionBtnClass}
            aria-expanded={donateOpen}
          >
            Donate today
            <ChevronDown
              size={20}
              className={
                "text-[#8FBCF0] transition-transform " +
                (donateOpen ? "rotate-180" : "")
              }
            />
          </button>
          {donateOpen && (
            <div className="flex flex-col gap-3 border-b border-white/10 py-3">
              <div className="flex flex-col">
                {DONATE_ITEMS.map((item) => renderItem(item))}
              </div>
              <div className="flex flex-col">
                <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[.14em] text-[#8FBCF0]">
                  For employers
                </div>
                <a
                  href="mailto:info@themystruggles.com"
                  onClick={close}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] font-semibold text-white/70 hover:bg-white/[.08]"
                >
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-white/10 text-[#9DBEEC]">
                    <Briefcase size={16} />
                  </span>
                  Post jobs to the community
                </a>
              </div>
            </div>
          )}

          <Link href="/login" onClick={close} className={rowClass}>
            Sign in
          </Link>
        </nav>

        <div className="px-5 pb-8 pt-3">
          <Link
            href="/donate"
            onClick={close}
            className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-primary text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
          >
            Donate <Heart size={14} fill="currentColor" />
          </Link>
        </div>
      </div>
    </>
  );
}
