"use client";

import { useState } from "react";

import type { ComplaintLeafId } from "@/lib/311-catalog";
import type { FeedbackCategory } from "@/types/report";

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: "wrong_category", label: "The suggested category was wrong" },
  { value: "missing_field", label: "A form field is missing or wrong" },
  { value: "bug", label: "Something is broken" },
  { value: "idea", label: "I have an idea" },
  { value: "other", label: "Something else" },
];

const MAX_MESSAGE_LENGTH = 2000;

export function FeedbackForm({
  reportId,
  leafId,
  className = "card p-5",
  hideIntro = false,
}: {
  reportId?: string;
  leafId?: ComplaintLeafId;
  className?: string;
  hideIntro?: boolean;
}) {
  const [category, setCategory] = useState<FeedbackCategory>("wrong_category");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitFeedback() {
    if (message.trim().length < 3) {
      setError("Tell us a little more first.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          email,
          reportId,
          leafId,
          pagePath: window.location.pathname,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not send feedback.");
      }

      setSent(true);
      setMessage("");
      setEmail("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send feedback.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <section className={className} aria-live="polite">
        <h2 className="text-lg font-semibold">Thanks — Got It</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your feedback was saved. It helps most when the category suggestions are wrong, since that
          is what we tune next.
        </p>
        <button type="button" className="btn btn-secondary mt-4" onClick={() => setSent(false)}>
          Send More Feedback
        </button>
      </section>
    );
  }

  return (
    <section className={className}>
      {!hideIntro && (
        <>
          <h2 className="text-lg font-semibold">Send Feedback</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Tell us what went wrong or what would help. This goes to us, not to NYC311 — it will not
            affect your complaint.
          </p>
        </>
      )}

      <div className={`${hideIntro ? "" : "mt-4 "}grid gap-5`}>
        <div className="field">
          <label htmlFor="feedback-category">What is this about?</label>
          <select
            id="feedback-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="feedback-message">Details *</label>
          <textarea
            id="feedback-message"
            rows={4}
            value={message}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="It suggested Blocked Hydrant but the car was in a bus lane."
            onChange={(event) => setMessage(event.target.value)}
          />
          <p className="tabular mt-1 text-xs text-[var(--muted)]">
            {MAX_MESSAGE_LENGTH - message.length} characters remaining
          </p>
        </div>

        <div className="field">
          <label htmlFor="feedback-email">Email (optional)</label>
          <input
            id="feedback-email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Only if you want a reply. Leave blank to stay anonymous.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-[var(--error)]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary mt-4"
        disabled={sending}
        onClick={() => void submitFeedback()}
      >
        {sending ? "Sending…" : "Send Feedback"}
      </button>
    </section>
  );
}
