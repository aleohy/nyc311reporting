import type { GeoPoint } from "@/types/report";

/** Official NYC 311 complaint leaf — parking iteration v1 */
export type ComplaintLeafId =
  | "parking_blocked_driveway"
  | "parking_double_parked"
  | "parking_blocked_bus_stop"
  | "parking_no_standing"
  | "parking_no_stopping"
  | "parking_blocked_bike_lane"
  | "parking_blocked_bus_lane"
  | "parking_blocked_crosswalk"
  | "parking_blocked_hydrant"
  | "parking_blocked_sidewalk"
  | "parking_blocked_accessible_space"
  | "parking_posted_sign_violation"
  | "parking_commercial_overnight"
  | "parking_city_vehicle_sidewalk";

export interface CatalogFieldDefinition {
  key: string;
  label: string;
  page: "what" | "where" | "details" | "contact";
  required: boolean;
  type: "text" | "select" | "tel";
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Shown under the field to explain how NYC311 treats it. */
  helpText?: string;
}

/**
 * The dropdown on NYC311's What step that pins down the exact violation.
 * Civilian forms expose "Problem Detail"; city-vehicle forms expose "Additional Details".
 */
export interface N311Selection {
  field: "Problem Detail" | "Additional Details";
  value: string;
}

/**
 * How this leaf maps onto the NYC Open Data 311 dataset (erm2-nwe9), used to
 * look up existing nearby reports. Verified against live descriptor values —
 * an invalid descriptor silently returns zero rows.
 */
export interface OpenDataQuery {
  complaintType: string;
  /**
   * Omit when the dataset has no descriptor matching this leaf; the lookup then
   * matches on complaint_type alone rather than returning nothing.
   */
  descriptors?: string[];
}

export interface ComplaintLeafDefinition {
  id: ComplaintLeafId;
  label: string;
  agency: string;
  openDataQuery: OpenDataQuery;
  formUrl: string;
  articleUrl: string;
  descriptionHint: string;
  /** Which dropdown value to choose on the NYC311 What step. */
  n311Selection?: N311Selection;
  /** Shared field keys for this leaf */
  fieldKeys: string[];
}

const FORM_BASE = "https://portal.311.nyc.gov/servicerequest-create/What";

/** Verified deep links from NYC311 portal (kasid = kasectionid from createServiceRequest). */
function formUrl(caid: string, kasid: string): string {
  return `${FORM_BASE}?caid=${caid}&kasid=${kasid}`;
}

/**
 * caid/kasid pairs captured from createServiceRequest() calls on
 * https://portal.311.nyc.gov/article/?kanumber=KA-01986
 */
const FORM_URLS = {
  illegalParking: formUrl(
    "5d0f9039-d4d6-e811-a96b-000d3a1c5716",
    "fb4f175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  blockedDriveway: formUrl(
    "f387cd9a-b143-ea11-a812-000d3a8c9bad",
    "0f50175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  doubleParked: formUrl(
    "d2b6d1a0-b143-ea11-a812-000d3a8c9bad",
    "1350175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  busStop: formUrl(
    "2b0ccaa6-b143-ea11-a812-000d3a8c9bad",
    "1750175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  noStanding: formUrl(
    "c644c2ac-b143-ea11-a812-000d3a8c9bad",
    "1b50175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  noStopping: formUrl(
    "adafcdb2-b143-ea11-a812-000d3a8c9bad",
    "1f50175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  bikeLane: formUrl(
    "11f0c5b8-b143-ea11-a812-000d3a8c9bad",
    "2350175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  busLane: formUrl(
    "655ae4be-b143-ea11-a812-000d3a8c9bad",
    "2750175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  crosswalk: formUrl(
    "a100dfc4-b143-ea11-a812-000d3a8c9bad",
    "2b50175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  hydrant: formUrl(
    "525828cb-b143-ea11-a812-000d3a8c9bad",
    "2f50175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  sidewalk: formUrl(
    "3b5828cb-b143-ea11-a812-000d3a8c9bad",
    "3350175b-3e8c-f111-ab10-000d3a8d2069",
  ),
  permitMisuse: formUrl(
    "ed88a7ef-b543-ea11-a812-000d3a8c9bad",
    "3750175b-3e8c-f111-ab10-000d3a8d2069",
  ),
} as const;

const US_STATE_OPTIONS: { value: string; label: string }[] = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN",
  "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT",
  "VT", "VA", "WA", "WV", "WI", "WY",
].map((code) => ({ value: code, label: code }));

/** Not NYC311 fields — these feed the Description text. */
export const PARKING_VEHICLE_FIELDS: CatalogFieldDefinition[] = [
  {
    key: "vehicle_color",
    label: "Vehicle color",
    page: "details",
    required: true,
    type: "text",
    placeholder: "Black",
  },
  {
    key: "vehicle_make",
    label: "Vehicle make",
    page: "details",
    required: true,
    type: "text",
    placeholder: "Toyota",
  },
  {
    key: "vehicle_model",
    label: "Vehicle model",
    page: "details",
    required: false,
    type: "text",
    placeholder: "Camry",
  },
  {
    key: "license_plate",
    label: "License plate",
    page: "details",
    required: true,
    type: "text",
    placeholder: "ABC-1234",
  },
  {
    key: "plate_state",
    label: "Plate state",
    page: "details",
    required: false,
    type: "text",
    placeholder: "NY",
  },
];

/** NYC311 "Who" step. Every field is optional — reports can be filed anonymously. */
export const CONTACT_FIELDS: CatalogFieldDefinition[] = [
  {
    key: "first_name",
    label: "First Name",
    page: "contact",
    required: false,
    type: "text",
    placeholder: "Jane",
  },
  {
    key: "last_name",
    label: "Last Name",
    page: "contact",
    required: false,
    type: "text",
    placeholder: "Doe",
  },
  {
    key: "email",
    label: "Email",
    page: "contact",
    required: false,
    type: "text",
    placeholder: "you@example.com",
  },
  {
    key: "primary_phone",
    label: "Primary Phone #",
    page: "contact",
    required: false,
    type: "tel",
    placeholder: "(212) 555-0100",
  },
  {
    key: "contact_address_1",
    label: "Address Line 1",
    page: "contact",
    required: false,
    type: "text",
    placeholder: "123 Main Street",
  },
  {
    key: "contact_address_2",
    label: "Address Line 2",
    page: "contact",
    required: false,
    type: "text",
    placeholder: "Apt 4B",
  },
  {
    key: "contact_city",
    label: "City",
    page: "contact",
    required: false,
    type: "text",
    placeholder: "Brooklyn",
  },
  {
    key: "contact_state",
    label: "State",
    page: "contact",
    required: false,
    type: "select",
    options: US_STATE_OPTIONS,
  },
  {
    key: "contact_zip",
    label: "Zip Code",
    page: "contact",
    required: false,
    type: "text",
    placeholder: "11201",
  },
];

/** NYC311 "What" step, alongside the Description textarea. */
export const WHAT_FIELDS: CatalogFieldDefinition[] = [
  {
    key: "datetime_observed",
    label: "Date/Time Observed",
    page: "what",
    required: true,
    type: "text",
    placeholder: "08/17/2026, 07:00 PM",
    helpText: "NYC311 uses a date picker — this is here so you know what to enter.",
  },
  {
    key: "recurring_problem",
    label: "Is this a recurring problem?",
    page: "what",
    required: false,
    type: "select",
    options: [
      { value: "No/Unknown", label: "No/Unknown" },
      { value: "Yes", label: "Yes" },
    ],
  },
];

/**
 * NYC311 "Where" step. Location Type is locked to Street/Sidewalk for parking
 * complaints, so it is surfaced as guidance rather than an editable field.
 */
export const LOCATION_TYPE = "Street/Sidewalk";

export const WHERE_FIELDS: CatalogFieldDefinition[] = [
  {
    key: "address",
    label: "Address",
    page: "where",
    required: true,
    type: "text",
    placeholder: "123 Main Street, Brooklyn, NY",
    helpText: "NYC311 looks this up with an address search box.",
  },
  {
    key: "apartment",
    label: "Apartment #",
    page: "where",
    required: false,
    type: "text",
    placeholder: "Usually blank for street parking",
  },
];

export const COMPLAINT_LEAVES: ComplaintLeafDefinition[] = [
  {
    id: "parking_blocked_driveway",
    label: "Blocked Driveway",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Blocked Driveway",
      descriptors: ["No Access", "Partial Access"],
    },
    formUrl: FORM_URLS.blockedDriveway,
    n311Selection: { field: "Additional Details", value: "Blocking Driveway" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01062",
    descriptionHint: "Vehicle partially or completely blocking a driveway.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_double_parked",
    label: "Double Parked",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Double Parked Blocking Traffic", "Double Parked Blocking Vehicle"],
    },
    formUrl: FORM_URLS.doubleParked,
    n311Selection: { field: "Additional Details", value: "Double Parked" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle double parked in the travel lane.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_blocked_bus_stop",
    label: "Parked at Bus Stop",
    agency: "NYPD",
    openDataQuery: { complaintType: "Illegal Parking" },
    formUrl: FORM_URLS.busStop,
    n311Selection: { field: "Additional Details", value: "Parked At Bus Stop" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle blocking a bus stop.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_no_standing",
    label: "Parked in No Standing Zone",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Posted Parking Sign Violation"],
    },
    formUrl: FORM_URLS.noStanding,
    n311Selection: { field: "Additional Details", value: "Parked In 'No Standing' Area" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle parked in a posted No Standing zone.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_no_stopping",
    label: "Parked in No Stopping Zone",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Posted Parking Sign Violation"],
    },
    formUrl: FORM_URLS.noStopping,
    n311Selection: { field: "Additional Details", value: "Parked In 'No Stopping' Area" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle parked in a posted No Stopping zone.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_blocked_bike_lane",
    label: "Parked in Bike Lane",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Blocked Bike Lane"],
    },
    formUrl: FORM_URLS.bikeLane,
    n311Selection: { field: "Additional Details", value: "Parked In Bike Lane" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle blocking a bike lane.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_blocked_bus_lane",
    label: "Parked in Bus Lane",
    agency: "NYPD",
    openDataQuery: { complaintType: "Illegal Parking" },
    formUrl: FORM_URLS.busLane,
    n311Selection: { field: "Additional Details", value: "Parked In Bus Lane" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle blocking a bus lane.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_blocked_crosswalk",
    label: "Parked in Crosswalk",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Blocked Crosswalk"],
    },
    formUrl: FORM_URLS.crosswalk,
    n311Selection: { field: "Additional Details", value: "Parked In Crosswalk" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle blocking a crosswalk.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_blocked_hydrant",
    label: "Parked at Fire Hydrant",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Blocked Hydrant"],
    },
    formUrl: FORM_URLS.hydrant,
    n311Selection: { field: "Additional Details", value: "Parked In Front Of Fire Hydrant" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle parked within 15 feet of a fire hydrant.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_blocked_sidewalk",
    label: "Parked on Sidewalk",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Blocked Sidewalk"],
    },
    formUrl: FORM_URLS.sidewalk,
    n311Selection: { field: "Additional Details", value: "Parked On Sidewalk" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle parked on the sidewalk.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_blocked_accessible_space",
    label: "Parked in Accessible Parking Space",
    agency: "NYPD",
    openDataQuery: { complaintType: "Illegal Parking" },
    formUrl: FORM_URLS.illegalParking,
    n311Selection: { field: "Problem Detail", value: "Posted Parking Sign Violation" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Vehicle blocking an accessible parking space.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_posted_sign_violation",
    label: "Posted Parking Sign Violation",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Posted Parking Sign Violation"],
    },
    formUrl: FORM_URLS.illegalParking,
    n311Selection: { field: "Problem Detail", value: "Posted Parking Sign Violation" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Other posted parking violation not listed above.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_commercial_overnight",
    label: "Commercial Vehicle Overnight on Residential Street",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Commercial Overnight Parking", "Overnight Commercial Storage"],
    },
    formUrl: FORM_URLS.illegalParking,
    n311Selection: { field: "Problem Detail", value: "Commercial Overnight Parking" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint: "Commercial vehicle parked overnight on a residential street.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
  {
    id: "parking_city_vehicle_sidewalk",
    label: "City Parking Permit Misuse",
    agency: "NYPD",
    openDataQuery: {
      complaintType: "Illegal Parking",
      descriptors: ["Parking Permit Improper Use"],
    },
    formUrl: FORM_URLS.permitMisuse,
    n311Selection: { field: "Problem Detail", value: "Parking Permit Improper Use" },
    articleUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint:
      "Vehicle using a work hat, vest, work ID, or business card as a parking permit.",
    fieldKeys: ["vehicle_color", "vehicle_make", "vehicle_model", "license_plate", "plate_state"],
  },
];

export const REPORT_PROBLEMS_URL = "https://portal.311.nyc.gov/report-problems/";

export function getLeafDefinition(id: ComplaintLeafId): ComplaintLeafDefinition {
  const found = COMPLAINT_LEAVES.find((leaf) => leaf.id === id);
  if (!found) {
    throw new Error(`Unknown complaint leaf: ${id}`);
  }
  return found;
}

export function getAllLeaves(): ComplaintLeafDefinition[] {
  return COMPLAINT_LEAVES;
}

export function isComplaintLeafId(value: string): value is ComplaintLeafId {
  return COMPLAINT_LEAVES.some((leaf) => leaf.id === value);
}

export function getFieldDefinitionsForLeaf(leafId: ComplaintLeafId): CatalogFieldDefinition[] {
  const leaf = getLeafDefinition(leafId);
  const detailFields = PARKING_VEHICLE_FIELDS.filter((field) => leaf.fieldKeys.includes(field.key));
  return [...WHAT_FIELDS, ...WHERE_FIELDS, ...detailFields, ...CONTACT_FIELDS];
}

export function getVehicleFieldsForLeaf(leafId: ComplaintLeafId): CatalogFieldDefinition[] {
  const leaf = getLeafDefinition(leafId);
  return PARKING_VEHICLE_FIELDS.filter((field) => leaf.fieldKeys.includes(field.key));
}

const FIELD_DEFAULTS: Record<string, string> = {
  plate_state: "NY",
  recurring_problem: "No/Unknown",
  contact_state: "NY",
};

export function emptyFieldsForLeaf(leafId: ComplaintLeafId): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const definition of getFieldDefinitionsForLeaf(leafId)) {
    fields[definition.key] = FIELD_DEFAULTS[definition.key] ?? "";
  }
  return fields;
}

export function defaultCandidates(): ComplaintLeafId[] {
  return ["parking_blocked_sidewalk", "parking_double_parked", "parking_blocked_driveway"];
}

/** Common violations first — used when AI fails or user asks for more options */
const CANDIDATE_PRIORITY: ComplaintLeafId[] = [
  "parking_blocked_sidewalk",
  "parking_double_parked",
  "parking_blocked_driveway",
  "parking_blocked_hydrant",
  "parking_blocked_crosswalk",
  "parking_blocked_bike_lane",
  "parking_blocked_bus_lane",
  "parking_blocked_bus_stop",
  "parking_no_standing",
  "parking_no_stopping",
  "parking_blocked_accessible_space",
  "parking_posted_sign_violation",
  "parking_commercial_overnight",
  "parking_city_vehicle_sidewalk",
];

export function pickAlternativeCandidates(
  exclude: ComplaintLeafId[],
  count = 3,
): ComplaintLeafId[] {
  return CANDIDATE_PRIORITY.filter((id) => !exclude.includes(id)).slice(0, count);
}

export function allCatalogOptions(): { id: ComplaintLeafId; label: string; hint: string }[] {
  return COMPLAINT_LEAVES.map((leaf) => ({
    id: leaf.id,
    label: leaf.label,
    hint: leaf.descriptionHint,
  }));
}

export interface CategoryCandidate {
  leafId: ComplaintLeafId;
  label: string;
  agency: string;
  confidence: number;
  reason?: string;
}

export function candidatesFromIds(
  ids: ComplaintLeafId[],
  confidences?: number[],
): CategoryCandidate[] {
  return ids.map((leafId, index) => {
    const leaf = getLeafDefinition(leafId);
    return {
      leafId,
      label: leaf.label,
      agency: leaf.agency,
      confidence: confidences?.[index] ?? 0.5,
    };
  });
}

export function composeHandoffDescription(
  leafId: ComplaintLeafId,
  fields: Record<string, string>,
  address: string,
): string {
  const leaf = getLeafDefinition(leafId);
  const sentences: string[] = [];

  const vehicleParts: string[] = [];
  if (fields.vehicle_color?.trim()) vehicleParts.push(fields.vehicle_color.trim());
  if (fields.vehicle_make?.trim()) vehicleParts.push(fields.vehicle_make.trim());
  if (fields.vehicle_model?.trim()) vehicleParts.push(fields.vehicle_model.trim());

  if (vehicleParts.length > 0) {
    let vehicleSentence = vehicleParts.join(" ");
    if (fields.license_plate?.trim()) {
      const state = fields.plate_state?.trim() ? ` (${fields.plate_state.trim()})` : "";
      vehicleSentence += `, NY plate ${fields.license_plate.trim()}${state}`;
    }
    sentences.push(`${vehicleSentence}.`);
  } else if (fields.license_plate?.trim()) {
    const state = fields.plate_state?.trim() ? ` (${fields.plate_state.trim()})` : "";
    sentences.push(`Vehicle with plate ${fields.license_plate.trim()}${state}.`);
  }

  sentences.push(`${leaf.descriptionHint} at ${address}.`);

  return sentences.join(" ");
}

/** @deprecated use composeHandoffDescription for Phase 1 */
export function composePacketDescription(
  leafId: ComplaintLeafId,
  fields: Record<string, string>,
  address: string,
): string {
  return composeHandoffDescription(leafId, fields, address);
}

export interface PacketPage {
  title: string;
  lines: string[];
}

function formatFieldLines(
  definitions: CatalogFieldDefinition[],
  fields: Record<string, string>,
): string[] {
  return definitions
    .map((definition) => {
      const value = fields[definition.key]?.trim();
      if (!value) return null;
      return `${definition.label}: ${value}`;
    })
    .filter((line): line is string => Boolean(line));
}

export function buildCopyPacket(
  leafId: ComplaintLeafId,
  fields: Record<string, string>,
  address: string,
  location: GeoPoint,
  description: string,
): { summary: string; pages: PacketPage[] } {
  const leaf = getLeafDefinition(leafId);
  const trimmed = description.trim();
  const whereLines = formatFieldLines(WHERE_FIELDS, {
    ...fields,
    address: fields.address?.trim() || address,
  });
  const detailDefinitions = PARKING_VEHICLE_FIELDS.filter((field) =>
    leaf.fieldKeys.includes(field.key),
  );
  const detailLines = formatFieldLines(detailDefinitions, fields);
  const contactLines = formatFieldLines(CONTACT_FIELDS, fields);

  const pages: PacketPage[] = [
    {
      title: "What — Description",
      lines: trimmed ? [trimmed] : ["Add a description before copying."],
    },
  ];

  pages.push({
    title: "Where — Location",
    lines:
      whereLines.length > 0
        ? [`Location Type: ${LOCATION_TYPE}`, ...whereLines]
        : [
            `Location Type: ${LOCATION_TYPE}`,
            `Address: ${address}`,
            `Coordinates: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
          ],
  });

  if (detailLines.length > 0) {
    pages.push({
      title: "Details — Vehicle",
      lines: detailLines,
    });
  }

  pages.push({
    title: "Who — Contact",
    lines:
      contactLines.length > 0
        ? contactLines
        : ["Add your name and phone if you want them ready to paste on NYC311."],
  });

  return {
    summary: [trimmed, ...whereLines, ...detailLines, ...contactLines].filter(Boolean).join("\n"),
    pages,
  };
}

export function validateLeafFields(
  leafId: ComplaintLeafId,
  fields: Record<string, string>,
): { ok: boolean; missing: string[] } {
  const missing = getFieldDefinitionsForLeaf(leafId)
    .filter((definition) => definition.required && !fields[definition.key]?.trim())
    .map((definition) => definition.label);
  return { ok: missing.length === 0, missing };
}

export function catalogPromptSection(): string {
  return COMPLAINT_LEAVES.map(
    (leaf) => `${leaf.id}: ${leaf.label} (${leaf.agency}) — ${leaf.descriptionHint}`,
  ).join("\n");
}

const REJECTED_FIELD_VALUES = [/^unknown$/i, /^n\/a$/i, /^not visible$/i];

function isPlaceholderValue(value: string, placeholder?: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (placeholder && trimmed.toLowerCase() === placeholder.toLowerCase()) return true;
  return REJECTED_FIELD_VALUES.some((pattern) => pattern.test(trimmed));
}

export function mergeAiIssueFieldsFromCatalog(
  leafId: ComplaintLeafId,
  aiFields: Record<string, unknown> | undefined,
): { fields: Record<string, string>; prefilledKeys: string[] } {
  const fields = emptyFieldsForLeaf(leafId);
  const prefilledKeys: string[] = [];
  if (!aiFields) return { fields, prefilledKeys };

  for (const definition of getFieldDefinitionsForLeaf(leafId)) {
    const raw = aiFields[definition.key];
    if (raw == null) continue;
    const value = String(raw).trim();
    if (!value) continue;

    if (definition.type === "select") {
      const allowed = definition.options?.some((option) => option.value === value);
      if (!allowed) continue;
    } else if (isPlaceholderValue(value, definition.placeholder)) {
      continue;
    }

    fields[definition.key] = value;
    prefilledKeys.push(definition.key);
  }

  return { fields, prefilledKeys };
}
