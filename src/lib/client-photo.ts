"use client";

import exifr from "exifr";

import type { GeoPoint } from "@/types/report";

const MAX_EDGE_PX = 1280;
const JPEG_QUALITY = 0.82;

async function extractExifLocation(file: File): Promise<GeoPoint | undefined> {
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

async function compressImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read image."));
      img.src = objectUrl;
    });

    const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to process image.");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function readPhotoWithExif(file: File): Promise<{
  dataUrl: string;
  exifLocation?: GeoPoint;
}> {
  const [dataUrl, exifLocation] = await Promise.all([
    compressImage(file),
    extractExifLocation(file),
  ]);

  return { dataUrl, exifLocation };
}

export function fileFromCaptureInput(input: HTMLInputElement): File | null {
  const file = input.files?.[0];
  return file ?? null;
}
