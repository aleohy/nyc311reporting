import { readStoredReports } from "@/lib/storage";
import type { QueueStats, StoredReport } from "@/types/report";

/** Max free reports waiting at once. Protects volunteers from free-option pileups. */
export const FREE_QUEUE_CAP = 12;

/** Rough volunteer time per free report — used for wait estimates. */
export const MINUTES_PER_QUEUED_REPORT = 40;

/** When free wait exceeds this, UI recommends buying a coffee. */
export const COFFEE_RECOMMEND_WAIT_HOURS = 3;

export const COFFEE_TIP_CENTS = 500;

export function isActiveQueueReport(report: StoredReport): boolean {
  return (
    (report.status === "queued" || report.status === "claimed") &&
    (report.filingPath === "free_queue" || report.filingPath === "coffee_tip")
  );
}

export async function getQueueStats(): Promise<QueueStats> {
  const reports = await readStoredReports();
  const active = reports.filter(isActiveQueueReport);
  const freePending = active.filter((report) => report.filingPath === "free_queue").length;
  const coffeePending = active.filter((report) => report.filingPath === "coffee_tip").length;
  const estimatedWaitHours = Math.round(((freePending + coffeePending) * MINUTES_PER_QUEUED_REPORT) / 60 * 10) / 10;
  const freeAvailable = freePending < FREE_QUEUE_CAP;

  return {
    freePending,
    coffeePending,
    freeCap: FREE_QUEUE_CAP,
    freeAvailable,
    estimatedWaitHours,
    coffeeRecommended: !freeAvailable || estimatedWaitHours >= COFFEE_RECOMMEND_WAIT_HOURS,
  };
}

export function sortVolunteerQueue(reports: StoredReport[]): StoredReport[] {
  const priority = (report: StoredReport) => {
    if (report.filingPath === "coffee_tip" && report.status === "queued") return 0;
    if (report.filingPath === "coffee_tip" && report.status === "claimed") return 1;
    if (report.filingPath === "free_queue" && report.status === "queued") return 2;
    if (report.filingPath === "free_queue" && report.status === "claimed") return 3;
    return 9;
  };

  return [...reports]
    .filter(isActiveQueueReport)
    .sort((a, b) => {
      const byPriority = priority(a) - priority(b);
      if (byPriority !== 0) return byPriority;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });
}

export function freeQueuePosition(reports: StoredReport[], reportId: string): number {
  const freeQueued = reports
    .filter(
      (report) =>
        report.filingPath === "free_queue" &&
        (report.status === "queued" || report.status === "claimed"),
    )
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  const index = freeQueued.findIndex((report) => report.id === reportId);
  return index === -1 ? freeQueued.length + 1 : index + 1;
}
