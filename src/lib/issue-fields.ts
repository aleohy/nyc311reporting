import {
  buildCopyPacket,
  composeHandoffDescription,
  emptyFieldsForLeaf,
  getFieldDefinitionsForLeaf,
  isComplaintLeafId,
  validateLeafFields,
  type CatalogFieldDefinition,
  type ComplaintLeafId,
} from "@/lib/311-catalog";
import { getIssueTypeDefinition } from "@/lib/constants";
import type { ReportDraft, StoredReport, StreetIssueType } from "@/types/report";

export interface IssueFieldDefinition {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  type: "text" | "select" | "tel";
  options?: { value: string; label: string }[];
  helpText?: string;
  page?: "what" | "where" | "details" | "contact";
}

export function resolveDraftLeafId(
  draft: Pick<ReportDraft, "leafId" | "issueType">,
): ComplaintLeafId | null {
  if (draft.leafId) return draft.leafId;
  if (draft.issueType && isComplaintLeafId(String(draft.issueType))) {
    return draft.issueType as ComplaintLeafId;
  }
  return null;
}

function catalogToIssueField(definition: CatalogFieldDefinition): IssueFieldDefinition {
  return {
    key: definition.key,
    label: definition.label,
    placeholder: definition.placeholder,
    required: definition.required,
    type: definition.type,
    options: definition.options,
    page: definition.page,
  };
}

export function getIssueFieldDefinitions(
  issueType: StreetIssueType | ComplaintLeafId,
): IssueFieldDefinition[] {
  if (isComplaintLeafId(String(issueType))) {
    return getFieldDefinitionsForLeaf(issueType as ComplaintLeafId).map(catalogToIssueField);
  }
  return LEGACY_ISSUE_FIELD_DEFINITIONS[issueType as StreetIssueType] || [];
}

export function emptyIssueFields(
  issueType: StreetIssueType | ComplaintLeafId,
): Record<string, string> {
  if (isComplaintLeafId(String(issueType))) {
    return emptyFieldsForLeaf(issueType as ComplaintLeafId);
  }
  const fields: Record<string, string> = {};
  for (const definition of getIssueFieldDefinitions(issueType)) {
    fields[definition.key] = definition.key === "plate_state" ? "NY" : "";
  }
  return fields;
}

export function compose311Description(
  issueType: StreetIssueType | ComplaintLeafId,
  fields: Record<string, string>,
  address: string,
  extraNotes = "",
): string {
  if (isComplaintLeafId(String(issueType))) {
    const base = composeHandoffDescription(issueType as ComplaintLeafId, fields, address);
    return extraNotes.trim() ? `${base} ${extraNotes.trim()}` : base;
  }
  return composeLegacyDescription(issueType as StreetIssueType, fields, address, extraNotes);
}

export function validateIssueFields(
  issueType: StreetIssueType | ComplaintLeafId,
  fields: Record<string, string> = {},
): { ok: boolean; missing: string[] } {
  if (isComplaintLeafId(String(issueType))) {
    return validateLeafFields(issueType as ComplaintLeafId, fields);
  }
  const missing = getIssueFieldDefinitions(issueType)
    .filter((definition) => definition.required && !fields[definition.key]?.trim())
    .map((definition) => definition.label);
  return { ok: missing.length === 0, missing };
}

export function buildDraftSummary(
  draft: Pick<ReportDraft, "leafId" | "issueType" | "address" | "location" | "description" | "issueFields">,
): string {
  const leafId = resolveDraftLeafId(draft);
  if (leafId) {
    const { summary } = buildCopyPacket(
      leafId,
      draft.issueFields || emptyFieldsForLeaf(leafId),
      draft.address.label,
      draft.location,
      draft.description,
    );
    return summary;
  }

  const issue = getIssueTypeDefinition(draft.issueType as StreetIssueType);
  const lines = [
    `Complaint type: ${issue.complaintType}`,
    `Issue: ${issue.label}`,
    `Address: ${draft.address.label}`,
    `Coordinates: ${draft.location.lat.toFixed(5)}, ${draft.location.lng.toFixed(5)}`,
    `Description: ${draft.description}`,
  ];
  return lines.join("\n");
}

function composeLegacyDescription(
  issueType: StreetIssueType,
  fields: Record<string, string>,
  address: string,
  extraNotes = "",
): string {
  const notes = extraNotes.trim();
  let base = "";

  switch (issueType) {
    case "illegal_parking_pavement":
      base = [
        `${fields.vehicle_color || "Unknown color"} ${fields.vehicle_make || "vehicle"}${fields.vehicle_model ? ` ${fields.vehicle_model}` : ""}`,
        `plate ${fields.license_plate || "unknown"}${fields.plate_state ? ` (${fields.plate_state})` : ""}`,
        `blocking ${fields.blocked_area || "sidewalk"}`,
        `at ${address}.`,
      ].join(" ");
      break;
    default:
      base = `Street issue at ${address}.`;
  }

  return notes ? `${base} ${notes}`.trim() : base.trim();
}

const LEGACY_ISSUE_FIELD_DEFINITIONS: Record<StreetIssueType, IssueFieldDefinition[]> = {
  illegal_parking_pavement: [],
  pothole: [],
  cave_in: [],
  street_flooding: [],
  broken_sidewalk: [],
  street_repair: [],
  catch_basin: [],
};

export function allIssueFieldKeys(): string[] {
  return [
    "datetime_observed",
    "recurring_problem",
    "address",
    "apartment",
    "vehicle_color",
    "vehicle_make",
    "vehicle_model",
    "license_plate",
    "plate_state",
    "first_name",
    "last_name",
    "email",
    "primary_phone",
    "contact_address_1",
    "contact_address_2",
    "contact_city",
    "contact_state",
    "contact_zip",
  ];
}

export function flattenIssueFields(
  report: Pick<StoredReport, "leafId" | "issueType" | "issueFields">,
): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const key of allIssueFieldKeys()) {
    flat[key] = report.issueFields?.[key]?.trim() || "";
  }
  return flat;
}
