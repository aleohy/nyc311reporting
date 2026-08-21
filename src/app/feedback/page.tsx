import { FeedbackForm } from "@/components/FeedbackForm";

export default function FeedbackPage() {
  return (
    <div className="page-shell max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        Feedback
      </p>
      <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Tell us what to fix</h1>
      <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
        This goes to us, not to NYC311. It will not change or file your complaint.
      </p>
      <div className="mt-8">
        <FeedbackForm hideIntro />
      </div>
    </div>
  );
}
