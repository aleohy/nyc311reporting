import { distanceMeters, isInsideNyc } from "@/lib/constants";
import type { ComplaintLeafId } from "@/lib/311-catalog";
import { readStoredReports } from "@/lib/storage";
import type { GeoPoint, TrustCheckResult } from "@/types/report";

export { buildDraftSummary } from "@/lib/issue-fields";

const EXIF_DISTANCE_WARNING_METERS = 250;
const DUPLICATE_DISTANCE_METERS = 40;

function makeCheck(
  id: string,
  passed: boolean,
  severity: TrustCheckResult["severity"],
  message: string,
): TrustCheckResult {
  return { id, passed, severity, message };
}

export async function runTrustChecks(input: {
  photoHash: string;
  deviceLocation: GeoPoint;
  exifLocation?: GeoPoint;
  isLikelyFake: boolean;
  fakeReason?: string;
  isStreetIssue: boolean;
  confidence: number;
  leafId?: ComplaintLeafId;
  issueType?: string;
  location: GeoPoint;
}): Promise<{
  trustChecks: TrustCheckResult[];
  requiresManualType: boolean;
}> {
  const checks: TrustCheckResult[] = [];

  checks.push(
    input.isLikelyFake
      ? makeCheck(
          "vision_fake",
          false,
          "error",
          input.fakeReason || "This photo does not look like a real street-condition report.",
        )
      : makeCheck("vision_fake", true, "info", "Photo looks like a real street-condition image."),
  );

  checks.push(
    input.isStreetIssue
      ? makeCheck("vision_street", true, "info", "Photo appears related to a street, sidewalk, or parking issue.")
      : makeCheck(
          "vision_street",
          false,
          "error",
          "Photo does not appear to show a street, sidewalk, or parking issue.",
        ),
  );

  checks.push(
    isInsideNyc(input.location.lat, input.location.lng)
      ? makeCheck("nyc_bounds", true, "info", "Location is inside New York City.")
      : makeCheck(
          "nyc_bounds",
          false,
          "error",
          "Location appears outside New York City. Move the pin to an NYC address.",
        ),
  );

  if (input.exifLocation) {
    const exifDistance = distanceMeters(input.exifLocation, input.deviceLocation);
    checks.push(
      exifDistance <= EXIF_DISTANCE_WARNING_METERS
        ? makeCheck(
            "exif_gps",
            true,
            "info",
            "Photo location metadata matches your device location.",
          )
        : makeCheck(
            "exif_gps",
            true,
            "warning",
            "Photo metadata location differs from your device GPS. Confirm the map pin before submitting.",
          ),
    );
  } else {
    checks.push(
      makeCheck(
        "exif_gps",
        true,
        "warning",
        "Photo has no GPS metadata. Confirm the map pin before submitting.",
      ),
    );
  }

  const storedReports = await readStoredReports();
  const duplicate = storedReports.find(
    (report) =>
      report.photoHash === input.photoHash ||
      (distanceMeters(report.location, input.location) <= DUPLICATE_DISTANCE_METERS &&
        (report.leafId === input.leafId ||
          report.issueType === input.leafId ||
          report.issueType === input.issueType)),
  );

  checks.push(
    duplicate
      ? makeCheck(
          "duplicate_photo",
          true,
          "warning",
          "A similar report was recently created from this app. Check nearby 311 requests before filing again.",
        )
      : makeCheck("duplicate_photo", true, "info", "No duplicate report detected in this app."),
  );

  const requiresManualType = input.confidence < 0.55;
  if (requiresManualType) {
    checks.push(
      makeCheck(
        "confidence",
        true,
        "warning",
        `Classifier confidence is low (${Math.round(input.confidence * 100)}%). Please confirm the issue type.`,
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "confidence",
        true,
        "info",
        `Classifier confidence: ${Math.round(input.confidence * 100)}%.`,
      ),
    );
  }

  return {
    trustChecks: checks,
    requiresManualType,
  };
}
