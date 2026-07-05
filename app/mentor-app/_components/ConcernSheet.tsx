"use client";

/** Quiet "I'm concerned" bottom sheet — same shell as LogSheet, calmer
 *  voice. No alarm styling, no red: this is a hand on a shoulder, not a
 *  siren. The note goes to staff only and never appears on the member. */
export default function ConcernSheet({
  name,
  note,
  onNote,
  onSend,
  onClose,
  sending,
  needSignIn,
}: {
  name: string;
  note: string;
  onNote: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
  sending: boolean;
  needSignIn: boolean;
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
          I&apos;m concerned about {name}
        </div>
        <div className="mt-2 text-sm/[1.6] font-normal text-ink-600">
          Tell the care team what you&apos;re seeing. This stays between you
          and staff — never on {name}&apos;s profile.
        </div>

        <div className="mt-5 text-xs font-bold tracking-[.12em] text-blue-primary">
          WHAT YOU&apos;RE SEEING{" "}
          <span className="text-[11px] font-normal tracking-normal text-ink-400">
            — optional
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          rows={3}
          placeholder="A sentence or two is plenty."
          className="mt-2.5 w-full resize-none rounded-[14px] border-[1.5px] border-sky-tint bg-canvas px-4 py-3.5 text-sm/[1.6] font-normal text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary"
        />

        {needSignIn && (
          <div className="mt-3 rounded-[14px] bg-sky-tint px-4 py-3 text-center text-[13px] font-semibold text-ink-600">
            Sign in as a mentor first —{" "}
            <a href="/login" className="font-bold text-blue-primary">
              go to sign in
            </a>
          </div>
        )}

        <button
          onClick={onSend}
          disabled={sending}
          className="mt-[22px] flex h-14 w-full cursor-pointer items-center justify-center rounded-full bg-blue-primary text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send to care team"}
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
