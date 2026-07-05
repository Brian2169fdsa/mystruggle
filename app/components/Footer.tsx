import Link from "next/link";
import NewsletterForm from "./NewsletterForm";

const SOCIALS = [
  {
    tag: "FB",
    label: "My Struggle on Facebook",
    href: "https://www.facebook.com/themystruggle",
  },
  {
    tag: "IG",
    label: "My Struggle on Instagram",
    href: "https://www.instagram.com/themystruggle",
  },
  {
    tag: "TT",
    label: "My Struggle on TikTok",
    href: "https://www.tiktok.com/@themystruggle",
  },
  {
    tag: "YT",
    label: "My Struggle on YouTube",
    href: "https://www.youtube.com/@themystruggle",
  },
  {
    tag: "IN",
    label: "My Struggle on LinkedIn",
    href: "https://www.linkedin.com/company/themystruggle",
  },
];

const WORDMARK_WHITE =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png";

/** Full navy-deep footer (guide §4) — used on every marketing page. */
export default function Footer() {
  return (
    <footer className="bg-navy-deep">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-5 pt-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-12 lg:px-6 lg:pt-20">
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
            {SOCIALS.map((s) => (
              <a
                key={s.tag}
                href={s.href}
                target="_blank"
                rel="noopener"
                aria-label={s.label}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/30 text-[11px] font-bold text-white"
              >
                {s.tag}
              </a>
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
          <NewsletterForm />
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-[1200px] flex-col items-center gap-2 border-t border-white/[.12] px-5 py-6 text-center text-[13px] text-white/50 lg:mt-16 lg:flex-row lg:justify-between lg:px-6 lg:text-left">
        <span>© 2026 My Struggle · EST. 2021 · Laveen, Arizona</span>
        <span>Privacy · Terms · 501(c)(3)</span>
      </div>
    </footer>
  );
}
