"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isCrisisText } from "@/app/lib/crisis";

// ── Types ────────────────────────────────────────────────────────────────
type ChatLink = { href: string; label: string; external?: boolean };
type Msg = {
  role: "guide" | "user";
  text?: string;
  links?: ChatLink[];
  hint?: string; // small muted helper line (e.g. demo creds)
  care?: boolean; // navy "care" styling — used for the 988 line
  grid?: boolean; // render the compact site-map link grid
};

// The 988 line is appended verbatim for any support / crisis path. Never
// dismissive, always navy so it reads as a distinct, gentle care message.
const CARE_988 =
  "In crisis? Call or text 988 — someone is there right now.";

// Footer + default-answer link grid (preserves the old prototype bar's map).
const SITE_MAP: ChatLink[] = [
  { href: "/", label: "Site" },
  { href: "/community", label: "Feed" },
  { href: "/giving", label: "Giving" },
  { href: "/member-app", label: "Member" },
  { href: "/mentor-app", label: "Mentor" },
  { href: "/dashboard", label: "Center" },
];

const GREETING: Msg = {
  role: "guide",
  text: "Hi! I can point you anywhere on My Struggle. What do you need?",
};

// Quick-reply chips shown under the greeting.
const CHIPS: { id: string; label: string }[] = [
  { id: "giving", label: "How does giving work?" },
  { id: "support", label: "I need support" },
  { id: "community", label: "Explore the community" },
  { id: "donate", label: "I want to donate" },
  { id: "center", label: "I run a recovery center" },
  { id: "employer", label: "I'm an employer" },
  { id: "app", label: "Open my app" },
];

// ── Canned answers ─────────────────────────────────────────────────────────
// Each id returns one or more guide messages. No network / external AI.
function answersFor(id: string): Msg[] {
  switch (id) {
    case "giving":
      return [
        {
          role: "guide",
          text: "Every gift splits 50/50 — half reaches the member right away as cash at their center, half is held as their Reentry Fund and released when they step back into society.",
          links: [{ href: "/giving", label: "See how giving works" }],
        },
      ];
    case "support":
      return [
        {
          role: "guide",
          text: "You're not alone — the community is here. You can create an account to connect with a mentor, or read the feed to see people walking the same road.",
          links: [
            { href: "/signup", label: "Create an account" },
            { href: "/community", label: "Read the community feed" },
          ],
        },
        { role: "guide", care: true, text: CARE_988 },
      ];
    case "community":
      return [
        {
          role: "guide",
          text: "The community feed is where members and mentors share wins, ask for help, and cheer each other on.",
          links: [{ href: "/community", label: "Open the community feed" }],
        },
      ];
    case "donate":
      return [
        {
          role: "guide",
          text: "Thank you — every gift is split 50/50 with the member. You can give to the mission or to a specific member's page.",
          links: [
            { href: "/donate", label: "Donate to the mission" },
            { href: "/give", label: "Give to a member" },
          ],
        },
      ];
    case "center":
      return [
        {
          role: "guide",
          text: "We give centers the whole platform — messaging, programming, an LMS, and a dashboard.",
          links: [{ href: "/centers", label: "See the center platform" }],
          hint: "Demo: sarah@themystruggles.com / mystruggle",
        },
      ];
    case "employer":
      return [
        {
          role: "guide",
          text: "Post jobs and opportunities to our community — email info@themystruggles.com. Employer dashboards are coming soon.",
          links: [
            {
              href: "mailto:info@themystruggles.com",
              label: "Email info@themystruggles.com",
              external: true,
            },
          ],
        },
      ];
    case "app":
      return [
        {
          role: "guide",
          text: "Here's every app surface — jump straight in:",
          links: [
            { href: "/member-app", label: "Member app" },
            { href: "/mentor-app", label: "Mentor app" },
            { href: "/dashboard", label: "Center dashboard" },
            { href: "/account", label: "My account" },
          ],
        },
      ];
    case "auth":
      return [
        {
          role: "guide",
          text: "You can create an account, sign in, or manage your account here.",
          links: [
            { href: "/signup", label: "Create an account" },
            { href: "/login", label: "Sign in" },
            { href: "/account", label: "My account" },
          ],
        },
      ];
    default:
      return [
        {
          role: "guide",
          text: "I'm still learning — here's everywhere I can take you:",
          grid: true,
        },
      ];
  }
}

// Free-text keyword routing. Crisis check is handled by the caller first.
function routeText(text: string): Msg[] {
  const t = text.toLowerCase();
  if (/\b(give|giving|donate|donation|gift)\b/.test(t))
    return answersFor("giving");
  if (/\b(job|jobs|hire|hiring|employ|employer|employers)\b/.test(t))
    return answersFor("employer");
  if (/\b(center|centre|dashboard)\b/.test(t)) return answersFor("center");
  if (/\b(sign|signup|signin|log ?in|login|account)\b/.test(t))
    return answersFor("auth");
  return answersFor("default");
}

// ── Shared UI bits ─────────────────────────────────────────────────────────
/** Script "M" tile — indigo→blue gradient, white glyph. */
function GuideTile({ size = 36 }: { size?: number }) {
  return (
    <div
      className="script flex flex-none items-center justify-center rounded-xl bg-[linear-gradient(135deg,#4E5B9B,#2E7CD6)]"
      style={{ height: size, width: size, color: "#fff", fontSize: size * 0.56 }}
    >
      M
    </div>
  );
}

function LinkChip({ link }: { link: ChatLink }) {
  const cls =
    "inline-flex min-h-[40px] items-center rounded-full border-[1.5px] border-blue-primary bg-white px-4 py-2 text-[13px] font-bold text-blue-primary hover:bg-sky-tint";
  if (link.external) {
    return (
      <a href={link.href} className={cls}>
        {link.label} →
      </a>
    );
  }
  return (
    <Link href={link.href} className={cls}>
      {link.label} →
    </Link>
  );
}

function LinkGrid() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {SITE_MAP.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex min-h-[44px] items-center justify-center rounded-xl bg-sky-tint px-2 py-2 text-[12px] font-bold text-blue-primary hover:bg-sky-tint-2"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}

function MessageBubble({ m }: { m: Msg }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[260px] rounded-2xl rounded-tr-md bg-blue-primary px-4 py-2.5 text-[14px]/[1.55] font-medium text-white">
          {m.text}
        </div>
      </div>
    );
  }
  // Guide "care" bubble — distinct navy, never dismissive.
  if (m.care) {
    return (
      <div className="flex items-start gap-2.5">
        <GuideTile />
        <div className="max-w-[280px] rounded-2xl rounded-tl-md bg-navy-deep px-4 py-3 text-[14px]/[1.55] font-semibold text-white shadow-[0_2px_8px_rgba(11,37,69,.25)]">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5">
      <GuideTile />
      <div className="flex max-w-[280px] flex-col gap-2.5">
        {m.text && (
          <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[14px]/[1.55] font-medium text-ink-900 shadow-[0_1px_3px_rgba(11,37,69,.08)]">
            {m.text}
          </div>
        )}
        {m.grid && <LinkGrid />}
        {m.links && (
          <div className="flex flex-col items-start gap-2">
            {m.links.map((l) => (
              <LinkChip key={l.href} link={l} />
            ))}
          </div>
        )}
        {m.hint && (
          <div className="text-[12px] font-medium text-ink-400">{m.hint}</div>
        )}
      </div>
    </div>
  );
}

// ── Widget ─────────────────────────────────────────────────────────────────
const TOOLTIP_KEY = "ms-guide-tooltip-dismissed";

/**
 * Floating AI assistant ("The Guide") — collapsed bubble → chat panel on every
 * page. Canned answers only, no network/AI calls. Keeps the default export
 * name so existing imports are untouched.
 */
export default function PrototypeMap() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [showChips, setShowChips] = useState(true);
  const [input, setInput] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Apps use bottom tab bars — lift the bubble so it clears them.
  const inApp =
    pathname?.startsWith("/member-app") || pathname?.startsWith("/mentor-app");
  const offset = inApp ? "bottom-24" : "bottom-4";

  // One-time gentle tooltip, dismissed via localStorage.
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOOLTIP_KEY)) setShowTooltip(true);
    } catch {
      /* ignore */
    }
  }, []);

  function dismissTooltip() {
    setShowTooltip(false);
    try {
      localStorage.setItem(TOOLTIP_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  function openPanel() {
    dismissTooltip();
    setOpen(true);
  }

  function push(...msgs: Msg[]) {
    setMessages((prev) => [...prev, ...msgs]);
  }

  function handleChip(id: string, label: string) {
    setShowChips(false);
    push({ role: "user", text: label }, ...answersFor(id));
  }

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setShowChips(false);
    const userMsg: Msg = { role: "user", text };
    // Crisis language → respond ONLY with the warm 988 care message.
    if (isCrisisText(text)) {
      push(userMsg, { role: "guide", care: true, text: CARE_988 });
      return;
    }
    push(userMsg, ...routeText(text));
  }

  return (
    <div className={`fixed ${offset} right-4 z-[100]`}>
      {/* ── Collapsed bubble ── */}
      {!open && (
        <div className="flex flex-col items-end gap-2">
          {showTooltip && (
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-900 shadow-[0_8px_24px_rgba(11,37,69,.18)]">
              Questions? I&apos;m The Guide.
              <button
                type="button"
                onClick={dismissTooltip}
                aria-label="Dismiss tooltip"
                className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-ink-400 hover:bg-sky-tint"
              >
                ✕
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={openPanel}
            aria-label="Chat with The Guide"
            className="script flex h-14 w-14 items-center justify-center rounded-full bg-navy-deep shadow-[0_8px_28px_rgba(46,124,214,.55)] transition-transform hover:scale-105"
            style={{ color: "#fff", fontSize: 26 }}
          >
            M
          </button>
        </div>
      )}

      {/* ── Open panel ── */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[100] flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl bg-canvas shadow-[0_12px_48px_rgba(11,37,69,.35)] sm:static sm:inset-auto sm:h-[520px] sm:max-h-[80vh] sm:w-[360px] sm:rounded-2xl">
          {/* Header */}
          <div className="flex flex-none items-center gap-3 bg-navy-deep px-4 py-3">
            <GuideTile />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-white">The Guide</div>
              <div className="truncate text-[12px] font-medium text-[#8FBCF0]">
                Here 24/7 — not a human, happy to help
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              <span className="text-[20px]">✕</span>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4"
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} m={m} />
            ))}

            {showChips && (
              <div className="flex flex-col items-start gap-2 pl-[46px]">
                {CHIPS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleChip(c.id, c.label)}
                    className="inline-flex min-h-[40px] items-center self-start rounded-full border-[1.5px] border-blue-primary px-4 py-2 text-left text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {showMap && (
              <div className="rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(11,37,69,.08)]">
                <div className="mb-2 text-[11px] font-bold tracking-[.12em] text-indigo-brand">
                  SITE MAP
                </div>
                <LinkGrid />
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSend}
            className="flex flex-none items-center gap-2 border-t border-sky-tint bg-white px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask The Guide…"
              aria-label="Message The Guide"
              className="h-11 flex-1 rounded-full border-[1.5px] border-sky-tint bg-canvas px-4 text-[14px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-blue-primary text-[18px] font-bold text-white hover:bg-blue-hover"
            >
              ↑
            </button>
          </form>

          {/* Footer — site-map toggle preserves the old bar's utility */}
          <div className="flex flex-none justify-center border-t border-sky-tint bg-white pb-2">
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="min-h-[36px] px-3 text-[12px] font-bold text-ink-400 hover:text-blue-primary"
            >
              {showMap ? "Hide site map" : "Site map"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
