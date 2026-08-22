import { v4 as uuidv4 } from "uuid";

import { getLeafDefinition, isComplaintLeafId } from "@/lib/311-catalog";
import { readEvents, saveEvent } from "@/lib/storage";
import type { ComplaintLeafId } from "@/lib/311-catalog";
import type { UsageEvent, UsageEventName } from "@/types/report";

const EVENT_NAMES: UsageEventName[] = [
  "page_view",
  "photo_uploaded",
  "category_chosen",
  "nyc311_opened",
  "feedback_received",
];

export function isUsageEventName(value: string): value is UsageEventName {
  return EVENT_NAMES.includes(value as UsageEventName);
}

export async function recordUsageEvent(input: {
  name: UsageEventName;
  path?: string;
  leafId?: ComplaintLeafId;
}): Promise<void> {
  await saveEvent({
    id: uuidv4(),
    name: input.name,
    createdAt: new Date().toISOString(),
    path: input.path,
    leafId: input.leafId,
  });
}

export function recordUsageEventSafe(input: {
  name: UsageEventName;
  path?: string;
  leafId?: ComplaintLeafId;
}): void {
  void recordUsageEvent(input).catch((error) => {
    console.error("Unable to record usage event:", error);
  });
}

interface PeriodCounts {
  pageViews: number;
  photosUploaded: number;
  categoriesChosen: number;
  nyc311Opened: number;
  feedbackReceived: number;
}

function emptyCounts(): PeriodCounts {
  return {
    pageViews: 0,
    photosUploaded: 0,
    categoriesChosen: 0,
    nyc311Opened: 0,
    feedbackReceived: 0,
  };
}

function countEvents(events: UsageEvent[], sinceMs: number | null): PeriodCounts {
  const counts = emptyCounts();
  for (const event of events) {
    const time = new Date(event.createdAt).getTime();
    if (Number.isNaN(time)) continue;
    if (sinceMs !== null && time < sinceMs) continue;

    if (event.name === "page_view") counts.pageViews += 1;
    if (event.name === "photo_uploaded") counts.photosUploaded += 1;
    if (event.name === "category_chosen") counts.categoriesChosen += 1;
    if (event.name === "nyc311_opened") counts.nyc311Opened += 1;
    if (event.name === "feedback_received") counts.feedbackReceived += 1;
  }
  return counts;
}

export async function getUsageSummary() {
  const events = await readEvents();
  const now = Date.now();
  const last7 = now - 7 * 24 * 60 * 60 * 1000;
  const last30 = now - 30 * 24 * 60 * 60 * 1000;

  const categoryCounts = new Map<string, number>();
  const pageCounts = new Map<string, number>();

  for (const event of events) {
    if (event.name === "category_chosen" && event.leafId && isComplaintLeafId(event.leafId)) {
      const label = getLeafDefinition(event.leafId).label;
      categoryCounts.set(label, (categoryCounts.get(label) || 0) + 1);
    }
    if (event.name === "page_view" && event.path) {
      pageCounts.set(event.path, (pageCounts.get(event.path) || 0) + 1);
    }
  }

  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }));

  return {
    last7Days: countEvents(events, last7),
    last30Days: countEvents(events, last30),
    allTime: countEvents(events, null),
    topCategories,
    topPages,
    totalEvents: events.length,
  };
}
