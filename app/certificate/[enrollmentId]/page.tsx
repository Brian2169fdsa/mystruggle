// /certificate/[enrollmentId] - a print-quality Certificate of Completion.
// Server component: loads the enrollment + program + member straight from the
// store. Access: the member the certificate belongs to, or staff. Everyone
// else gets a warm not-found (never a hint the certificate exists). No Nav -
// just the certificate and a screen-only toolbar (print pattern follows
// /resume/print).

import Link from "next/link";
import { db } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { LevelOfCare } from "@/app/lib/types";
import PrintToolbar from "./PrintToolbar";

const LOC_LINE: Record<LevelOfCare, string> = {
  detox: "Detox Level of Care",
  residential: "Residential Level of Care",
  php: "Partial Hospitalization Program",
  iop: "Intensive Outpatient Program",
  op: "Outpatient Program",
  recovery_maintenance: "Recovery Maintenance Program",
  custom: "Center Program",
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Warm dead-end - same card whether the certificate is missing or simply
 *  not this viewer's to see. */
function WarmNotFound({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[460px] px-5 py-24 text-center">
        <div className="text-[40px]">🎓</div>
        <h1 className="mt-3 text-[22px] font-extrabold tracking-[-0.01em] text-ink-900">
          We couldn&apos;t find that certificate
        </h1>
        <p className="mt-3 text-[15px]/[1.7] font-medium text-ink-600">
          Certificates are personal - each one belongs to the person who earned
          it. If this one is yours, sign in and try the link again.
        </p>
        <Link
          href={signedIn ? "/" : "/login"}
          className="mt-6 inline-flex h-[48px] items-center justify-center rounded-full bg-blue-primary px-8 text-[15px] font-extrabold text-white hover:bg-blue-hover"
        >
          {signedIn ? "Back to My Struggle" : "Sign in"}
        </Link>
      </div>
    </div>
  );
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  const viewer = await getSessionUser();
  const d = db();

  const enrollment = d.programEnrollments.find((e) => e.id === enrollmentId);
  const program = enrollment
    ? d.programs.find((p) => p.id === enrollment.programId)
    : undefined;
  const member = enrollment
    ? d.users.find((u) => u.id === enrollment.memberId)
    : undefined;

  // Access rule: the member themselves, or staff. Everyone else (including
  // signed-out visitors and other members) gets the same warm not-found.
  const allowed =
    !!viewer &&
    !!enrollment &&
    (viewer.role === "staff" || viewer.id === enrollment.memberId);
  if (!allowed || !enrollment || !program || !member) {
    return <WarmNotFound signedIn={!!viewer} />;
  }

  const backHref = viewer.role === "staff" ? "/dashboard" : "/member-app";

  // A certificate marks a finished journey - until then, a warm placeholder.
  if (enrollment.status !== "completed" || !enrollment.completedAt) {
    return (
      <div className="min-h-screen bg-white">
        <PrintToolbar backHref={backHref} />
        <div className="mx-auto max-w-[460px] px-5 py-20 text-center">
          <div className="text-[40px]">{program.badge ?? "🎓"}</div>
          <h1 className="mt-3 text-[22px] font-extrabold tracking-[-0.01em] text-ink-900">
            This certificate is still being earned
          </h1>
          <p className="mt-3 text-[15px]/[1.7] font-medium text-ink-600">
            {member.name} is still walking {program.title}. The certificate
            appears here the day the program is completed - and it will be
            worth the wait.
          </p>
        </div>
      </div>
    );
  }

  const center =
    d.centers.find((c) => c.id === (program.centerId ?? member.centerId)) ??
    null;
  const locLine = LOC_LINE[program.levelOfCare] ?? LOC_LINE.custom;
  // Seed badges are text labels ("IOP Core Graduate"); centers may also set a
  // single emoji. Render an emoji big, a label as a dignified pill.
  const badgeIsEmoji =
    !!program.badge && /^\p{Extended_Pictographic}/u.test(program.badge);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { background: #fff !important; }
        }
      `}</style>

      <PrintToolbar backHref={backHref} />

      {/* ── the certificate ─────────────────────────────────────────── */}
      <div className="px-5 pb-16 print:p-0">
        <div className="mx-auto max-w-[900px] border-[3px] border-navy-deep p-[6px]">
          <div className="border border-navy-deep px-8 py-12 text-center sm:px-14 sm:py-14">
            {/* badge (emoji renders large; a text badge becomes a pill below) */}
            {program.badge && badgeIsEmoji && (
              <div className="text-[44px] leading-none">{program.badge}</div>
            )}

            <div
              className={
                "text-[11px] font-bold uppercase tracking-[.28em] text-ink-600 " +
                (program.badge && badgeIsEmoji ? "mt-5" : "")
              }
            >
              {center?.name ?? "My Struggle"}
            </div>

            <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.01em] text-navy-deep sm:text-[36px]">
              Certificate of Completion
            </h1>
            <div className="hairline mx-auto mt-4 w-[120px]" />

            <p className="mt-8 text-[14px] font-semibold uppercase tracking-[.14em] text-ink-600">
              This certifies that
            </p>

            {/* member first name, LARGE - the one script accent */}
            <div className="script mt-2 text-[72px] sm:text-[88px]">
              {member.name}
            </div>

            <p className="mx-auto mt-4 max-w-[560px] text-[15px]/[1.7] font-medium text-ink-600">
              has completed every step of the journey through
            </p>
            <div className="mt-2 text-[24px] font-extrabold tracking-[-0.01em] text-ink-900 sm:text-[28px]">
              {program.title}
            </div>
            <div className="mt-1.5 text-[14px] font-semibold text-ink-600">
              {locLine}
            </div>
            {program.badge && !badgeIsEmoji && (
              <div className="mt-3 inline-flex h-[26px] items-center rounded-full bg-[#F0EDFB] px-3 text-[12px] font-bold text-indigo-brand">
                🎓 {program.badge}
              </div>
            )}

            <div className="mt-8 text-[14px] font-semibold text-ink-900">
              Completed on {fmtDate(enrollment.completedAt)}
            </div>
            {center && (
              <div className="mt-1 text-[13px] font-medium text-ink-600">
                {center.name} · {center.city}
              </div>
            )}

            {/* signature line */}
            <div className="mx-auto mt-14 w-[260px] border-t-[1.5px] border-ink-900 pt-2 text-[12px] font-bold uppercase tracking-[.12em] text-ink-600">
              Program Director
            </div>

            {/* brand wordmark */}
            <div className="mt-10 text-[13px] font-extrabold uppercase tracking-[.22em] text-indigo-brand">
              My Struggle
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
