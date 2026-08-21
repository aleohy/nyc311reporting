"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { StepNav } from "@/components/StepNav";
import { useGeolocation } from "@/hooks/useGeolocation";
import { readPhotoWithExif } from "@/lib/client-photo";
import type { GeoPoint } from "@/types/report";

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
}

function Check({ children }: { children: string }) {
  return (
    <p className="check-row">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.4 11.2 3.2 8l1.13-1.13L6.4 8.93l5.27-5.26L12.8 4.8z"
        />
      </svg>
      {children}
    </p>
  );
}

export function CaptureScreen() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { location, error: locationError, loading: locationLoading } = useGeolocation();
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = !processing;

  async function handleFileSelected(file: File) {
    if (!isImageFile(file)) {
      setError("Please drop an image file (JPG, PNG, etc.).");
      return;
    }

    setProcessing(true);
    setError(null);
    setStatusMessage("Compressing photo…");

    try {
      const { dataUrl, exifLocation } = await readPhotoWithExif(file);
      setPreview(dataUrl);
      setStatusMessage("Analyzing photo — this can take up to 30 seconds…");

      const body: {
        photoDataUrl: string;
        deviceLocation?: GeoPoint;
        exifLocation?: GeoPoint;
      } = { photoDataUrl: dataUrl };

      if (location) body.deviceLocation = location;
      if (exifLocation) body.exifLocation = exifLocation;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 90000);

      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeoutId));

      const payload = (await response.json()) as {
        reportId?: string;
        error?: string;
      };

      if (!response.ok || !payload.reportId) {
        throw new Error(payload.error || "Unable to analyze photo.");
      }

      setStatusMessage("Opening category picker…");
      router.push(`/category/${payload.reportId}`);
    } catch (analyzeError) {
      if (analyzeError instanceof Error && analyzeError.name === "AbortError") {
        setError("This is taking too long. Try a smaller photo or refresh and try again.");
      } else {
        setError(analyzeError instanceof Error ? analyzeError.message : "Unable to analyze photo.");
      }
    } finally {
      setProcessing(false);
      setStatusMessage(null);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (canUpload) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!canUpload) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  return (
    <div className="page-shell">
      <div className="app-header">
        <StepNav current="photo" />
      </div>

      <section className="mt-6 grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Submit a request
          </p>
          <h1 className="mt-4 text-5xl leading-[1.05] sm:text-6xl">
            Report illegal parking without the 311 scavenger hunt.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
            Photograph the vehicle. Confirm the official NYC311 category. Copy the packet into the
            city’s form. Illegal parking only, for now.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Check>No account required</Check>
            <Check>You file on NYC311 — we just prepare it</Check>
            {locationLoading && <p className="text-sm text-[var(--muted)]">Getting your location…</p>}
            {location && <Check>Location ready to attach</Check>}
            {locationError && <p className="text-sm text-[var(--warning)]">{locationError}</p>}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canUpload}
              onClick={() => inputRef.current?.click()}
            >
              {processing ? statusMessage || "Analyzing photo…" : "Take or Upload Photo"}
            </button>
          </div>
        </div>

        <section className="card overflow-hidden p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Photo capture
          </p>
          <h2 className="mt-2 text-2xl">Drop the street photo</h2>

          <div
            className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-[var(--accent)] bg-[rgba(132,204,22,0.12)]"
                : "border-[var(--line)] bg-white/50"
            } ${!canUpload ? "opacity-60" : "cursor-pointer"}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (canUpload) {
                inputRef.current?.click();
              }
            }}
            onKeyDown={(event) => {
              if ((event.key === "Enter" || event.key === " ") && canUpload) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Drop a photo here or click to upload"
          >
            <p className="text-base font-semibold">
              {processing ? statusMessage || "Analyzing photo…" : "Drop a photo here"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Drag and drop, or use the button. JPG, PNG, HEIC.
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFileSelected(file);
              }
            }}
          />

          {preview && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview of the street condition you captured"
                width={1200}
                height={900}
                loading="lazy"
                className="h-auto w-full object-cover"
              />
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm font-medium text-[var(--error)]" role="alert">
              {error}
            </p>
          )}
        </section>
      </section>
    </div>
  );
}
