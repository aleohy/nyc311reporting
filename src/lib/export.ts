import fs from "fs/promises";
import path from "path";

import { getLeafDefinition } from "@/lib/311-catalog";
import { getIssueTypeDefinition } from "@/lib/constants";
import { allIssueFieldKeys, flattenIssueFields, resolveDraftLeafId } from "@/lib/issue-fields";
import { readStoredReports } from "@/lib/storage";
import type { StoredReport } from "@/types/report";

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_CSV = path.join(DATA_DIR, "reports.csv");
const PHOTOS_DIR = path.join(DATA_DIR, "photos");

const BASE_COLUMNS = [
  "report_id",
  "submitted_at",
  "updated_at",
  "status",
  "leaf_id",
  "issue_type",
  "complaint_type",
  "address",
  "borough",
  "latitude",
  "longitude",
  "description",
  "service_request_number",
  "filed_at",
  "photo_file",
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function reportUpdatedAt(report: StoredReport): string {
  return report.filedAt || report.submittedAt;
}

function reportToRow(report: StoredReport): string[] {
  const leafId = resolveDraftLeafId(report);
  const complaintType = leafId
    ? getLeafDefinition(leafId).openDataQuery.complaintType
    : report.issueType
      ? getIssueTypeDefinition(report.issueType as never).complaintType
      : "";
  const fieldValues = flattenIssueFields(report);
  const base = [
    report.id,
    report.submittedAt,
    reportUpdatedAt(report),
    report.status,
    leafId || "",
    report.issueType || leafId || "",
    complaintType,
    report.address.label,
    report.address.borough || report.issueFields?.borough || "",
    report.location.lat.toFixed(5),
    report.location.lng.toFixed(5),
    report.description,
    report.serviceRequestNumber || "",
    report.filedAt || "",
    `photos/${report.id}.jpg`,
  ];

  return [...base, ...allIssueFieldKeys().map((key) => fieldValues[key] || "")];
}

export function getReportsCsvPath(): string {
  return REPORTS_CSV;
}

export async function saveReportPhoto(reportId: string, photoDataUrl: string): Promise<void> {
  const match = photoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return;
  }

  await fs.mkdir(PHOTOS_DIR, { recursive: true });
  await fs.writeFile(path.join(PHOTOS_DIR, `${reportId}.jpg`), Buffer.from(match[2], "base64"));
}

export async function syncReportsCsv(): Promise<void> {
  const reports = await readStoredReports();
  const header = [...BASE_COLUMNS, ...allIssueFieldKeys()];
  const rows = reports.map((report) => reportToRow(report).map(csvEscape).join(","));
  const csv = [header.join(","), ...rows].join("\n");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REPORTS_CSV, csv, "utf8");
}

export async function readReportsCsv(): Promise<string> {
  try {
    return await fs.readFile(REPORTS_CSV, "utf8");
  } catch {
    await syncReportsCsv();
    return fs.readFile(REPORTS_CSV, "utf8");
  }
}
