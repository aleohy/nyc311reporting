import crypto from "crypto";
import exifr from "exifr";

import type { GeoPoint } from "@/types/report";

export async function extractExifLocation(file: File): Promise<GeoPoint | undefined> {
  try {
    const gps = await exifr.gps(file);
    if (!gps?.latitude || !gps?.longitude) {
      return undefined;
    }

    return {
      lat: gps.latitude,
      lng: gps.longitude,
    };
  } catch {
    return undefined;
  }
}

export async function createPhotoHash(buffer: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function bufferFromDataUrl(dataUrl: string): Buffer {
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    throw new Error("Invalid photo data.");
  }
  return Buffer.from(base64, "base64");
}

export function dataUrlFromBuffer(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
