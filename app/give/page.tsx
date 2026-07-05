"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /give now redirects to the real dynamic giving page at /p/danielle.
 * All existing links to /give keep working; donors land on the live page.
 */
export default function GivePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/p/danielle");
  }, [router]);

  return (
    <div className="flex min-h-screen justify-center bg-[#E8EDF4]">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col items-center justify-center gap-4 bg-canvas px-7 text-center shadow-[0_0_60px_rgba(11,37,69,.12)]">
        <div className="photo-ph h-[104px] w-[104px] animate-pulse rounded-full border-[3px] border-white shadow-[0_4px_14px_rgba(11,37,69,.15)]" />
        <div className="text-[15px] font-semibold text-ink-600">
          Taking you to Danielle&apos;s page…
        </div>
      </div>
    </div>
  );
}
