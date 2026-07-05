import Link from "next/link";
import { Heart } from "lucide-react";
import NavDrawer from "./NavDrawer";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

/**
 * Sticky website nav with the Programs mega-menu (CSS-hover, kept open across
 * the 22px hover bridge) and the 3px indigo→blue gradient hairline.
 * Shared by all four marketing pages.
 */
export default function Nav() {
  return (
    <div className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(11,37,69,.04)]">
      <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-5 lg:h-[76px] lg:px-6">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WORDMARK_INDIGO}
            alt="My Struggle"
            className="block h-9 w-auto lg:h-11"
          />
        </Link>

        <nav className="hidden items-center gap-[26px] text-[15px] font-semibold lg:flex">
          <Link href="/about" className="text-ink-900 hover:text-blue-primary">
            About us
          </Link>

          {/* Programs — mega-menu on hover */}
          <div className="group relative flex items-center">
            <span className="flex cursor-pointer items-center gap-[5px] text-ink-900 group-hover:text-blue-primary">
              Programs <span className="text-[10px] text-ink-600">▾</span>
            </span>
            <div className="pointer-events-none absolute left-1/2 top-full z-[60] hidden -translate-x-1/2 pt-[22px] group-hover:pointer-events-auto group-hover:block">
              <div className="w-[740px] overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(11,37,69,.25)]">
                <div className="hairline" />
                <div className="grid grid-cols-[280px_1fr] gap-7 p-7">
                  <Link
                    href="/about"
                    className="photo-ph relative block min-h-[250px] overflow-hidden rounded-xl"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(11,37,69,.85))]" />
                    <div className="absolute bottom-0 p-[18px] text-white">
                      <div className="text-base font-bold">
                        Position of Neutrality
                      </div>
                      <div className="mt-1 text-[13px]/[1.5] italic text-white/80">
                        &ldquo;Steady ground first. Everything else follows.&rdquo;
                      </div>
                    </div>
                  </Link>
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        href: "/about",
                        title: "Position of Neutrality",
                        desc: "The eight-course ISE curriculum, from surviving to becoming.",
                      },
                      {
                        href: "/mentor",
                        title: "Peer Mentorship",
                        desc: "One-on-one guidance from someone who's walked your road.",
                      },
                      {
                        href: "/giving",
                        title: "QR Code Giving",
                        desc: "Direct, accountable giving — half now, half held for reentry.",
                      },
                    ].map((it) => (
                      <Link
                        key={it.title}
                        href={it.href}
                        className="flex items-center gap-4 rounded-xl p-3 hover:bg-sky-tint"
                      >
                        <div className="h-[52px] w-[52px] flex-none rounded-[10px] bg-[repeating-linear-gradient(45deg,#D2E2F5_0_8px,#C3D8F0_8px_16px)]" />
                        <div>
                          <div className="text-[15px] font-bold text-ink-900">
                            {it.title}
                          </div>
                          <div className="text-[13px] text-ink-600">
                            {it.desc}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-5 border-t border-sky-tint bg-canvas px-7 py-4">
                  <span className="text-[12px] font-bold tracking-[.12em] text-indigo-brand">
                    FOR CENTERS
                  </span>
                  <Link
                    href="/centers"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-primary"
                  >
                    Platform overview →
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-primary"
                  >
                    Center dashboard →
                  </Link>
                  <Link
                    href="/member-app"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-primary"
                  >
                    Member app →
                  </Link>
                  <Link
                    href="/mentor-app"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-primary"
                  >
                    Mentor app →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/community"
            className="text-ink-900 hover:text-blue-primary"
          >
            Community
          </Link>

          <Link href="/giving" className="text-ink-900 hover:text-blue-primary">
            Giving
          </Link>

          {/* Donate — mega-menu on hover; top-level link still navigates */}
          <div className="group relative flex items-center">
            <Link
              href="/donate"
              className="flex items-center gap-[5px] text-ink-900 group-hover:text-blue-primary"
            >
              Donate today <span className="text-[10px] text-ink-600">▾</span>
            </Link>
            <div className="pointer-events-none absolute left-1/2 top-full z-[60] hidden -translate-x-1/2 pt-[22px] group-hover:pointer-events-auto group-hover:block">
              <div className="w-[640px] overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(11,37,69,.25)]">
                <div className="hairline" />
                <div className="grid grid-cols-[240px_1fr] gap-7 p-7">
                  <Link
                    href="/donate"
                    className="photo-ph relative block min-h-[250px] overflow-hidden rounded-xl"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(11,37,69,.85))]" />
                    <div className="absolute bottom-0 p-[18px] text-white">
                      <div className="text-base font-bold">
                        Every gift builds someone&rsquo;s way home
                      </div>
                      <div className="mt-1 text-[13px]/[1.5] italic text-white/80">
                        &ldquo;$25 provides a week of essential services.&rdquo;
                      </div>
                    </div>
                  </Link>
                  <div className="flex flex-col gap-2">
                    {[
                      {
                        href: "/donate",
                        title: "Give monthly",
                        desc: "Tiers from $25 — a week of essential services",
                      },
                      {
                        href: "/give",
                        title: "Give to a member",
                        desc: "Scan a QR code or visit their page — half now, half for reentry",
                      },
                      {
                        href: "/mentor",
                        title: "Donate items or time",
                        desc: "Give supplies or mentor at a center",
                      },
                      {
                        href: "/giving",
                        title: "How giving works",
                        desc: "The 50/50 promise, explained",
                      },
                    ].map((it) => (
                      <Link
                        key={it.title}
                        href={it.href}
                        className="flex items-center gap-4 rounded-xl p-3 hover:bg-sky-tint"
                      >
                        <div className="h-[52px] w-[52px] flex-none rounded-[10px] bg-[repeating-linear-gradient(45deg,#D2E2F5_0_8px,#C3D8F0_8px_16px)]" />
                        <div>
                          <div className="text-[15px] font-bold text-ink-900">
                            {it.title}
                          </div>
                          <div className="text-[13px] text-ink-600">
                            {it.desc}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-5 border-t border-sky-tint bg-canvas px-7 py-4">
                  <span className="text-[12px] font-bold tracking-[.12em] text-indigo-brand">
                    DIRECT SUPPORT
                  </span>
                  <Link
                    href="/give"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-primary"
                  >
                    Danielle&rsquo;s giving page →
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <Link href="/mentor" className="text-ink-900 hover:text-blue-primary">
            Become a Mentor
          </Link>
        </nav>

        <div className="flex items-center gap-2.5 lg:gap-[18px]">
          <Link
            href="/login"
            className="hidden text-[15px] font-semibold text-blue-primary lg:block"
          >
            Sign in
          </Link>
          <Link
            href="/donate"
            className="inline-flex h-11 items-center gap-[7px] rounded-full bg-blue-primary px-[18px] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover lg:h-[46px] lg:px-[26px] lg:text-[15px]"
          >
            Donate <Heart size={13} fill="currentColor" />
          </Link>
          <NavDrawer />
        </div>
      </div>
      <div className="hairline" />
    </div>
  );
}
