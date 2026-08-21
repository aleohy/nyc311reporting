import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { composeHandoffDescription } from "@/lib/311-catalog";
import { classifyStreetPhoto } from "@/lib/classify";
import { reverseGeocodeNyc } from "@/lib/geosearch";
import { findNearbyRequests } from "@/lib/nyc-open-data";
import { createPhotoHash } from "@/lib/photo";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveDraft } from "@/lib/storage";
import { runTrustChecks } from "@/lib/trust";
import type { GeoPoint, ReportDraft } from "@/types/report";

/** NYC center — used only when GPS and photo EXIF are both missing. User adjusts on review. */
const NYC_FALLBACK: GeoPoint = { lat: 40.7128, lng: -74.006 };

export const runtime = "nodejs";
export const maxDuration = 120;

interface ClassifyRequestBody {
  photoDataUrl: string;
  deviceLocation?: GeoPoint;
  exifLocation?: GeoPoint;
}

function resolveLocation(body: ClassifyRequestBody): {
  location: GeoPoint;
  deviceLocation: GeoPoint;
  usedFallback: boolean;
} {
  const deviceLocation = body.deviceLocation ?? body.exifLocation ?? NYC_FALLBACK;
  const location = body.exifLocation ?? body.deviceLocation ?? NYC_FALLBACK;
  const usedFallback = !body.deviceLocation && !body.exifLocation;
  return { location, deviceLocation, usedFallback };
}

function resolveBorough(address: ReportDraft["address"]): string {
  const label = address.label.toUpperCase();
  if (label.includes("MANHATTAN") || label.includes(", NY 100")) return "MANHATTAN";
  if (label.includes("BRONX") || label.includes(", NY 104")) return "BRONX";
  if (label.includes("BROOKLYN") || label.includes(", NY 112")) return "BROOKLYN";
  if (label.includes("QUEENS") || label.includes(", NY 113") || label.includes(", NY 114"))
    return "QUEENS";
  if (label.includes("STATEN ISLAND") || label.includes(", NY 103")) return "STATEN ISLAND";
  return address.borough?.toUpperCase() || "";
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateLimit = checkRateLimit(`classify:${ip}`);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as ClassifyRequestBody;

    if (!body.photoDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid photo is required." }, { status: 400 });
    }

    const { location, deviceLocation, usedFallback } = resolveLocation(body);
    const photoHash = await createPhotoHash(
      Buffer.from(body.photoDataUrl.split(",")[1] || "", "base64"),
    );

    const [classification, address] = await Promise.all([
      classifyStreetPhoto(body.photoDataUrl, location),
      reverseGeocodeNyc(location),
    ]);

    const trust = await runTrustChecks({
      photoHash,
      deviceLocation,
      exifLocation: body.exifLocation,
      isLikelyFake: classification.isLikelyFake,
      fakeReason: classification.fakeReason,
      isStreetIssue: classification.isStreetIssue,
      confidence: classification.confidence,
      leafId: classification.topLeafId,
      location,
    });

    if (usedFallback) {
      trust.trustChecks.push({
        id: "location_fallback",
        passed: true,
        severity: "warning",
        message:
          "Exact location unknown. Confirm the map pin and address on the next screen before submitting.",
      });
    }

    if (classification.aiTimedOut || !classification.usedAi) {
      trust.trustChecks.push({
        id: "ai_fallback",
        passed: true,
        severity: "warning",
        message: classification.aiTimedOut
          ? "AI classification timed out. Please confirm the complaint category and description."
          : "AI classification unavailable. Please confirm the complaint category and description.",
      });
    }

    if (classification.usedAi && classification.aiPrefilledFields.length > 0) {
      trust.trustChecks.push({
        id: "field_prefill",
        passed: true,
        severity: "info",
        message: `AI spotted ${classification.aiPrefilledFields.length} vehicle detail(s) from your photo — they are included in the description draft.`,
      });
    }

    const nearby = await findNearbyRequests(location, classification.topLeafId);
    const issueFields = {
      ...classification.issueFields,
      address: address.label,
      borough: resolveBorough(address),
    };
    const description =
      classification.aiPrefilledFields.length > 0
        ? composeHandoffDescription(classification.topLeafId, issueFields, address.label)
        : classification.description;

    const draft: ReportDraft = {
      id: uuidv4(),
      description,
      confidence: classification.confidence,
      location,
      address,
      photoDataUrl: body.photoDataUrl,
      photoHash,
      exifLocation: body.exifLocation,
      deviceLocation,
      trustChecks: trust.trustChecks,
      nearbyRequests: nearby,
      requiresManualType:
        trust.requiresManualType || classification.aiTimedOut || !classification.usedAi,
      createdAt: new Date().toISOString(),
      issueFields,
      aiPrefilledFields: classification.aiPrefilledFields,
      categoryCandidates: classification.candidates,
      noneOfAboveCount: 0,
      excludedLeafIds: [],
    };

    await saveDraft(draft);

    return NextResponse.json({ reportId: draft.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to classify photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
