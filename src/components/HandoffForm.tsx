"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getLeafDefinition } from "@/lib/311-catalog";
import { NearbyRequests } from "@/components/NearbyRequests";
import { StepNav } from "@/components/StepNav";
import { compose311Description, emptyIssueFields, resolveDraftLeafId } from "@/lib/issue-fields";
import type { ReportDraft } from "@/types/report";

interface HandoffFormProps {
  initialDraft: ReportDraft;
}

function CopyButton({
  label,
  text,
  disabled,
  onCopy,
}: {
  label: string;
  text: string;
  disabled?: boolean;
  onCopy: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-secondary shrink-0"
      disabled={disabled || !text.trim()}
      onClick={() => {
        void onCopy().then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      <span aria-live="polite">{copied ? "Copied!" : label}</span>
    </button>
  );
}

export function HandoffForm({ initialDraft }: HandoffFormProps) {
  const router = useRouter();
  const leafId = resolveDraftLeafId(initialDraft);
  const [description, setDescription] = useState(initialDraft.description);
  const [issueFields, setIssueFields] = useState<Record<string, string>>(() => ({
    ...emptyIssueFields(leafId || "parking_blocked_sidewalk"),
    ...(initialDraft.issueFields || {}),
    address: initialDraft.issueFields?.address || initialDraft.address.label,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leaf = useMemo(() => (leafId ? getLeafDefinition(leafId) : null), [leafId]);

  useEffect(() => {
    if (!leafId || !initialDraft.categoryConfirmed) {
      router.replace(`/category/${initialDraft.id}`);
    }
  }, [initialDraft.categoryConfirmed, initialDraft.id, leafId, router]);

  if (!leafId || !initialDraft.categoryConfirmed || !leaf) {
    return null;
  }

  const formUrl = leaf.formUrl;
  const resolvedLeafId = leafId;
  const incidentAddress = issueFields.address || initialDraft.address.label;

  const nearbyRequests = initialDraft.nearbyRequests || [];
  const hasExactOpenDataMatch = Boolean(leaf.openDataQuery.descriptors?.length);

  async function persistDraft(): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/drafts/${initialDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, issueFields }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save handoff details.");
      }
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save handoff details.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, emptyMessage: string) {
    if (!text.trim()) {
      setError(emptyMessage);
      return;
    }
    const saved = await persistDraft();
    if (saved) {
      await navigator.clipboard.writeText(text.trim());
    }
  }

  async function openOfficialForm() {
    if (!description.trim()) {
      setError("Add a description before opening the form.");
      return;
    }
    const saved = await persistDraft();
    if (saved) {
      window.open(formUrl, "_blank", "noopener,noreferrer");
    }
  }

  function updateAddress(value: string) {
    setIssueFields((current) => {
      const nextFields = { ...current, address: value };
      setDescription(compose311Description(resolvedLeafId, nextFields, value));
      return nextFields;
    });
  }

  return (
    <div className="page-shell flex max-w-3xl flex-col gap-6">
      <div className="app-header">
        <StepNav current="file" reportId={initialDraft.id} furthestReached="file" />
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Prepare information for the report
        </p>
        <h1 className="mt-2 text-4xl text-pretty">Copy your details into NYC311</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          We currently do not have the capability to submit the 311 report directly for you, but we
          pre-filled some information that you can copy onto the website.
        </p>
      </div>

      <section className="card p-5">
        <ol className="list-decimal space-y-8 pl-5">
          <li>
            <p className="text-lg font-semibold">
              Click on 311 complaint link for {leaf.label}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This opens the official NYC311 form with your complaint type pre-selected.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void openOfficialForm()}
              >
                {saving ? "Saving…" : `Open 311 link for ${leaf.label}`}
              </button>
              <Link
                href={`/category/${initialDraft.id}?change=1`}
                className="btn btn-secondary"
              >
                Change category
              </Link>
            </div>
          </li>

          <li>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-lg font-semibold">
                Edit and copy description pre-filled by the tool for the link
              </p>
              <CopyButton
                label="Copy description"
                text={description}
                disabled={saving}
                onCopy={() => copyText(description, "Add a description before copying.")}
              />
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Review the draft below, adjust anything that needs correcting, then copy it into the
              Description field on NYC311.
            </p>
            <div className="field mt-4">
              <label htmlFor="description-top">Description</label>
              <textarea
                id="description-top"
                rows={6}
                value={description}
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                {2000 - description.length} characters remaining (NYC311 limit)
              </p>
            </div>
          </li>

          <li>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-lg font-semibold">Where</p>
              <CopyButton
                label="Copy address"
                text={incidentAddress}
                disabled={saving}
                onCopy={() => copyText(incidentAddress, "Add an address before copying.")}
              />
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">
              NYC311 looks this up with an address search box, so copy or type the address of
              incident directly on the complaint link.
            </p>
            <div className="field mt-4">
              <label htmlFor="incident-address">Address of incident</label>
              <input
                id="incident-address"
                name="address"
                type="text"
                autoComplete="street-address"
                value={incidentAddress}
                onChange={(event) => updateAddress(event.target.value)}
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Looked up from your photo&rsquo;s GPS location — edit if the pin was off.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {error && (
        <p className="text-sm font-medium text-[var(--error)]" role="alert">
          {error}
        </p>
      )}

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Already reported nearby?</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Live data from NYC Open Data (311 Service Requests) within 120m of{" "}
          {initialDraft.address.label} over the last 14 days.
        </p>
        <div className="mt-4">
          <NearbyRequests
            requests={nearbyRequests}
            categoryLabel={leaf.label}
            exactCategoryMatch={hasExactOpenDataMatch}
          />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn btn-secondary">
          Report Another Issue
        </Link>
        <Link href="/feedback" className="btn btn-secondary">
          Send Feedback
        </Link>
      </div>
    </div>
  );
}
