import Link from "next/link";
import { Heart } from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";
import { db } from "../lib/store";
import type { SupportRequest } from "../lib/types";

export const metadata = {
  title: "Give to a Member - My Struggle",
  description:
    "Pick one person and give directly to their journey - half in cash today, half held for their reentry.",
};

// The member list comes from the live in-memory store - render per request.
export const dynamic = "force-dynamic";

type MemberCard = {
  slug: string;
  name: string;
  memberNumber: string;
  avatarColor: string;
  story: string;
  request: SupportRequest | null;
};

function money(n: number) {
  return "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
}

/** Consent-gated public member list - same privacy rules as /api/members
 *  and /api/requests/board: consenting members only, first names + slugs. */
function publicMembers(): MemberCard[] {
  const d = db();
  const cards = d.users
    .filter((u) => u.role === "member" && u.consentPublic && u.slug)
    .map((u) => {
      const request =
        d.requests.find(
          (r) => r.memberId === u.id && r.status === "active"
        ) ?? null;
      return {
        slug: u.slug!,
        name: u.name,
        memberNumber: u.memberNumber ?? "",
        avatarColor: u.avatarColor,
        story: u.story ?? "",
        request,
      };
    });
  // Danielle featured first, then members with an active goal, then the rest.
  cards.sort((a, b) => {
    if (a.slug === "danielle") return -1;
    if (b.slug === "danielle") return 1;
    if (!!a.request !== !!b.request) return a.request ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return cards.slice(0, 12);
}

export default async function GivePage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; monthly?: string }>;
}) {
  const sp = await searchParams;

  // Honor ?amount= and ?monthly= by passing them through to /p/[slug].
  // (The giving page may ignore them today - safe either way.)
  const qp = new URLSearchParams();
  const amt = parseInt(sp.amount ?? "", 10);
  if (!isNaN(amt) && amt > 0) qp.set("amount", String(amt));
  if (sp.monthly === "1" || sp.monthly === "true") qp.set("monthly", "1");
  const qs = qp.toString() ? `?${qp.toString()}` : "";

  const members = publicMembers();

  return (
    <>
      <Nav />

      {/* HEADER */}
      <section className="bg-navy-deep">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-16 lg:px-6 lg:py-[90px]">
          <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
            QR CODE GIVING
          </div>
          <h1 className="max-w-[720px] text-[clamp(36px,4.6vw,56px)]/[1.08] font-extrabold tracking-[-0.02em] text-white">
            Give to one{" "}
            <span className="script text-[1.24em] text-[#A9B4E8]">person</span>
          </h1>
          <p className="max-w-[560px] text-[16px]/[1.65] font-medium text-white/[.88] lg:text-[18px]">
            Every member below has chosen to share their journey. Pick someone
            - half your gift is cash they collect today, half is held as their
            Reentry Fund.
          </p>
        </div>
      </section>

      {/* MEMBER GRID */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-14 lg:px-6 lg:py-[80px]">
          {members.length === 0 ? (
            <div className="mx-auto max-w-[480px] rounded-2xl bg-white px-8 py-10 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              <div className="text-[20px] font-bold text-ink-900">
                No public member pages right now
              </div>
              <div className="mt-2 text-[15px]/[1.7] text-ink-600">
                Members choose when to share their journey. You can still give
                to the mission today.
              </div>
              <Link
                href="/donate"
                className="mt-5 inline-flex h-[50px] items-center rounded-full bg-blue-primary px-8 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
              >
                Give to My Struggle
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m, i) => {
                const featured = i === 0 && m.slug === "danielle";
                const r = m.request;
                const pct = r
                  ? Math.min(
                      100,
                      Math.round(
                        (r.raised / Math.max(1, r.weeklyTarget)) * 100
                      )
                    )
                  : 0;
                return (
                  <Link
                    key={m.slug}
                    href={`/p/${encodeURIComponent(m.slug)}${qs}`}
                    className={
                      "flex flex-col gap-4 rounded-2xl bg-white px-7 py-8 hover:bg-sky-tint " +
                      (featured
                        ? "border-t-[3px] border-blue-primary shadow-[0_6px_20px_rgba(46,124,214,.15)]"
                        : "border-t-[3px] border-transparent shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:border-blue-primary")
                    }
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-[22px] font-extrabold text-white shadow-[0_2px_8px_rgba(11,37,69,.15)]"
                        style={{ backgroundColor: m.avatarColor }}
                      >
                        {(m.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[20px] font-extrabold tracking-[-0.01em] text-ink-900">
                            {m.name}
                          </span>
                          {featured && (
                            <span className="inline-flex h-[22px] flex-none items-center rounded-full bg-indigo-brand px-2.5 text-[10px] font-bold text-white">
                              Featured
                            </span>
                          )}
                        </div>
                        {m.memberNumber && (
                          <div className="mt-1 inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-bold text-blue-primary">
                            Member #{m.memberNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    {r ? (
                      <div>
                        <div className="flex justify-between gap-2 text-[13px] font-semibold text-ink-900">
                          <span className="truncate">{r.label} · weekly</span>
                          <span className="tnum flex-none text-blue-primary">
                            {money(r.raised)} / {money(r.weeklyTarget)}
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sky-tint">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#4E5B9B,#2E7CD6)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[13px]/[1.6] text-ink-600">
                        No active goal this week - gifts go straight to their
                        balances.
                      </div>
                    )}

                    <span className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-bold text-blue-primary">
                      Give to {m.name}{" "}
                      <Heart size={12} fill="currentColor" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-9 text-center text-[13px] font-medium text-ink-600">
            Every story here is shared with the member&apos;s consent.{" "}
            <Link href="/giving" className="font-bold text-blue-primary">
              How giving works →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
