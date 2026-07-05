import Link from "next/link";

const WORDMARK_WHITE =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png";

/** Full navy-deep footer (guide §4) — used on every marketing page. */
export default function Footer() {
  return (
    <footer className="bg-navy-deep">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[1.4fr_1fr_1fr_1.3fr] gap-12 px-6 pt-20">
        <div className="flex flex-col gap-[18px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WORDMARK_WHITE}
            alt="My Struggle"
            className="h-[52px] w-auto self-start"
          />
          <div className="max-w-[280px] text-[14px]/[1.7] text-white/65">
            End the Struggle, Build the Future Together.
          </div>
          <div className="flex gap-3">
            {["FB", "IG", "TT", "YT", "IN"].map((s) => (
              <span
                key={s}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/30 text-[11px] font-bold text-white"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[13px] font-bold uppercase tracking-[.12em] text-[#A9B4E8]">
            Explore
          </div>
          <div className="mt-[18px] flex flex-col gap-3 text-[15px] font-medium">
            {[
              { href: "/about", label: "About us" },
              { href: "/donate", label: "Donate today" },
              { href: "/mentor", label: "Become a Mentor" },
              { href: "/give", label: "QR Code Giving" },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-white/85 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[13px] font-bold uppercase tracking-[.12em] text-[#A9B4E8]">
            Contact
          </div>
          <div className="mt-[18px] flex flex-col gap-3 text-[15px]/[1.5] font-medium text-white/85">
            <span>
              6614 W Harwell Rd
              <br />
              Laveen, AZ 85339
            </span>
            <span>602-402-7197</span>
            <span>info@themystruggles.com</span>
          </div>
        </div>

        <div>
          <div className="text-[13px] font-bold uppercase tracking-[.12em] text-[#A9B4E8]">
            Stay close
          </div>
          <div className="mt-[18px] text-[14px]/[1.6] text-white/65">
            Member milestones and center news, once a month.
          </div>
          <div className="mt-4 flex gap-2.5">
            <div className="flex h-12 flex-1 items-center rounded-full border border-white/30 px-5 text-[14px] text-white/50">
              Email address
            </div>
            <span className="inline-flex h-12 cursor-pointer items-center rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white">
              Join
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 flex max-w-[1200px] justify-between border-t border-white/[.12] px-6 py-6 text-[13px] text-white/50">
        <span>© 2026 My Struggle · EST. 2021 · Laveen, Arizona</span>
        <span>Privacy · Terms · 501(c)(3)</span>
      </div>
    </footer>
  );
}
