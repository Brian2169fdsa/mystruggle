"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Site", match: ["/", "/about", "/donate", "/mentor"] },
  { href: "/community", label: "Feed", match: ["/community"] },
  { href: "/give", label: "Giving", match: ["/give"] },
  { href: "/member-app", label: "Member", match: ["/member-app"] },
  { href: "/mentor-app", label: "Mentor", match: ["/mentor-app"] },
  { href: "/dashboard", label: "Center", match: ["/dashboard"] },
];

/** Fixed bottom-right prototype navigator present on every screen. */
export default function PrototypeMap() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-0.5 rounded-full bg-navy-deep p-2 px-2.5 shadow-[0_8px_24px_rgba(11,37,69,.35)]">
      <span className="px-2 text-[10px] font-extrabold tracking-[.08em] text-[#8FBCF0]">
        PROTOTYPE
      </span>
      {LINKS.map((l) => {
        const active = l.match.includes(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              "rounded-full px-2.5 py-1.5 text-[11px] font-bold " +
              (active
                ? "bg-blue-primary text-white"
                : "text-white/80 hover:text-white")
            }
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
