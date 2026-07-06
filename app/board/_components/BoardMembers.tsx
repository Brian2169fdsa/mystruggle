"use client";

// "Meet our board" - a grid of member cards, each opening a polished modal
// popover with the expanded bio. Card bio and popover bio use the same copy
// for now (easy to expand later). No photos yet: a gradient monogram avatar.

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface BoardMember {
  name: string;
  title: string;
  bio: string;
  gradient: string; // avatar gradient (tailwind classes)
}

const MEMBERS: BoardMember[] = [
  {
    name: "Joseph Landin",
    title: "Founder & President",
    bio: "Drawing on his own lived experience, Joseph founded Sanctuary Recovery Centers and leads the community in building recovery and reentry services.",
    gradient: "from-blue-primary to-indigo-brand",
  },
  {
    name: "Jeremy Shall",
    title: "Board Member",
    bio: "With lived experience guiding his work, Jeremy coordinates with the Arizona Department of Corrections, Maricopa County Adult Probation, and the courts, connecting justice-involved members to housing and continued care.",
    gradient: "from-indigo-brand to-navy-deep",
  },
  {
    name: "Kelly Whiting",
    title: "Treasurer",
    bio: "Kelly brings her passion for recovery and reentry to her role as Treasurer, ensuring the initiative's resources directly serve its mission.",
    gradient: "from-navy-deep to-blue-primary",
  },
  {
    name: "Angelo Lopez",
    title: "Board Member",
    bio: "Driven by his lived experience, Angelo works hands-on with individuals reentering society, serving as a community leader and mentor.",
    gradient: "from-blue-primary to-[#5B8DE0]",
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function Avatar({
  member,
  size,
}: {
  member: BoardMember;
  size: "card" | "modal";
}) {
  const dim = size === "modal" ? "h-20 w-20 text-[26px]" : "h-16 w-16 text-[20px]";
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${member.gradient} font-extrabold text-white shadow-[0_6px_16px_rgba(11,37,69,.2)]`}
      aria-hidden
    >
      {initials(member.name)}
    </div>
  );
}

export default function BoardMembers() {
  const [open, setOpen] = useState<BoardMember | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {MEMBERS.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => setOpen(m)}
            className="group flex flex-col items-start gap-3.5 rounded-2xl border border-sky-tint-2 bg-white p-5 text-left shadow-[0_1px_3px_rgba(11,37,69,.06)] transition-all hover:-translate-y-0.5 hover:border-blue-primary/40 hover:shadow-[0_10px_26px_rgba(11,37,69,.12)]"
          >
            <Avatar member={m} size="card" />
            <div>
              <div className="text-[16px] font-extrabold tracking-[-0.01em] text-ink-900">
                {m.name}
              </div>
              <div className="mt-1 inline-flex items-center rounded-full bg-sky-tint px-2.5 py-0.5 text-[11.5px] font-bold text-blue-primary">
                {m.title}
              </div>
            </div>
            <p className="line-clamp-3 text-[13.5px]/[1.6] text-ink-600">
              {m.bio}
            </p>
            <span className="mt-auto pt-1 text-[13px] font-bold text-blue-primary group-hover:underline">
              Read bio →
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-deep/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${open.name} bio`}
          onClick={() => setOpen(null)}
        >
          <div
            className="relative w-full max-w-[560px] overflow-hidden rounded-t-2xl bg-white shadow-[0_20px_60px_rgba(11,37,69,.35)] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent band */}
            <div
              className={`h-24 w-full bg-gradient-to-r ${open.gradient}`}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur transition-colors hover:bg-white/40"
            >
              <X size={18} />
            </button>

            <div className="px-6 pb-7 sm:px-8">
              <div className="-mt-10 flex items-end gap-4">
                <div className="rounded-full ring-4 ring-white">
                  <Avatar member={open} size="modal" />
                </div>
                <div className="pb-1">
                  <div className="text-[22px] font-extrabold tracking-[-0.01em] text-ink-900">
                    {open.name}
                  </div>
                  <div className="mt-1 inline-flex items-center rounded-full bg-sky-tint px-3 py-0.5 text-[12px] font-bold text-blue-primary">
                    {open.title}
                  </div>
                </div>
              </div>

              <p className="mt-5 text-[15.5px]/[1.75] text-ink-600">{open.bio}</p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#apply"
                  onClick={() => setOpen(null)}
                  className="inline-flex h-[48px] flex-1 items-center justify-center rounded-full bg-blue-primary px-6 text-[15px] font-bold text-white hover:bg-blue-hover"
                >
                  Apply to join the board
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="inline-flex h-[48px] items-center justify-center rounded-full border-[1.5px] border-sky-tint-2 px-6 text-[15px] font-bold text-ink-600 hover:bg-canvas"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
