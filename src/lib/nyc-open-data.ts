import { getLeafDefinition } from "@/lib/311-catalog";
import { distanceMeters } from "@/lib/constants";
import type { ComplaintLeafId, OpenDataQuery } from "@/lib/311-catalog";
import type { GeoPoint, NearbyRequest, StreetIssueType } from "@/types/report";
import { isComplaintLeafId } from "@/lib/311-catalog";
import { getIssueTypeDefinition } from "@/lib/constants";

interface SocrataRecord {
  unique_key?: string;
  complaint_type?: string;
  descriptor?: string;
  status?: string;
  created_date?: string;
  closed_date?: string;
  resolution_description?: string;
  incident_address?: string;
  latitude?: string;
  longitude?: string;
}

const OPEN_DATA_URL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";

const DEFAULT_RADIUS_METERS = 120;

/**
 * NYPD closes illegal parking complaints within hours, so filtering on an open
 * status returns nothing. A recency window is what actually identifies a likely
 * duplicate: a report for the same problem at the same spot in the recent past.
 */
const DEFAULT_LOOKBACK_DAYS = 14;

const METERS_PER_DEGREE_LAT = 111_320;

function escapeSoql(value: string): string {
  return value.replace(/'/g, "''");
}

function resolveOpenDataQuery(issueType: StreetIssueType | ComplaintLeafId): OpenDataQuery {
  if (isComplaintLeafId(String(issueType))) {
    return getLeafDefinition(issueType as ComplaintLeafId).openDataQuery;
  }

  return { complaintType: getIssueTypeDefinition(issueType as StreetIssueType).complaintType };
}

/** Bounding box padded past the target radius so the distance filter does the real work. */
function boundingBox(location: GeoPoint, radiusMeters: number) {
  const latDelta = (radiusMeters * 1.5) / METERS_PER_DEGREE_LAT;
  const lngScale = Math.max(Math.cos((location.lat * Math.PI) / 180), 0.1);
  const lngDelta = latDelta / lngScale;

  return {
    minLat: location.lat - latDelta,
    maxLat: location.lat + latDelta,
    minLng: location.lng - lngDelta,
    maxLng: location.lng + lngDelta,
  };
}

export function isActiveStatus(status: string): boolean {
  return status.trim().toLowerCase() !== "closed";
}

export async function findNearbyRequests(
  location: GeoPoint,
  issueType: StreetIssueType | ComplaintLeafId,
  options: { radiusMeters?: number; lookbackDays?: number } = {},
): Promise<NearbyRequest[]> {
  const radiusMeters = options.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;

  const query = resolveOpenDataQuery(issueType);
  const box = boundingBox(location, radiusMeters);
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19);

  const whereParts = [
    `complaint_type='${escapeSoql(query.complaintType)}'`,
    `created_date > '${cutoff}'`,
    `latitude between ${box.minLat} and ${box.maxLat}`,
    `longitude between ${box.minLng} and ${box.maxLng}`,
  ];

  if (query.descriptors && query.descriptors.length > 0) {
    const list = query.descriptors.map((value) => `'${escapeSoql(value)}'`).join(",");
    whereParts.push(`descriptor in(${list})`);
  }

  const params = new URLSearchParams({
    $select:
      "unique_key,complaint_type,descriptor,status,created_date,closed_date,resolution_description,incident_address,latitude,longitude",
    $where: whereParts.join(" AND "),
    $order: "created_date DESC",
    $limit: "50",
  });

  try {
    const response = await fetch(`${OPEN_DATA_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return [];
    }

    const records = (await response.json()) as SocrataRecord[];

    const nearby = records
      .map((record): NearbyRequest | null => {
        const lat = Number(record.latitude);
        const lng = Number(record.longitude);
        if (!record.unique_key || Number.isNaN(lat) || Number.isNaN(lng)) {
          return null;
        }

        const distance = distanceMeters(location, { lat, lng });
        if (distance > radiusMeters) {
          return null;
        }

        const status = record.status || "Unspecified";

        return {
          uniqueKey: record.unique_key,
          complaintType: record.complaint_type || query.complaintType,
          descriptor: record.descriptor || "",
          status,
          isActive: isActiveStatus(status),
          createdDate: record.created_date || "",
          closedDate: record.closed_date,
          resolutionDescription: record.resolution_description,
          incidentAddress: record.incident_address || "",
          distanceMeters: Math.round(distance),
        };
      })
      .filter((record): record is NearbyRequest => record !== null);

    // Still-active reports are the ones worth not duplicating, so surface them first.
    return nearby.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return a.distanceMeters - b.distanceMeters;
    });
  } catch {
    return [];
  }
}
