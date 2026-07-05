"use client";

import { useState } from "react";

const AREA_DEFS = [
  { key: "addiction", label: "Addiction & recovery" },
  { key: "homelessness", label: "Homelessness" },
  { key: "incarceration", label: "Incarceration & reentry" },
  { key: "employment", label: "Employment" },
  { key: "housing", label: "Housing" },
] as const;

const AVAIL_DEFS = [
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Every other week" },
  { key: "flexible", label: "Flexible" },
] as const;

const FIELD_LABEL = "mb-2 text-[13px] font-bold text-ink-900";
const FIELD_INPUT =
  "box-border h-[52px] w-full rounded-[14px] border-[1.5px] border-sky-tint bg-canvas px-[18px] text-[15px] text-ink-900 placeholder:text-ink-400";

/**
 * Mentor application card — ports the prototype's DCLogic Component state:
 * lived-experience multi-select chips, availability radio pills, and the
 * submitted → success view with "Back to the form".
 */
export default function MentorForm() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<Record<string, boolean>>({
    addiction: true,
  });
  const [availability, setAvailability] = useState<string>("weekly");

  return (
    <div className="flex flex-col gap-[22px] rounded-2xl bg-white px-12 py-11 shadow-[0_4px_20px_rgba(11,37,69,.08)]">
      {submitted ? (
        <div className="flex flex-col items-center gap-3.5 py-10 text-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#E8F8F0] text-[30px] font-extrabold text-success">
            ✓
          </div>
          <div className="text-[24px] font-extrabold tracking-[-0.02em] text-ink-900">
            Thank you — we&apos;ll call you.
          </div>
          <div className="max-w-[340px] text-[15px]/[1.7] text-ink-600">
            A Laveen Center coordinator will reach out within one week.
            It&apos;s a conversation, not a screening.
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-2 inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary bg-transparent px-6 text-[14px] font-bold text-blue-primary"
          >
            Back to the form
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-[22px]">
          <div className="grid grid-cols-2 gap-[18px]">
            <div>
              <div className={FIELD_LABEL}>Full name</div>
              <input placeholder="Your name" className={FIELD_INPUT} />
            </div>
            <div>
              <div className={FIELD_LABEL}>Phone</div>
              <input placeholder="(602) 555-0100" className={FIELD_INPUT} />
            </div>
          </div>
          <div>
            <div className={FIELD_LABEL}>Email</div>
            <input placeholder="you@example.com" className={FIELD_INPUT} />
          </div>

          <div>
            <div className={FIELD_LABEL}>
              Lived-experience areas{" "}
              <span className="text-[12px] font-normal text-ink-600">
                — select all that apply
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {AREA_DEFS.map((d) => {
                const on = !!selectedAreas[d.key];
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() =>
                      setSelectedAreas((s) => ({ ...s, [d.key]: !s[d.key] }))
                    }
                    className={
                      "inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] px-5 text-[14px] font-bold " +
                      (on
                        ? "border-blue-primary bg-sky-tint text-blue-primary"
                        : "border-[#E2E8F0] bg-white text-ink-600")
                    }
                  >
                    {on ? `✓ ${d.label}` : d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className={FIELD_LABEL}>Availability</div>
            <div className="flex flex-wrap gap-2.5">
              {AVAIL_DEFS.map((d) => {
                const on = availability === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setAvailability(d.key)}
                    className={
                      "inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] px-[22px] text-[14px] font-bold " +
                      (on
                        ? "border-blue-primary bg-sky-tint text-blue-primary"
                        : "border-[#E2E8F0] bg-white text-ink-600")
                    }
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className={FIELD_LABEL}>
              Tell us a little about your story{" "}
              <span className="text-[12px] font-normal text-ink-600">
                — optional
              </span>
            </div>
            <textarea
              placeholder="Share as much or as little as you like…"
              className="box-border h-[110px] w-full resize-y rounded-[14px] border-[1.5px] border-sky-tint bg-canvas px-[18px] py-3.5 text-[15px]/[1.6] text-ink-900 placeholder:text-ink-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-blue-primary text-[16px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
          >
            Apply to mentor
          </button>
          <div className="text-center text-[12px] text-ink-600">
            A coordinator will call within one week. Background check required
            before matching.
          </div>
        </div>
      )}
    </div>
  );
}
