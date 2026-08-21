"use client";

import { getLeafDefinition } from "@/lib/311-catalog";
import { issueLabel, needsIdentificationConfirmation } from "@/lib/verification";
import type { ReportDraft } from "@/types/report";

interface IssueIdentificationPanelProps {
  draft: ReportDraft;
  confirmed: boolean;
  rejected: boolean;
  onConfirm: () => void;
  onReject: () => void;
  canContinue: boolean;
  continueLabel: string;
  onContinue: () => void;
  continuing: boolean;
}

export function IssueIdentificationPanel({
  draft,
  confirmed,
  rejected,
  onConfirm,
  onReject,
  canContinue,
  continueLabel,
  onContinue,
  continuing,
}: IssueIdentificationPanelProps) {
  const mustConfirm = needsIdentificationConfirmation(draft);
  const label = issueLabel(draft);
  const hint = draft.leafId ? getLeafDefinition(draft.leafId).descriptionHint : "";

  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold">Verify AI identification</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {mustConfirm
          ? "AI confidence is low or timed out. Confirm this is the right issue before filing."
          : "Quick check — is this the issue you are reporting?"}
      </p>

      <div className="mt-4 rounded-2xl border border-black/5 bg-slate-50 p-4">
        <p className="text-sm uppercase tracking-wide text-[var(--muted)]">We identified</p>
        <p className="mt-1 text-xl font-bold">{label}</p>
        {hint && <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p>}
        <p className="mt-2 text-sm text-[var(--muted)]">{draft.description}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Confidence: {Math.round(draft.confidence * 100)}%
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className={`btn ${confirmed ? "btn-primary" : "btn-secondary"}`}
          onClick={onConfirm}
        >
          Yes, that is correct
        </button>
        <button
          type="button"
          className={`btn ${rejected ? "btn-primary" : "btn-secondary"}`}
          onClick={onReject}
        >
          No, I will change it
        </button>
      </div>

      {confirmed && (
        <div className="mt-4 rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/5 p-4">
          <p className="text-sm font-medium text-[var(--success)]">
            Issue identification confirmed.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Trust-check reminders below are cleared. Continue when the description and address look
            right.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4 w-full sm:w-auto"
            disabled={!canContinue || continuing}
            onClick={onContinue}
          >
            {continueLabel}
          </button>
        </div>
      )}
      {rejected && (
        <p className="mt-3 text-sm text-[var(--warning)]">
          Update the category or description above, then tap &quot;Yes, that is correct&quot;.
        </p>
      )}
    </section>
  );
}
