"use client";

// Short board-member application. Deliberately brief (name, contact, a few
// interest fields) - NOT the generic centers demo form. Posts to the shared
// /api/leads queue with source "board-application" so staff see it distinctly,
// packing the board-specific answers into the message.

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const MAILTO =
  "mailto:info@themystruggles.com?subject=Board%20Member%20Application";

const FIELD =
  "h-[52px] w-full rounded-xl border border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25";

const HELP_AREAS = [
  "Fundraising / Development",
  "Legal",
  "Healthcare / Treatment",
  "Faith organizations",
  "Housing / Real Estate",
  "Finance / HR",
  "Lived experience of recovery or reentry",
  "Media / Marketing",
];

export default function BoardForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [areas, setAreas] = useState<string[]>([]);

  function toggleArea(area: string) {
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const fullName = String(data.get("fullName") ?? "").trim();
    const preferred = String(data.get("preferred") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const employer = String(data.get("employer") ?? "").trim();
    const title = String(data.get("title") ?? "").trim();
    const why = String(data.get("why") ?? "").trim();

    const next: Record<string, string> = {};
    if (!fullName) next.fullName = "Please tell us your name.";
    if (!email) next.email = "We need an email to reach you.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "That email doesn't look right.";
    if (!why) next.why = "A sentence or two is plenty - why the board?";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setErrors({});
    setStatus("submitting");

    // Board-specific answers ride the message field so the shared leads queue
    // needs no schema change; staff filter on source "board-application".
    const message = [
      preferred ? `Preferred name: ${preferred}` : "",
      employer || title
        ? `Work: ${[title, employer].filter(Boolean).join(" at ")}`
        : "",
      areas.length ? `Can help with: ${areas.join(", ")}` : "",
      `Why the board: ${why}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Board applicants have no "org"; label it so the queue reads clearly.
          orgName: employer || "Board applicant",
          contactName: fullName,
          email,
          phone: phone || undefined,
          message,
          source: "board-application",
        }),
      });
      if (!res.ok) throw new Error("failed");
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!json?.ok) throw new Error("not acknowledged");
      form.reset();
      setAreas([]);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-sky-tint-2 bg-sky-tint px-6 py-12 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-primary text-[26px] font-extrabold text-white">
          ✓
        </div>
        <div className="text-[22px] font-bold text-ink-900">
          Thank you for stepping up.
        </div>
        <p className="max-w-[440px] text-[15px]/[1.7] text-ink-600">
          We received your board application. A member of our team will reach
          out to talk about serving together. It means a lot.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {status === "error" && (
        <div
          className="rounded-xl border border-amber-bg bg-amber-bg px-4 py-3.5 text-[14px]/[1.6] font-semibold text-amber-ink"
          role="alert"
        >
          Something went wrong sending your application. Please email us at{" "}
          <a href={MAILTO} className="font-bold underline">
            info@themystruggles.com
          </a>{" "}
          and we&apos;ll take it from there.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">Full name</span>
          <input
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            className={FIELD}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <span className="text-[12px] font-semibold text-heart-red">
              {errors.fullName}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">
            Preferred first name{" "}
            <span className="font-medium text-ink-400">(optional)</span>
          </span>
          <input
            name="preferred"
            type="text"
            autoComplete="given-name"
            placeholder="What we should call you"
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            className={FIELD}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <span className="text-[12px] font-semibold text-heart-red">
              {errors.email}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">
            Cell phone{" "}
            <span className="font-medium text-ink-400">(optional)</span>
          </span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(555) 555-5555"
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">
            Employer{" "}
            <span className="font-medium text-ink-400">(optional)</span>
          </span>
          <input
            name="employer"
            type="text"
            autoComplete="organization"
            placeholder="Where you work"
            className={FIELD}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">
            Job title{" "}
            <span className="font-medium text-ink-400">(optional)</span>
          </span>
          <input
            name="title"
            type="text"
            autoComplete="organization-title"
            placeholder="Your role"
            className={FIELD}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ink-900">
          Why do you want to serve on our board?
        </span>
        <textarea
          name="why"
          rows={4}
          placeholder="A sentence or two on what draws you to this work and what you hope to contribute."
          className="w-full rounded-xl border border-sky-tint-2 bg-white px-4 py-3 text-[15px]/[1.6] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25"
          aria-invalid={!!errors.why}
        />
        {errors.why && (
          <span className="text-[12px] font-semibold text-heart-red">
            {errors.why}
          </span>
        )}
      </label>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="text-[13px] font-bold text-ink-900">
          Where can you help?{" "}
          <span className="font-medium text-ink-400">(check any)</span>
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HELP_AREAS.map((area) => {
            const on = areas.includes(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                aria-pressed={on}
                className={
                  "flex min-h-[48px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[14px] font-semibold transition-colors " +
                  (on
                    ? "border-blue-primary bg-sky-tint text-blue-primary"
                    : "border-sky-tint-2 bg-white text-ink-600 hover:bg-canvas")
                }
              >
                <span
                  className={
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[12px] font-bold " +
                    (on
                      ? "border-blue-primary bg-blue-primary text-white"
                      : "border-sky-tint-2 bg-white text-transparent")
                  }
                  aria-hidden
                >
                  ✓
                </span>
                {area}
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="text-[12.5px]/[1.6] font-medium text-ink-400">
        We may conduct a background check on prospective board members. By
        submitting, you certify this information is accurate.
      </p>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover disabled:opacity-70 sm:w-auto"
        >
          {status === "submitting" ? "Sending…" : "Submit application"}
        </button>
        <span className="text-[13px] font-medium text-ink-600">
          Prefer email?{" "}
          <a href={MAILTO} className="font-bold text-blue-primary">
            info@themystruggles.com
          </a>
        </span>
      </div>
    </form>
  );
}
