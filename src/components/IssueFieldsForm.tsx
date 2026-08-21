"use client";

import type { ChangeEvent } from "react";

import type { ComplaintLeafId } from "@/lib/311-catalog";
import { getIssueFieldDefinitions, type IssueFieldDefinition } from "@/lib/issue-fields";

interface IssueFieldsFormProps {
  leafId: ComplaintLeafId;
  values: Record<string, string>;
  onChange: (nextValues: Record<string, string>, editedKey?: string) => void;
  missingLabels?: string[];
  prefilledKeys?: string[];
}

function FieldInput({
  definition,
  value,
  invalid,
  fromPhoto,
  onChange,
}: {
  definition: IssueFieldDefinition;
  value: string;
  invalid: boolean;
  fromPhoto: boolean;
  onChange: (value: string) => void;
}) {
  const commonProps = {
    id: definition.key,
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(event.target.value),
    className: invalid ? "border-[var(--error)]" : undefined,
  };

  return (
    <div className="field">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={definition.key}>
          {definition.label}
          {definition.required ? " *" : ""}
        </label>
        {fromPhoto && <span className="badge badge-info">From photo</span>}
      </div>
      {definition.type === "select" ? (
        <select {...commonProps}>
          <option value="">Select...</option>
          {definition.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...commonProps}
          type={definition.type}
          placeholder={definition.placeholder}
        />
      )}
      {definition.helpText && <p className="text-sm text-[var(--muted)]">{definition.helpText}</p>}
      {invalid && (
        <p className="text-sm text-[var(--error)]">Required for NYC 311 filing.</p>
      )}
    </div>
  );
}

export function IssueFieldsForm({
  leafId,
  values,
  onChange,
  missingLabels = [],
  prefilledKeys = [],
}: IssueFieldsFormProps) {
  const definitions = getIssueFieldDefinitions(leafId);

  if (definitions.length === 0) {
    return null;
  }

  const whereFields = definitions.filter((definition) => definition.page === "where");
  const detailFields = definitions.filter((definition) => definition.page !== "where");

  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold">311 details for this complaint</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        AI fills only what it can read from your photo. Verify every field before filing — especially
        license plates.
      </p>

      {whereFields.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Where</h3>
          <div className="mt-3 grid gap-5 md:grid-cols-2">
            {whereFields.map((definition) => (
              <FieldInput
                key={definition.key}
                definition={definition}
                value={values[definition.key] || ""}
                invalid={missingLabels.includes(definition.label)}
                fromPhoto={prefilledKeys.includes(definition.key)}
                onChange={(nextValue) =>
                  onChange({ ...values, [definition.key]: nextValue }, definition.key)
                }
              />
            ))}
          </div>
        </div>
      )}

      {detailFields.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Details
          </h3>
          <div className="mt-3 grid gap-5 md:grid-cols-2">
            {detailFields.map((definition) => (
              <FieldInput
                key={definition.key}
                definition={definition}
                value={values[definition.key] || ""}
                invalid={missingLabels.includes(definition.label)}
                fromPhoto={prefilledKeys.includes(definition.key)}
                onChange={(nextValue) =>
                  onChange({ ...values, [definition.key]: nextValue }, definition.key)
                }
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
