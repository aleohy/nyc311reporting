import { canProceedToSubmit } from "@/lib/verification";
import type { ReportDraft } from "@/types/report";

export function canSubmitDraft(draft: ReportDraft): boolean {
  const blocking = draft.trustChecks.some(
    (check) => !check.passed && check.severity === "error",
  );
  if (blocking) {
    return false;
  }

  const identificationConfirmed = Boolean(draft.identificationVerification?.confirmed);
  return canProceedToSubmit(draft, identificationConfirmed).ok;
}
