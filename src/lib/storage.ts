import fs from "fs/promises";
import path from "path";

import type { FeedbackEntry, ReportDraft, StoredReport } from "@/types/report";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const DRAFTS_FILE = path.join(DATA_DIR, "drafts.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function ensureJsonFile(filePath: string): Promise<void> {
  await ensureDataDir();
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf8");
  }
}

export async function readStoredReports(): Promise<StoredReport[]> {
  await ensureJsonFile(REPORTS_FILE);
  const raw = await fs.readFile(REPORTS_FILE, "utf8");
  return JSON.parse(raw) as StoredReport[];
}

export async function writeStoredReports(reports: StoredReport[]): Promise<void> {
  await ensureJsonFile(REPORTS_FILE);
  await fs.writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), "utf8");
}

export async function saveStoredReport(report: StoredReport): Promise<void> {
  const reports = await readStoredReports();
  const without = reports.filter((item) => item.id !== report.id);
  without.unshift(report);
  await writeStoredReports(without.slice(0, 300));
}

export async function updateStoredReport(
  id: string,
  updater: (report: StoredReport) => StoredReport,
): Promise<StoredReport | undefined> {
  const reports = await readStoredReports();
  const index = reports.findIndex((report) => report.id === id);
  if (index === -1) {
    return undefined;
  }

  const updated = updater(reports[index]);
  reports[index] = updated;
  await writeStoredReports(reports);
  return updated;
}

export async function getStoredReport(id: string): Promise<StoredReport | undefined> {
  const reports = await readStoredReports();
  return reports.find((report) => report.id === id);
}

export async function saveDraft(draft: ReportDraft): Promise<void> {
  await ensureJsonFile(DRAFTS_FILE);
  const drafts = await readDrafts();
  const without = drafts.filter((item) => item.id !== draft.id);
  without.unshift(draft);
  await fs.writeFile(DRAFTS_FILE, JSON.stringify(without.slice(0, 100), null, 2), "utf8");
}

export async function readDrafts(): Promise<ReportDraft[]> {
  await ensureJsonFile(DRAFTS_FILE);
  const raw = await fs.readFile(DRAFTS_FILE, "utf8");
  return JSON.parse(raw) as ReportDraft[];
}

export async function getDraft(id: string): Promise<ReportDraft | undefined> {
  const drafts = await readDrafts();
  return drafts.find((draft) => draft.id === id);
}

export async function readFeedback(): Promise<FeedbackEntry[]> {
  await ensureJsonFile(FEEDBACK_FILE);
  const raw = await fs.readFile(FEEDBACK_FILE, "utf8");
  return JSON.parse(raw) as FeedbackEntry[];
}

export async function saveFeedback(entry: FeedbackEntry): Promise<void> {
  await ensureJsonFile(FEEDBACK_FILE);
  const entries = await readFeedback();
  entries.unshift(entry);
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(entries.slice(0, 1000), null, 2), "utf8");
}

export async function updateDraft(
  id: string,
  updater: (draft: ReportDraft) => ReportDraft,
): Promise<ReportDraft | undefined> {
  const drafts = await readDrafts();
  const index = drafts.findIndex((draft) => draft.id === id);
  if (index === -1) {
    return undefined;
  }

  const updated = updater(drafts[index]);
  drafts[index] = updated;
  await fs.writeFile(DRAFTS_FILE, JSON.stringify(drafts, null, 2), "utf8");
  return updated;
}
