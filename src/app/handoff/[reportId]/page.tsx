"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { HandoffForm } from "@/components/HandoffForm";
import type { ReportDraft } from "@/types/report";

export default function HandoffPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      return;
    }

    async function loadDraft() {
      try {
        const response = await fetch(`/api/drafts/${reportId}`);
        const payload = (await response.json()) as { draft?: ReportDraft; error?: string };
        if (!response.ok || !payload.draft) {
          throw new Error(payload.error || "Draft not found.");
        }

        if (!payload.draft.categoryConfirmed || !payload.draft.leafId) {
          window.location.href = `/category/${reportId}`;
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
          Preparing your 311 handoff…
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

  return <HandoffForm initialDraft={draft} />;
}
