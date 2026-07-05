"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Heart, Menu, X } from "lucide-react";

const WORDMARK_WHITE =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png";

const PROGRAM_LINKS = [
  { href: "/about", label: "Position of Neutrality" },
  { href: "/mentor", label: "Peer Mentorship" },
  { href: "/give", label: "QR Code Giving" },
];

const CENTER_LINKS = [
  { href: "/dashboard", label: "Center dashboard" },
  { href: "/member-app", label: "Member app" },
  { href: "/mentor-app", label: "Mentor app" },
];

const DONATE_LINKS = [
  { href: "/donate", label: "Give monthly" },
  { href: "/give", label: "Give to a member" },
  { href: "/mentor", label: "Donate items or time" },
];

/**
 * Mobile nav drawer (below lg) — hamburger trigger + full-screen navy-deep
 * panel sliding in from the right. Desktop nav/mega-menu is untouched; this
 * component renders nothing visible at lg+.
 */
export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
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

          <button
            type="button"
            onClick={() => setProgramsOpen((v) => !v)}
            className={
              rowClass +
              " w-full cursor-pointer justify-between bg-transparent p-0 py-2.5 text-left text-[20px] font-bold text-white"
            }
            aria-expanded={programsOpen}
          >
            Programs
            <ChevronDown
              size={20}
              className={
                "text-[#8FBCF0] transition-transform " +
                (programsOpen ? "rotate-180" : "")
              }
            />
          </button>
          {programsOpen && (
            <div className="flex flex-col border-b border-white/10 py-3">
              {PROGRAM_LINKS.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-xl px-3 text-[16px] font-semibold text-white/85 hover:bg-white/[.08]"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 px-3 text-[11px] font-bold tracking-[.12em] text-[#8FBCF0]">
                FOR CENTERS
              </div>
              {CENTER_LINKS.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-xl px-3 text-[15px] font-semibold text-white/70 hover:bg-white/[.08]"
                >
                  {l.label} →
                </Link>
              ))}
            </div>
          )}

          <Link href="/community" onClick={close} className={rowClass}>
            Community
          </Link>

          <button
            type="button"
            onClick={() => setDonateOpen((v) => !v)}
            className={
              rowClass +
              " w-full cursor-pointer justify-between bg-transparent p-0 py-2.5 text-left text-[20px] font-bold text-white"
            }
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
            <div className="flex flex-col border-b border-white/10 py-3">
              {DONATE_LINKS.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-xl px-3 text-[16px] font-semibold text-white/85 hover:bg-white/[.08]"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 px-3 text-[11px] font-bold tracking-[.12em] text-[#8FBCF0]">
                DIRECT SUPPORT
              </div>
              <Link
                href="/give"
                onClick={close}
                className="flex min-h-11 items-center rounded-xl px-3 text-[15px] font-semibold text-white/70 hover:bg-white/[.08]"
              >
                Danielle&rsquo;s giving page →
              </Link>
            </div>
          )}
          <Link href="/mentor" onClick={close} className={rowClass}>
            Become a Mentor
          </Link>
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
