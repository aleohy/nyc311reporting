import type { CategoryCandidate, ComplaintLeafId } from "@/lib/311-catalog";

/** @deprecated Legacy street types — use ComplaintLeafId for new reports */
export type StreetIssueType =
  | "pothole"
  | "cave_in"
  | "street_flooding"
  | "broken_sidewalk"
  | "street_repair"
  | "catch_basin"
  | "illegal_parking_pavement";

export type FixVerificationStatus = "not_checked" | "fixed" | "not_fixed" | "partial";

export interface FixVerification {
  status: FixVerificationStatus;
  followUpPhotoDataUrl?: string;
  notes?: string;
  verifiedAt?: string;
  srStatusSnapshot?: Record<string, unknown>;
}

export interface IdentificationVerification {
  confirmed: boolean;
  confirmedAt?: string;
  originalLeafId?: ComplaintLeafId;
  /** @deprecated */
  originalIssueType?: StreetIssueType | ComplaintLeafId;
}

export type ReportStatus =
  | "draft"
  | "handoff_ready"
  | "filed"
  /** @deprecated volunteer flow */
  | "awaiting_choice"
  | "queued"
  | "claimed";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AddressInfo {
  label: string;
  borough?: string;
  houseNumber?: string;
  street?: string;
  confidence?: number;
}

export interface TrustCheckResult {
  id: string;
  passed: boolean;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface NearbyRequest {
  uniqueKey: string;
  complaintType: string;
  descriptor: string;
  status: string;
  /** False only for complaints the city has already closed. */
  isActive: boolean;
  createdDate: string;
  closedDate?: string;
  resolutionDescription?: string;
  incidentAddress: string;
  distanceMeters: number;
}

export type FeedbackCategory = "wrong_category" | "missing_field" | "bug" | "idea" | "other";

export interface FeedbackEntry {
  id: string;
  category: FeedbackCategory;
  message: string;
  email?: string;
  /** Draft the user was looking at, when submitted from the handoff screen. */
  reportId?: string;
  leafId?: ComplaintLeafId;
  pagePath?: string;
  createdAt: string;
}

export interface ReportDraft {
  id: string;
  /** Selected 311 complaint leaf */
  leafId?: ComplaintLeafId;
  /** @deprecated use leafId */
  issueType?: StreetIssueType | ComplaintLeafId;
  description: string;
  confidence: number;
  location: GeoPoint;
  address: AddressInfo;
  photoDataUrl: string;
  photoHash: string;
  exifLocation?: GeoPoint;
  deviceLocation: GeoPoint;
  trustChecks: TrustCheckResult[];
  nearbyRequests: NearbyRequest[];
  requiresManualType: boolean;
  createdAt: string;
  issueFields?: Record<string, string>;
  aiPrefilledFields?: string[];
  /** Top 3 AI-suggested categories before user picks */
  categoryCandidates?: CategoryCandidate[];
  categoryConfirmed?: boolean;
  noneOfAboveCount?: number;
  excludedLeafIds?: ComplaintLeafId[];
  identificationVerification?: IdentificationVerification;
}

export interface SubmitResult {
  mode: "handoff" | "partner" | "queued" | "self_file";
  reportId: string;
  serviceRequestNumber?: string;
  handoffUrl: string;
  summary: string;
  message: string;
  packetPages?: { title: string; lines: string[] }[];
}

/** @deprecated volunteer flow */
export type FilingPath = "free_queue" | "coffee_tip" | "self_file";

/** @deprecated volunteer flow */
export interface QueueStats {
  freePending: number;
  coffeePending: number;
  freeCap: number;
  freeAvailable: boolean;
  estimatedWaitHours: number;
  coffeeRecommended: boolean;
}

export interface StoredReport extends ReportDraft {
  submittedAt: string;
  status: ReportStatus;
  serviceRequestNumber?: string;
  filedAt?: string;
  submitResult: SubmitResult;
  fixVerification?: FixVerification;
  /** @deprecated volunteer flow */
  filingPath?: "free_queue" | "coffee_tip" | "self_file";
  contactEmail?: string;
  claimedBy?: string;
  claimedAt?: string;
}
