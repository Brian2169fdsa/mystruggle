"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const MAILTO =
  "mailto:info@themystruggles.com?subject=Demo%20request%20%E2%80%94%20My%20Struggle%20for%20Centers";

const FIELD =
  "h-[52px] w-full rounded-xl border border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25";

export default function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const orgName = String(data.get("orgName") ?? "").trim();
    const contactName = String(data.get("contactName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    // Client-side validation
    const next: Record<string, string> = {};
    if (!orgName) next.orgName = "Tell us the name of your center.";
    if (!contactName) next.contactName = "Who should we reach out to?";
    if (!email) next.email = "We need an email to get back to you.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "That email doesn't look right.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          contactName,
          email,
          phone: phone || undefined,
          message: message || undefined,
          source: "centers-page",
        }),
      });

      if (!res.ok) throw new Error("Request failed");
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean }
        | null;
      if (!json?.ok) throw new Error("Request not acknowledged");

      form.reset();
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
          Thanks - we&apos;ll reach out within two business days.
        </div>
        <p className="max-w-[440px] text-[15px]/[1.7] text-ink-600">
          A member of our team will follow up to schedule a walkthrough built
          around your programs and your census. Talk soon.
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
          Something went wrong sending your request. Please email us directly at{" "}
          <a href={MAILTO} className="font-bold underline">
            info@themystruggles.com
          </a>{" "}
          and we&apos;ll take it from there.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">
            Center / organization name
          </span>
          <input
            name="orgName"
            type="text"
            autoComplete="organization"
            placeholder="e.g. Desert Bloom Recovery"
            className={FIELD}
            aria-invalid={!!errors.orgName}
          />
          {errors.orgName && (
            <span className="text-[12px] font-semibold text-heart-red">
              {errors.orgName}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">
            Your name
          </span>
          <input
            name="contactName"
            type="text"
            autoComplete="name"
            placeholder="Full name"
            className={FIELD}
            aria-invalid={!!errors.contactName}
          />
          {errors.contactName && (
            <span className="text-[12px] font-semibold text-heart-red">
              {errors.contactName}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink-900">
            Work email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourcenter.org"
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
            Phone{" "}
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
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ink-900">
          What would you like to see?{" "}
          <span className="font-medium text-ink-400">(optional)</span>
        </span>
        <textarea
          name="message"
          rows={4}
          placeholder="Your programs, census size, and what you're hoping the platform can do."
          className="w-full rounded-xl border border-sky-tint-2 bg-white px-4 py-3 text-[15px]/[1.6] font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25"
        />
      </label>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover disabled:opacity-70 sm:w-auto"
        >
          {status === "submitting" ? "Sending…" : "Request a demo"}
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
