import type { AddressInfo, GeoPoint } from "@/types/report";

interface GeoSearchFeature {
  properties?: {
    label?: string;
    borough?: string;
    housenumber?: string;
    street?: string;
    confidence?: number;
  };
}

interface GeoSearchResponse {
  features?: GeoSearchFeature[];
}

function coordinateFallback(point: GeoPoint): AddressInfo {
  return {
    label: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
    confidence: 0,
  };
}

export async function reverseGeocodeNyc(point: GeoPoint): Promise<AddressInfo> {
  const url = new URL("https://geosearch.planninglabs.nyc/v2/reverse");
  url.searchParams.set("point.lat", point.lat.toString());
  url.searchParams.set("point.lon", point.lng.toString());
  url.searchParams.set("size", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error(`GeoSearch reverse failed with status ${response.status}`);
      return coordinateFallback(point);
    }

    const data = (await response.json()) as GeoSearchResponse;
    const feature = data.features?.[0];

    if (!feature?.properties?.label) {
      return coordinateFallback(point);
    }

    return {
      label: feature.properties.label,
      borough: feature.properties.borough,
      houseNumber: feature.properties.housenumber,
      street: feature.properties.street,
      confidence: feature.properties.confidence,
    };
  } catch (error) {
    console.error("GeoSearch reverse geocode error:", error);
    return coordinateFallback(point);
  }
}
