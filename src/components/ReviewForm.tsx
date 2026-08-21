"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getLeafDefinition } from "@/lib/311-catalog";
import { NearbyRequests } from "@/components/NearbyRequests";
import { IssueFieldsForm } from "@/components/IssueFieldsForm";
import { IssueIdentificationPanel } from "@/components/IssueIdentificationPanel";
import { TrustChecks } from "@/components/TrustChecks";
import { compose311Description, emptyIssueFields, resolveDraftLeafId } from "@/lib/issue-fields";
import { canSubmitDraft } from "@/lib/trust-validation";
import {
  canProceedToSubmit,
  missingIssueFieldLabels,
  needsDescriptionEdit,
  needsIdentificationConfirmation,
  resolveTrustChecksForDisplay,
} from "@/lib/verification";
import type { ComplaintLeafId } from "@/lib/311-catalog";
import type { GeoPoint, ReportDraft } from "@/types/report";

interface ReviewFormProps {
  initialDraft: ReportDraft;
}

export function ReviewForm({ initialDraft }: ReviewFormProps) {
  const router = useRouter();
  const submitSectionRef = useRef<HTMLDivElement>(null);
  const leafId = resolveDraftLeafId(initialDraft);

  const [draft, setDraft] = useState<ReportDraft>(() => {
    const resolvedLeaf = leafId || ("parking_blocked_sidewalk" as ComplaintLeafId);
    return {
      ...initialDraft,
      leafId: resolvedLeaf,
      issueFields: {
        ...emptyIssueFields(resolvedLeaf),
        ...(initialDraft.issueFields || {}),
        address: initialDraft.issueFields?.address || initialDraft.address.label,
      },
      aiPrefilledFields: initialDraft.aiPrefilledFields || [],
    };
  });
  const [descriptionManuallyEdited, setDescriptionManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identificationConfirmed, setIdentificationConfirmed] = useState<boolean>(
    Boolean(initialDraft.identificationVerification?.confirmed),
  );
  const [identificationRejected, setIdentificationRejected] = useState(false);

  useEffect(() => {
    if (!leafId || !initialDraft.categoryConfirmed) {
      router.replace(`/category/${initialDraft.id}`);
    }
  }, [initialDraft.categoryConfirmed, initialDraft.id, leafId, router]);

  const leaf = useMemo(
    () => (draft.leafId ? getLeafDefinition(draft.leafId) : null),
    [draft.leafId],
  );

  if (!leafId || !initialDraft.categoryConfirmed || !leaf) {
    return null;
  }
  const mustConfirmIdentification = needsIdentificationConfirmation(draft);
  const proceed = canProceedToSubmit(draft, identificationConfirmed);
  const canSubmit = canSubmitDraft({
    ...draft,
    identificationVerification: identificationConfirmed
      ? {
          confirmed: true,
          confirmedAt: draft.identificationVerification?.confirmedAt || new Date().toISOString(),
          originalLeafId: draft.identificationVerification?.originalLeafId || draft.leafId,
        }
      : draft.identificationVerification,
  });
  const displayTrustChecks = resolveTrustChecksForDisplay(
    draft.trustChecks,
    identificationConfirmed,
  );
  const descriptionNeedsEdit = needsDescriptionEdit(draft);
  const missingFieldLabels = missingIssueFieldLabels(draft);

  function applyIssueFields(nextFields: Record<string, string>, editedKey?: string) {
    setDraft((current) => {
      const nextPrefilled = editedKey
        ? (current.aiPrefilledFields || []).filter((key) => key !== editedKey)
        : current.aiPrefilledFields || [];
      const nextDescription = descriptionManuallyEdited
        ? current.description
        : compose311Description(current.leafId as ComplaintLeafId, nextFields, current.address.label);
      return {
        ...current,
        issueFields: nextFields,
        aiPrefilledFields: nextPrefilled,
        description: nextDescription,
      };
    });
    setIdentificationConfirmed(false);
    setIdentificationRejected(false);
  }

  async function refreshNearby(nextLocation: GeoPoint, nextLeafId: ComplaintLeafId) {
    const response = await fetch(
      `/api/nearby?lat=${nextLocation.lat}&lng=${nextLocation.lng}&leafId=${nextLeafId}`,
    );
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { nearbyRequests: ReportDraft["nearbyRequests"] };
    setDraft((current) => ({ ...current, nearbyRequests: payload.nearbyRequests }));
  }

  function confirmIdentification() {
    setIdentificationConfirmed(true);
    setIdentificationRejected(false);
    setDraft((current) => ({
      ...current,
      identificationVerification: {
        confirmed: true,
        confirmedAt: new Date().toISOString(),
        originalLeafId: current.leafId,
      },
    }));
    window.setTimeout(() => {
      submitSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  async function handleSubmit() {
    if (!proceed.ok) {
      setError(proceed.reason || "Complete the review steps before continuing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payloadDraft: ReportDraft = {
      ...draft,
      identificationVerification: identificationConfirmed
        ? {
            confirmed: true,
            confirmedAt: draft.identificationVerification?.confirmedAt || new Date().toISOString(),
            originalLeafId: draft.identificationVerification?.originalLeafId || draft.leafId,
          }
        : draft.identificationVerification,
    };

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadDraft),
      });

      const payload = (await response.json()) as {
        error?: string;
        reportId?: string;
        next?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit report.");
      }

      router.push(payload.next || `/success/${payload.reportId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  function submitButtonLabel(): string {
    if (submitting) return "Preparing handoff...";
    if (mustConfirmIdentification && !identificationConfirmed) {
      return "Confirm issue identification first";
    }
    if (descriptionNeedsEdit) return "Complete required 311 fields first";
    return "Create 311 handoff packet";
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Review report
        </p>
        <h1 className="mt-2 text-3xl font-bold">Confirm before filing</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Edit anything the AI got wrong. We&apos;ll open the official NYC311 form with a copy/paste
          packet for {leaf.label}.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="relative aspect-[4/3] w-full bg-slate-100">
          <Image
            src={draft.photoDataUrl}
            alt="Submitted street condition"
            fill
            unoptimized
            className="object-cover"
          />
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="field md:col-span-2">
            <label>311 complaint category</label>
            <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
              <p className="text-lg font-semibold">{leaf.label}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{leaf.descriptionHint}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Agency: {leaf.agency}</p>
              <Link href={`/category/${draft.id}`} className="mt-3 inline-block text-sm underline">
                Change category
              </Link>
            </div>
          </div>

          <div className="field">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              value={draft.address.label}
              onChange={(event) =>
                setDraft((current) => {
                  const nextAddress = event.target.value;
                  const nextFields = {
                    ...(current.issueFields || {}),
                    address: nextAddress,
                  };
                  return {
                    ...current,
                    address: { ...current.address, label: nextAddress },
                    issueFields: nextFields,
                    description: descriptionManuallyEdited
                      ? current.description
                      : compose311Description(
                          current.leafId as ComplaintLeafId,
                          nextFields,
                          nextAddress,
                        ),
                  };
                })
              }
            />
          </div>

          <div className="field md:col-span-2">
            <label htmlFor="description">Description for NYC 311</label>
            <textarea
              id="description"
              rows={4}
              value={draft.description}
              placeholder={`Example: ${leaf.descriptionHint}`}
              onChange={(event) => {
                setDescriptionManuallyEdited(true);
                setDraft((current) => {
                  setIdentificationConfirmed(false);
                  setIdentificationRejected(false);
                  return { ...current, description: event.target.value };
                });
              }}
            />
            {descriptionNeedsEdit && (
              <p className="mt-2 text-sm text-[var(--warning)]">
                Replace the placeholder text with a factual description before continuing.
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="lat">Latitude</label>
            <input
              id="lat"
              type="number"
              step="0.00001"
              value={draft.location.lat}
              onChange={async (event) => {
                const lat = Number(event.target.value);
                const nextLocation = { ...draft.location, lat };
                setDraft((current) => ({ ...current, location: nextLocation }));
                if (draft.leafId) {
                  await refreshNearby(nextLocation, draft.leafId);
                }
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="lng">Longitude</label>
            <input
              id="lng"
              type="number"
              step="0.00001"
              value={draft.location.lng}
              onChange={async (event) => {
                const lng = Number(event.target.value);
                const nextLocation = { ...draft.location, lng };
                setDraft((current) => ({ ...current, location: nextLocation }));
                if (draft.leafId) {
                  await refreshNearby(nextLocation, draft.leafId);
                }
              }}
            />
          </div>
        </div>
      </div>

      <IssueFieldsForm
        leafId={draft.leafId as ComplaintLeafId}
        values={draft.issueFields || emptyIssueFields(draft.leafId as ComplaintLeafId)}
        missingLabels={missingFieldLabels}
        prefilledKeys={draft.aiPrefilledFields || []}
        onChange={applyIssueFields}
      />

      <IssueIdentificationPanel
        draft={draft}
        confirmed={identificationConfirmed}
        rejected={identificationRejected}
        onConfirm={confirmIdentification}
        onReject={() => {
          setIdentificationConfirmed(false);
          setIdentificationRejected(true);
        }}
        canContinue={proceed.ok}
        continueLabel={submitButtonLabel()}
        onContinue={() => void handleSubmit()}
        continuing={submitting}
      />

      <div ref={submitSectionRef} className="card p-5">
        <h2 className="text-lg font-semibold">Trust checks</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Review items are reminders, not blockers. Confirming the issue above clears the
          low-confidence checks.
        </p>
        <div className="mt-4">
          <TrustChecks checks={displayTrustChecks} />
        </div>
      </div>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Nearby open 311 requests</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Avoid duplicate filings when the city is already tracking the same issue nearby.
        </p>
        <div className="mt-4">
          <NearbyRequests requests={draft.nearbyRequests} />
        </div>
      </section>

      {error && <p className="text-sm font-medium text-[var(--error)]">{error}</p>}

      {identificationConfirmed && proceed.ok && (
        <p className="text-sm font-medium text-[var(--success)]">
          Review complete. Continue to get your NYC311 handoff packet.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn btn-secondary" onClick={() => router.push("/")}>
          Retake photo
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSubmit || submitting}
          onClick={() => void handleSubmit()}
        >
          {submitButtonLabel()}
        </button>
      </div>
    </div>
  );
}
