"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { StepNav } from "@/components/StepNav";
import { allCatalogOptions } from "@/lib/311-catalog";
import type { CategoryCandidate, ComplaintLeafId } from "@/lib/311-catalog";
import type { ReportDraft } from "@/types/report";

interface CategoryPickerProps {
  draft: ReportDraft;
  /** Arrived from the handoff screen to change an already-confirmed category. */
  changeMode?: boolean;
}

export function CategoryPicker({ draft, changeMode = false }: CategoryPickerProps) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CategoryCandidate[]>(draft.categoryCandidates || []);
  const [noneCount, setNoneCount] = useState(draft.noneOfAboveCount || 0);
  const [showFullCatalog, setShowFullCatalog] = useState(
    changeMode || (draft.noneOfAboveCount || 0) >= 2,
  );
  const [selectedLeafId, setSelectedLeafId] = useState<ComplaintLeafId | "">(
    changeMode ? draft.leafId || "" : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allOptions = useMemo(() => allCatalogOptions(), []);

  // The classifier pushes an ai_fallback check whenever it never got a usable answer.
  const aiUnavailable = (draft.trustChecks || []).some((check) => check.id === "ai_fallback");

  async function selectLeaf(leafId: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/drafts/${draft.id}/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leafId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save category.");
      }
      router.push(`/handoff/${draft.id}`);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Unable to save category.");
    } finally {
      setLoading(false);
    }
  }

  async function handleNoneOfAbove() {
    if (noneCount >= 2) {
      setShowFullCatalog(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/drafts/${draft.id}/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noneOfAbove: true }),
      });
      const payload = (await response.json()) as {
        error?: string;
        candidates?: CategoryCandidate[];
        noneOfAboveCount?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to refresh suggestions.");
      }
      const nextCount = payload.noneOfAboveCount || noneCount + 1;
      setCandidates(payload.candidates || []);
      setNoneCount(nextCount);
      if (nextCount >= 2) {
        setShowFullCatalog(true);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh suggestions.");
    } finally {
      setLoading(false);
    }
  }

  const selectedOption = allOptions.find((option) => option.id === selectedLeafId);

  return (
    <div className="page-shell flex max-w-3xl flex-col gap-6">
      <div className="app-header">
        <StepNav
          current="category"
          reportId={draft.id}
          furthestReached={draft.categoryConfirmed ? "file" : "category"}
        />
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          {changeMode ? "Change complaint type" : "Pick complaint type"}
        </p>
        <h1 className="mt-2 text-4xl">Which 311 category fits?</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          {changeMode
            ? "Pick a different NYC311 complaint type. This updates the form link and description on your handoff screen."
            : aiUnavailable
              ? "We couldn't analyze your photo automatically. Pick the category that matches what you saw."
              : "We analyzed your photo and picked the three most likely illegal parking categories. Choose the one that matches what you photographed."}
        </p>
        {changeMode && (
          <Link href={`/handoff/${draft.id}`} className="mt-3 inline-block text-sm underline">
            Back to handoff
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={draft.photoDataUrl}
          alt="The street condition you photographed"
          width={1200}
          height={900}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>

      {!showFullCatalog && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold">
            {aiUnavailable ? "Common categories" : "Suggested categories"}
          </h2>
          {aiUnavailable && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              These are starting points, not photo matches. Use &ldquo;Show all categories&rdquo; if
              none apply.
            </p>
          )}
          <div className="mt-4 flex flex-col gap-3">
            {candidates.map((candidate) => (
              <button
                key={candidate.leafId}
                type="button"
                className="rounded-2xl border border-black/10 bg-white p-4 text-left transition hover:border-[var(--accent)] hover:bg-[rgba(0,87,184,0.04)] disabled:opacity-60"
                disabled={loading}
                onClick={() => void selectLeaf(candidate.leafId)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-lg font-semibold">{candidate.label}</p>
                  <span className="badge badge-info">{candidate.agency}</span>
                </div>
                {!aiUnavailable && candidate.reason && (
                  <p className="mt-2 text-sm text-[var(--muted)]">{candidate.reason}</p>
                )}
                {candidate.confidence >= 0.5 && (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    AI confidence: {Math.round(candidate.confidence * 100)}%
                  </p>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary mt-4 w-full"
            disabled={loading}
            onClick={() => (aiUnavailable ? setShowFullCatalog(true) : void handleNoneOfAbove())}
          >
            {aiUnavailable || noneCount >= 2
              ? "Show all categories"
              : "None of the above — show 3 more"}
          </button>
        </section>
      )}

      {showFullCatalog && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold">All illegal parking categories</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Pick the exact NYC311 complaint type from the full list.
          </p>

          <div className="field mt-4">
            <label htmlFor="full-category">Complaint category</label>
            <select
              id="full-category"
              value={selectedLeafId}
              disabled={loading}
              onChange={(event) => setSelectedLeafId(event.target.value as ComplaintLeafId | "")}
            >
              <option value="">Select a category...</option>
              {allOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedOption && (
              <p className="mt-2 text-sm text-[var(--muted)]">{selectedOption.hint}</p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedLeafId || loading}
              onClick={() => selectedLeafId && void selectLeaf(selectedLeafId)}
            >
              {changeMode ? "Use this category" : "Continue with this category"}
            </button>
            {noneCount < 2 && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loading}
                onClick={() => setShowFullCatalog(false)}
              >
                Back to AI suggestions
              </button>
            )}
          </div>
        </section>
      )}

      {error && <p className="text-sm font-medium text-[var(--error)]">{error}</p>}

      <p className="text-sm text-[var(--muted)]">
        Wrong suggestion?{" "}
        <Link href="/feedback" className="underline">
          Send feedback
        </Link>
      </p>
    </div>
  );
}
