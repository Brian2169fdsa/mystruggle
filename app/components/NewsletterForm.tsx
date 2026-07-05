"use client";

import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Footer newsletter signup (client island inside the server-component Footer).
 * POSTs to /api/newsletter; shows a success-green confirmation or an inline
 * error while keeping the footer's pill input + Join button styling.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (status === "done") {
    return (
      <div className="mt-4 flex h-12 items-center rounded-full border border-success/50 bg-success/10 px-5 text-[14px] font-semibold text-success">
        You&rsquo;re close. First letter next month.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setStatus("busy");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      const data = await res.json().catch(() => null);
      setError(
        res.status === 409
          ? "You're already on the list — first letter next month."
          : (data?.error ?? "Something went wrong. Please try again."),
      );
      setStatus("idle");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="mt-4 flex gap-2.5">
        <input
          type="email"
          name="email"
          autoComplete="email"
          aria-label="Email address"
          placeholder="Email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          className="h-12 min-w-0 flex-1 rounded-full border border-white/30 bg-transparent px-5 text-[14px] text-white placeholder:text-white/50 focus:border-white/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "busy"}
          className="inline-flex h-12 cursor-pointer items-center rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white hover:bg-blue-hover disabled:opacity-60"
        >
          {status === "busy" ? "…" : "Join"}
        </button>
      </div>
      {error && (
        <div className="mt-2.5 text-[13px] font-medium text-[#FFB4B8]" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}
