import type { NearbyRequest } from "@/types/report";

function relativeDay(iso: string): string {
  if (!iso) return "date unknown";

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "date unknown";

  const days = Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function RequestRow({ request }: { request: NearbyRequest }) {
  return (
    <div className="rounded-2xl border border-black/5 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{request.descriptor || request.complaintType}</p>
        <span className={request.isActive ? "badge badge-warning" : "badge badge-info"}>
          {request.isActive ? "Still open" : "Closed"}
        </span>
      </div>
      {request.incidentAddress && (
        <p className="mt-2 text-sm text-[var(--muted)]">{request.incidentAddress}</p>
      )}
      <p className="mt-1 text-xs text-[var(--muted)]">
        Reported {relativeDay(request.createdDate)} · {request.distanceMeters}m away · #
        {request.uniqueKey}
      </p>
    </div>
  );
}

export function NearbyRequests({
  requests,
  radiusMeters = 120,
  lookbackDays = 14,
  categoryLabel,
  exactCategoryMatch = true,
}: {
  requests: NearbyRequest[];
  radiusMeters?: number;
  lookbackDays?: number;
  categoryLabel?: string;
  /** False when NYC Open Data has no descriptor matching this category. */
  exactCategoryMatch?: boolean;
}) {
  const active = requests.filter((request) => request.isActive);
  const closed = requests.filter((request) => !request.isActive);

  const scope = exactCategoryMatch && categoryLabel ? `"${categoryLabel}"` : "illegal parking";

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-[var(--muted)]">
        No {scope} reports filed within {radiusMeters}m in the last {lookbackDays} days. Yours looks
        like the first.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!exactCategoryMatch && (
        <p className="text-xs text-[var(--muted)]">
          NYC&rsquo;s public data has no exact match for this category, so these are all illegal
          parking reports nearby.
        </p>
      )}

      {active.length > 0 && (
        <div>
          <p className="text-sm font-semibold">
            {active.length} report{active.length === 1 ? "" : "s"} still open nearby
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            The city has not closed {active.length === 1 ? "this one" : "these"} yet. Filing again
            may create a duplicate.
          </p>
          <div className="mt-3 space-y-3">
            {active.map((request) => (
              <RequestRow key={request.uniqueKey} request={request} />
            ))}
          </div>
        </div>
      )}

      {closed.length > 0 && (
        <div>
          <p className="text-sm font-semibold">
            {closed.length} recently closed nearby
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Police responded and closed {closed.length === 1 ? "this" : "these"}. If the vehicle is
            back, filing again is appropriate — repeat reports build a record for the location.
          </p>
          <div className="mt-3 space-y-3">
            {closed.map((request) => (
              <RequestRow key={request.uniqueKey} request={request} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
