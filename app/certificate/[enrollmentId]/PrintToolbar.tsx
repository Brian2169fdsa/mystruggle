"use client";

import Link from "next/link";

/**
 * Screen-only toolbar for the certificate page - hidden entirely when
 * printing (print:hidden). The tiny client island that owns window.print();
 * the certificate itself stays a server component.
 */
export default function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-3 px-5 py-4 print:hidden">
      <Link
        href={backHref}
        className="text-[13.5px] font-bold text-blue-primary hover:underline"
      >
        ← Back
      </Link>
      <button
        onClick={() => window.print()}
        className="h-[44px] cursor-pointer rounded-full bg-blue-primary px-6 text-[14px] font-extrabold text-white hover:bg-blue-hover"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}
