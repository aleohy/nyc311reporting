"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import { CategoryPicker } from "@/components/CategoryPicker";
import type { ReportDraft } from "@/types/report";

export default function CategoryPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changeMode, setChangeMode] = useState(false);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    // Read from location rather than useSearchParams to avoid a Suspense boundary.
    const isChanging = new URLSearchParams(window.location.search).has("change");
    setChangeMode(isChanging);

    async function loadDraft() {
      try {
        const response = await fetch(`/api/drafts/${reportId}`);
        const payload = (await response.json()) as { draft?: ReportDraft; error?: string };
        if (!response.ok || !payload.draft) {
          throw new Error(payload.error || "Draft not found.");
        }

        if (!isChanging && payload.draft.categoryConfirmed && payload.draft.leafId) {
          window.location.href = `/handoff/${reportId}`;
          return;
        }

        setDraft(payload.draft);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load draft.");
      } finally {
        setLoading(false);
      }
    }

    void loadDraft();
  }, [reportId]);

  if (loading) {
    return (
      <div className="page-shell flex max-w-3xl items-center">
        <div className="card w-full p-6 text-[var(--muted)]" aria-live="polite">
          Loading suggestions…
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="page-shell flex max-w-3xl items-center">
        <div className="card w-full p-6">
          <h1 className="text-3xl">Draft not found</h1>
          <p className="mt-2 text-[var(--muted)]">
            {error || "Start by taking a photo on the home screen."}
          </p>
          <Link href="/" className="btn btn-primary mt-5 inline-flex">
            Back to capture
          </Link>
        </div>
      </div>
    );
  }

  return <CategoryPicker draft={draft} changeMode={changeMode} />;
}
