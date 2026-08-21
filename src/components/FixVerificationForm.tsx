"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { readPhotoWithExif } from "@/lib/client-photo";
import { fixStatusDescription, fixStatusLabel, issueLabel } from "@/lib/verification";
import type { FixVerificationStatus, StoredReport } from "@/types/report";

interface FixVerificationFormProps {
  report: StoredReport;
}

export function FixVerificationForm({ report }: FixVerificationFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<FixVerificationStatus>(
    report.fixVerification?.status ?? "not_checked",
  );
  const [followUpPhoto, setFollowUpPhoto] = useState<string | undefined>(
    report.fixVerification?.followUpPhotoDataUrl,
  );
  const [notes, setNotes] = useState(report.fixVerification?.notes ?? "");
  const [srStatus, setSrStatus] = useState<Record<string, unknown> | null>(
    report.fixVerification?.srStatusSnapshot ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const srNumber = report.serviceRequestNumber || report.submitResult.serviceRequestNumber;

  async function lookup311Status() {
    if (!srNumber) return;
    const response = await fetch(`/api/status?srNumber=${encodeURIComponent(srNumber)}`);
    const payload = (await response.json()) as {
      result?: Record<string, unknown>;
      error?: string;
    };
    if (response.ok && payload.result) {
      setSrStatus(payload.result);
    }
  }

  async function handleFollowUpPhoto(file: File) {
    const { dataUrl } = await readPhotoWithExif(file);
    setFollowUpPhoto(dataUrl);
  }

  async function saveVerification(nextStatus: FixVerificationStatus) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${report.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          followUpPhotoDataUrl: followUpPhoto,
          notes,
          srStatusSnapshot: srStatus ?? undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save verification.");
      }

      setStatus(nextStatus);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save verification.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Fix verification
        </p>
        <h1 className="mt-2 text-3xl font-bold">Was this issue fixed?</h1>
        <p className="mt-2 text-[var(--muted)]">
          Compare your original report with what you see now at {report.address.label}.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-sm text-[var(--muted)]">Reported issue</p>
        <p className="mt-1 font-semibold">{issueLabel(report)}</p>
        <p className="mt-2 text-sm">
          Current verification: <strong>{fixStatusLabel(status)}</strong>
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">{fixStatusDescription(status)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card overflow-hidden">
          <p className="border-b border-black/5 p-3 text-sm font-semibold">Before (your report)</p>
          <div className="relative aspect-[4/3] bg-slate-100">
            <Image
              src={report.photoDataUrl}
              alt="Original report photo"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <p className="border-b border-black/5 p-3 text-sm font-semibold">After (follow-up)</p>
          <div className="relative aspect-[4/3] bg-slate-100">
            {followUpPhoto ? (
              <Image
                src={followUpPhoto}
                alt="Follow-up photo"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--muted)]">
                Add a new photo from the same spot to verify whether it was fixed.
              </div>
            )}
          </div>
          <div className="p-3">
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={() => inputRef.current?.click()}
            >
              {followUpPhoto ? "Replace follow-up photo" : "Add follow-up photo"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFollowUpPhoto(file);
              }}
            />
          </div>
        </div>
      </div>

      {srNumber && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold">311 status</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Service request: {srNumber}</p>
          <button type="button" className="btn btn-secondary mt-3" onClick={() => void lookup311Status()}>
            Check 311 status
          </button>
          {srStatus && (
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(srStatus, null, 2)}
            </pre>
          )}
        </section>
      )}

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Your verdict</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Look at the photos and pick what matches what you see on the ground.
        </p>

        <div className="field mt-4">
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. Car is gone but tire marks remain on the sidewalk."
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void saveVerification("fixed")}
          >
            Fixed
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={saving}
            onClick={() => void saveVerification("partial")}
          >
            Partially fixed
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={saving}
            onClick={() => void saveVerification("not_fixed")}
          >
            Still there
          </button>
        </div>
      </section>

      {error && <p className="text-sm font-medium text-[var(--error)]">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/track/${report.id}`} className="btn btn-secondary">
          Back to tracking
        </Link>
        <Link href="/" className="btn btn-primary">
          Report another issue
        </Link>
      </div>
    </div>
  );
}
