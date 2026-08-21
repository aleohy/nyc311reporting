import { NextResponse } from "next/server";

import { isComplaintLeafId } from "@/lib/311-catalog";
import { findNearbyRequests } from "@/lib/nyc-open-data";
import type { GeoPoint, StreetIssueType } from "@/types/report";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const leafId = searchParams.get("leafId");
  const issueType = searchParams.get("issueType") as StreetIssueType | null;
  const typeParam = leafId || issueType;

  if (Number.isNaN(lat) || Number.isNaN(lng) || !typeParam) {
    return NextResponse.json(
      { error: "lat, lng, and leafId (or issueType) are required." },
      { status: 400 },
    );
  }

  if (leafId && !isComplaintLeafId(leafId)) {
    return NextResponse.json({ error: "Invalid leafId." }, { status: 400 });
  }

  const nearbyRequests = await findNearbyRequests(
    { lat, lng } satisfies GeoPoint,
    (leafId || issueType) as StreetIssueType,
  );
  return NextResponse.json({ nearbyRequests });
}
