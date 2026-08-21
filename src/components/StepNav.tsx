import Link from "next/link";

export type FlowStep = "photo" | "category" | "file";

const STEPS: { id: FlowStep; label: string; shortLabel: string }[] = [
  { id: "photo", label: "Upload photo", shortLabel: "Photo" },
  {
    id: "category",
    label: "Pick the right complaint category",
    shortLabel: "Category",
  },
  {
    id: "file",
    label: "Prepare information for the report",
    shortLabel: "Prepare",
  },
];

function stepHref(step: FlowStep, reportId?: string): string | null {
  if (step === "photo") return "/";
  if (!reportId) return null;
  return step === "category" ? `/category/${reportId}` : `/handoff/${reportId}`;
}

/**
 * Shows where the user is in the capture → category → file flow, and lets them
 * jump back to any step they have already completed.
 */
export function StepNav({
  current,
  reportId,
  furthestReached = current,
}: {
  current: FlowStep;
  reportId?: string;
  /** The deepest step the user has unlocked; later steps render as plain text. */
  furthestReached?: FlowStep;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  const reachedIndex = STEPS.findIndex((step) => step.id === furthestReached);

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isReachable = index <= Math.max(reachedIndex, currentIndex);
          const href = isReachable && !isCurrent ? stepHref(step.id, reportId) : null;

          const numberClasses = isCurrent
            ? "bg-[var(--ink)] text-[var(--background)]"
            : isReachable
              ? "bg-[rgba(132,204,22,0.22)] text-[var(--accent-dark)]"
              : "bg-black/5 text-[var(--muted)]";

          const labelClasses = isCurrent
            ? "font-semibold text-[var(--foreground)]"
            : "text-[var(--muted)]";

          const content = (
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${numberClasses}`}
              >
                {index + 1}
              </span>
              <span className={labelClasses}>
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </span>
          );

          return (
            <li key={step.id} className="flex items-center gap-1">
              {href ? (
                <Link
                  href={href}
                  className="rounded-full px-2 py-1 transition-colors hover:bg-black/5"
                >
                  {content}
                </Link>
              ) : (
                <span className="px-2 py-1" aria-current={isCurrent ? "step" : undefined}>
                  {content}
                </span>
              )}
              {index < STEPS.length - 1 && (
                <span aria-hidden="true" className="px-1 text-[var(--muted)]">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
