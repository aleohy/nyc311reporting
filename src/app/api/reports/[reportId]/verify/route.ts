import { NextResponse } from "next/server";

import { getStoredReport, updateStoredReport } from "@/lib/storage";
import type { FixVerificationStatus } from "@/types/report";

export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const report = await getStoredReport(reportId);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({
    report: {
      id: report.id,
      issueType: report.issueType,
      address: report.address,
      status: report.status,
      serviceRequestNumber: report.serviceRequestNumber,
      fixVerification: report.fixVerification,
      submittedAt: report.submittedAt,
    },
  });
}

interface VerifyBody {
  status: FixVerificationStatus;
  followUpPhotoDataUrl?: string;
  notes?: string;
  srStatusSnapshot?: Record<string, unknown>;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const body = (await request.json()) as VerifyBody;

  if (!body.status || body.status === "not_checked") {
    return NextResponse.json({ error: "A verification status is required." }, { status: 400 });
  }

  const updated = await updateStoredReport(reportId, (report) => ({
    ...report,
    fixVerification: {
      status: body.status,
      followUpPhotoDataUrl: body.followUpPhotoDataUrl,
      notes: body.notes?.trim() || undefined,
      verifiedAt: new Date().toISOString(),
      srStatusSnapshot: body.srStatusSnapshot,
    },
  }));

  if (!updated) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ report: updated });
}
