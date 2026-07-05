"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Resume, ResumeSection } from "../../lib/types";
import ResumeDoc from "../ResumeDoc";

/**
 * /resume/print — print-optimized view of the member's résumé.
 * Renders ONLY the document: no nav, no PrototypeMap, white background,
 * @media print margins. "Download PDF" on /resume opens this route with
 * ?auto=1, which triggers window.print() — the browser's Save-as-PDF is
 * the PDF export (a pdf library is a later upgrade).
 */

type LoadState =
  | { status: "loading" }
  | { status: "unauthed" }
  | { status: "ready"; resume: Resume; sections: ResumeSection[] };

export default function ResumePrintPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/resumes");
        if (!alive) return;
        if (res.status === 401) {
          setState({ status: "unauthed" });
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setState({
          status: "ready",
          resume: data.resume as Resume,
          sections: (data.sections ?? []) as ResumeSection[],
        });
      } catch {
        // stay on loading; user can refresh
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Auto-open the print dialog when arriving via the Download PDF button.
  useEffect(() => {
    if (state.status !== "ready") return;
    const auto = new URLSearchParams(window.location.search).get("auto");
    if (auto === "1") {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [state.status]);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          @page { margin: 14mm; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* Screen-only toolbar — hidden when printing */}
      <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3 px-5 py-4 print:hidden">
        <Link
          href="/resume"
          className="text-[13.5px] font-bold text-blue-primary hover:underline"
        >
          ← Back to builder
        </Link>
        {state.status === "ready" && (
          <button
            onClick={() => window.print()}
            className="h-[44px] cursor-pointer rounded-full bg-blue-primary px-6 text-[14px] font-extrabold text-white hover:bg-blue-hover"
          >
            Print / Save as PDF
          </button>
        )}
      </div>

      {state.status === "loading" && (
        <div className="py-24 text-center text-[14px] font-semibold text-ink-400 print:hidden">
          Preparing your résumé…
        </div>
      )}

      {state.status === "unauthed" && (
        <div className="mx-auto max-w-[440px] px-5 py-20 text-center print:hidden">
          <p className="text-[15px]/[1.7] font-medium text-ink-600">
            Sign in to see your résumé.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex h-[48px] items-center justify-center rounded-full bg-blue-primary px-8 text-[15px] font-extrabold text-white hover:bg-blue-hover"
          >
            Sign in
          </Link>
        </div>
      )}

      {state.status === "ready" && (
        <div className="px-5 pb-16 print:p-0">
          <ResumeDoc resume={state.resume} sections={state.sections} />
        </div>
      )}
    </div>
  );
}
