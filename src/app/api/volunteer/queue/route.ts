import { NextResponse } from "next/server";

import { sortVolunteerQueue } from "@/lib/queue";
import { syncReportsCsv } from "@/lib/export";
import { getStoredReport, readStoredReports, updateStoredReport } from "@/lib/storage";
import { isVolunteerAuthenticated } from "@/lib/volunteer-auth";

export async function GET() {
  if (!(await isVolunteerAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await readStoredReports();
  const queue = sortVolunteerQueue(reports);
  return NextResponse.json({ queue });
}

export async function POST(request: Request) {
  if (!(await isVolunteerAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    reportId?: string;
    action?: "claim" | "unclaim" | "mark_filed";
    volunteerName?: string;
    serviceRequestNumber?: string;
  };

  if (!body.reportId || !body.action) {
    return NextResponse.json({ error: "reportId and action are required." }, { status: 400 });
  }

  const existing = await getStoredReport(body.reportId);
  if (!existing) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  if (body.action === "mark_filed") {
    const sr = body.serviceRequestNumber?.trim();
    if (!sr) {
      return NextResponse.json(
        { error: "serviceRequestNumber is required to mark filed." },
        { status: 400 },
      );
    }
  }

  const updated = await updateStoredReport(body.reportId, (report) => {
    if (body.action === "claim") {
      return {
        ...report,
        status: "claimed",
        claimedBy: body.volunteerName?.trim() || "volunteer",
        claimedAt: new Date().toISOString(),
      };
    }

    if (body.action === "unclaim") {
      return {
        ...report,
        status: "queued",
        claimedBy: undefined,
        claimedAt: undefined,
      };
    }

    const sr = body.serviceRequestNumber?.trim() || "";
    return {
      ...report,
      status: "filed",
      serviceRequestNumber: sr,
      filedAt: new Date().toISOString(),
      submitResult: {
        ...report.submitResult,
        mode: "queued",
        serviceRequestNumber: sr,
        message: `Filed with NYC 311. Service request number: ${sr}`,
      },
    };
  });

  await syncReportsCsv();
  return NextResponse.json({ report: updated });
}
