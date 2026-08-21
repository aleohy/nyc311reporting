import { getLeafDefinition } from "@/lib/311-catalog";
import { resolveDraftLeafId } from "@/lib/issue-fields";
import type { FixVerificationStatus, ReportDraft, TrustCheckResult } from "@/types/report";

export const GENERIC_FALLBACK_DESCRIPTION =
  "Vehicle appears illegally parked at this location.";

const REVIEW_CHECKS_RESOLVED_BY_CONFIRMATION = new Set([
  "confidence",
  "ai_fallback",
  "exif_gps",
  "location_fallback",
]);

export function needsIdentificationConfirmation(draft: ReportDraft): boolean {
  void draft;
  return false;
}

export function isGenericFallbackDescription(description: string): boolean {
  return description.trim() === GENERIC_FALLBACK_DESCRIPTION;
}

export function needsDescriptionEdit(draft: ReportDraft): boolean {
  return !draft.description?.trim() || draft.description.trim().length < 10;
}

export function missingIssueFieldLabels(draft: ReportDraft): string[] {
  void draft;
  return [];
}

export function resolveTrustChecksForDisplay(
  checks: TrustCheckResult[],
  identificationConfirmed: boolean,
): TrustCheckResult[] {
  if (!identificationConfirmed) {
    return checks;
  }

  return checks.map((check) => {
    if (!REVIEW_CHECKS_RESOLVED_BY_CONFIRMATION.has(check.id) || check.severity !== "warning") {
      return check;
    }

    return {
      ...check,
      passed: true,
      severity: "info",
      message: `${check.message} You confirmed this on review.`,
    };
  });
}

export function canProceedToSubmit(
  draft: ReportDraft,
  identificationConfirmed: boolean,
): { ok: boolean; reason?: string } {
  void identificationConfirmed;
  if (!draft.categoryConfirmed || !draft.leafId) {
    return { ok: false, reason: "Pick a complaint category first." };
  }

  if (needsDescriptionEdit(draft)) {
    return {
      ok: false,
      reason: "Add a short description before continuing.",
    };
  }

  return { ok: true };
}

export function fixStatusLabel(status: FixVerificationStatus): string {
  switch (status) {
    case "fixed":
      return "Fixed";
    case "not_fixed":
      return "Still there";
    case "partial":
      return "Partially fixed";
    default:
      return "Not checked yet";
  }
}

export function fixStatusDescription(status: FixVerificationStatus): string {
  switch (status) {
    case "fixed":
      return "The issue appears resolved at this location.";
    case "not_fixed":
      return "The issue still appears to be present.";
    case "partial":
      return "Some improvement, but the issue is not fully resolved.";
    default:
      return "Return later with a follow-up photo to confirm whether the city fixed it.";
  }
}

export function issueLabel(draft: ReportDraft): string {
  const leafId = resolveDraftLeafId(draft);
  if (leafId) {
    return getLeafDefinition(leafId).label;
  }
  return draft.issueType?.replaceAll("_", " ") || "Unknown issue";
}
