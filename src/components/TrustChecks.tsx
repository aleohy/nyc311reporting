import type { TrustCheckResult } from "@/types/report";

function badgeClass(severity: TrustCheckResult["severity"], passed: boolean): string {
  if (!passed && severity === "error") return "badge badge-error";
  if (severity === "warning") return "badge badge-warning";
  if (passed) return "badge badge-success";
  return "badge badge-info";
}

export function TrustChecks({ checks }: { checks: TrustCheckResult[] }) {
  return (
    <div className="space-y-3">
      {checks.map((check) => (
        <div
          key={check.id}
          className="flex items-start justify-between gap-3 rounded-2xl border border-black/5 px-4 py-3"
        >
          <p className="text-sm leading-6 text-[var(--muted)]">{check.message}</p>
          <span className={badgeClass(check.severity, check.passed)}>
            {!check.passed && check.severity === "error"
              ? "Blocked"
              : check.severity === "warning"
                ? "Review"
                : "OK"}
          </span>
        </div>
      ))}
    </div>
  );
}
