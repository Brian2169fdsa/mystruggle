"use client";

export type Mode = "inperson" | "phone" | "video";
export type Duration = "15" | "30" | "45" | "60";

export const MODE_LABEL: Record<Mode, string> = {
  inperson: "in person",
  phone: "phone",
  video: "video",
};

export const durationLabel = (d: Duration) => (d === "60" ? "1 hr+" : `${d} min`);

const MODES: { key: Mode; label: string }[] = [
  { key: "inperson", label: "In person" },
  { key: "phone", label: "Phone" },
  { key: "video", label: "Video" },
];

const DURATIONS: Duration[] = ["15", "30", "45", "60"];

/* Selected pill = 2px blue border + sky-tint + blue bold; idle = 1.5px gray. */
const pill = (on: boolean) =>
  "box-border inline-flex h-12 flex-1 cursor-pointer items-center justify-center rounded-full text-sm " +
  (on
    ? "border-2 border-blue-primary bg-sky-tint font-bold text-blue-primary"
    : "border-[1.5px] border-[#E2E8F0] bg-white font-semibold text-ink-600");

/** Session-log bottom sheet: 24px top radius, drag handle, scrim tap = cancel. */
export default function LogSheet({
  name,
  mode,
  duration,
  note,
  onMode,
  onDuration,
  onNote,
  onSave,
  onClose,
}: {
  name: string;
  mode: Mode;
  duration: Duration;
  note: string;
  onMode: (m: Mode) => void;
  onDuration: (d: Duration) => void;
  onNote: (n: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(11,37,69,.5)]"
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-6 pb-[34px] pt-3.5 shadow-[0_-16px_50px_rgba(11,37,69,.3)]">
        <div className="mx-auto h-[5px] w-11 rounded-full bg-[#E2E8F0]" />
        <div className="mt-[18px] text-[20px] font-extrabold tracking-[-0.02em] text-ink-900">
          Log a session with {name}
        </div>

        <div className="mt-5 text-xs font-bold tracking-[.12em] text-blue-primary">
          HOW DID YOU MEET?
        </div>
        <div className="mt-2.5 flex gap-2.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => onMode(m.key)}
              className={pill(mode === m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-5 text-xs font-bold tracking-[.12em] text-blue-primary">
          HOW LONG?
        </div>
        <div className="mt-2.5 flex gap-2.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => onDuration(d)}
              className={pill(duration === d)}
            >
              {durationLabel(d)}
            </button>
          ))}
        </div>

        <div className="mt-5 text-xs font-bold tracking-[.12em] text-blue-primary">
          NOTE{" "}
          <span className="text-[11px] font-normal tracking-normal text-ink-400">
            - optional, staff-visible
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Anything worth remembering? (optional)"
          aria-label="Session note (optional)"
          className="mt-2.5 min-h-[84px] w-full resize-none rounded-[14px] border-[1.5px] border-sky-tint bg-canvas px-4 py-3.5 text-sm/[1.6] font-normal text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
        />

        <button
          onClick={onSave}
          className="mt-[22px] flex h-14 w-full cursor-pointer items-center justify-center rounded-full bg-blue-primary text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
        >
          Save session · +15 points for {name}
        </button>
        <button
          onClick={onClose}
          className="mt-3 w-full cursor-pointer text-center text-xs font-normal text-ink-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
