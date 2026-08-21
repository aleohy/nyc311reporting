import type { StreetIssueType } from "@/types/report";

export interface IssueTypeDefinition {
  id: StreetIssueType;
  label: string;
  complaintType: string;
  handoffUrl: string;
  descriptionHint: string;
  descriptionPlaceholder: string;
  filingNote?: string;
}

export const STREET_ISSUE_TYPES: IssueTypeDefinition[] = [
  {
    id: "pothole",
    label: "Pothole on Street",
    complaintType: "Pothole",
    handoffUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01093",
    descriptionHint: "Shallow hole or crack in the street surface.",
    descriptionPlaceholder: "Example: Deep pothole in the travel lane, roughly 18 inches wide.",
  },
  {
    id: "cave_in",
    label: "Cave-In on Street",
    complaintType: "Cave-In",
    handoffUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01093",
    descriptionHint: "Deep collapse with broken pavement and no solid bottom.",
    descriptionPlaceholder: "Example: Large sinkhole with broken pavement and no solid bottom visible.",
  },
  {
    id: "street_flooding",
    label: "Street Flooding",
    complaintType: "Street Flooding",
    handoffUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-02198",
    descriptionHint: "Standing water or ponding on the street.",
    descriptionPlaceholder: "Example: Standing water blocking the curb lane after rain.",
  },
  {
    id: "broken_sidewalk",
    label: "Broken Sidewalk",
    complaintType: "Broken Sidewalk",
    handoffUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-02235",
    descriptionHint: "Sidewalk condition that may cause a trip hazard.",
    descriptionPlaceholder: "Example: Raised/broken sidewalk tile creating a trip hazard.",
  },
  {
    id: "street_repair",
    label: "Street Repair Complaint",
    complaintType: "Street Condition",
    handoffUrl: "https://portal.311.nyc.gov/report-problems/",
    descriptionHint: "Failed or defective street repair patch.",
    descriptionPlaceholder: "Example: Failed asphalt patch sinking in the travel lane.",
  },
  {
    id: "catch_basin",
    label: "Catch Basin Complaint",
    complaintType: "Catch Basin",
    handoffUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01084",
    descriptionHint: "Issue next to a catch basin or sewer grate.",
    descriptionPlaceholder: "Example: Catch basin clogged and water pooling at the curb.",
  },
  {
    id: "illegal_parking_pavement",
    label: "Illegal Parking on Pavement",
    complaintType: "Illegal Parking",
    handoffUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01986",
    descriptionHint:
      "Vehicle parked on the sidewalk, crosswalk, bike lane, or blocking pedestrian pavement.",
    descriptionPlaceholder:
      "Example: White Toyota blocking the sidewalk. Plate ABC-1234 if visible.",
    filingNote:
      "This is a NYC 311 Illegal Parking service request — not a police report. 311 asks for vehicle color, make, model, license plate, and what is being blocked (sidewalk, crosswalk, bike lane, etc.).",
  },
];

export function getIssueTypeDefinition(id: StreetIssueType): IssueTypeDefinition {
  const found = STREET_ISSUE_TYPES.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown issue type: ${id}`);
  }
  return found;
}

export const NYC_BOUNDS = {
  minLat: 40.4774,
  maxLat: 40.9176,
  minLng: -74.2591,
  maxLng: -73.7004,
};

export function isInsideNyc(lat: number, lng: number): boolean {
  return (
    lat >= NYC_BOUNDS.minLat &&
    lat <= NYC_BOUNDS.maxLat &&
    lng >= NYC_BOUNDS.minLng &&
    lng <= NYC_BOUNDS.maxLng
  );
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}
