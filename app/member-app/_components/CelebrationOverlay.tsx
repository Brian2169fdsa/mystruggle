"use client";

// ~10 blue + gold confetti pieces, positions from the prototype.
const CONFETTI: {
  top: number;
  left?: number;
  right?: number;
  w: number;
  h: number;
  bg: string;
  rotate?: number;
  round?: boolean;
}[] = [
  { top: 60, left: 40, w: 10, h: 10, bg: "#2E7CD6", rotate: 25 },
  { top: 110, right: 60, w: 8, h: 14, bg: "#EAB308", rotate: -30 },
  { top: 180, left: 90, w: 12, h: 6, bg: "#EAB308", rotate: 60 },
  { top: 90, left: 200, w: 8, h: 8, bg: "#8FBCF0", round: true },
  { top: 220, right: 110, w: 10, h: 10, bg: "#4E5B9B", rotate: 45 },
  { top: 150, right: 30, w: 8, h: 8, bg: "#EAB308", round: true },
  { top: 250, left: 40, w: 6, h: 12, bg: "#2E7CD6", rotate: -15 },
  { top: 60, left: 300, w: 12, h: 6, bg: "#8FBCF0", rotate: 30 },
  { top: 300, right: 50, w: 8, h: 8, bg: "#EAB308", rotate: 20 },
  { top: 330, left: 120, w: 8, h: 8, bg: "#2E7CD6", round: true },
];

export default function CelebrationOverlay({
  shareWin,
  keepPrivate,
  courseTitle = "ISE Course 3 - Decision",
  streakDay = 12,
}: {
  shareWin: () => void;
  keepPrivate: () => void;
  /** Real course/streak when signed in; defaults = the styled demo. */
  courseTitle?: string;
  streakDay?: number;
}) {
  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[rgba(11,37,69,.78)]">
      {CONFETTI.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: c.top,
            left: c.left,
            right: c.right,
            width: c.w,
            height: c.h,
            background: c.bg,
            borderRadius: c.round ? 999 : undefined,
            transform: c.rotate ? `rotate(${c.rotate}deg)` : undefined,
          }}
        />
      ))}

      <div className="absolute left-6 right-6 top-[240px] rounded-2xl bg-white px-7 py-9 text-center shadow-[0_24px_60px_rgba(11,37,69,.5)]">
        <div className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] border-gold-badge bg-gold-bg text-[34px] font-extrabold text-gold-ink">
          ◆
        </div>
        <div className="mt-[18px] text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Lesson complete!
        </div>
        <div className="mt-2 text-[15px]/[1.6] font-medium text-ink-600">
          {courseTitle}
          <br />
          <span className="text-[15px] font-extrabold text-blue-primary">
            +10 points
          </span>{" "}
          · streak kept:{" "}
          <span className="text-[15px] font-extrabold text-gold-ink">
            day {streakDay}
          </span>
        </div>
        <div className="mt-[22px] text-[15px] font-bold text-ink-900">
          Share your win?
        </div>
        <div className="mt-3 flex gap-2.5">
          <button
            type="button"
            onClick={shareWin}
            className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-full bg-blue-primary text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.35)] hover:bg-blue-hover"
          >
            ✓ Post
          </button>
          <button
            type="button"
            onClick={keepPrivate}
            className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-full border-[1.5px] border-[#E2E8F0] text-[15px] font-bold text-ink-600"
          >
            ✗ Keep private
          </button>
        </div>
        <div className="mt-3 text-[11px] text-ink-400">
          Nothing posts without you. You have 5 minutes to decide.
        </div>
      </div>
    </div>
  );
}
