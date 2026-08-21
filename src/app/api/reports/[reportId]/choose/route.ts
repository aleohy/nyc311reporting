import { NextResponse } from "next/server";

import { getStoredReport } from "@/lib/storage";

/** Legacy volunteer choose endpoint — disabled in Phase 1 handoff flow. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await context.params;
  const report = await getStoredReport(reportId);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({
    next: `/success/${reportId}`,
    message: "Volunteer filing is disabled. Use the handoff packet on the success page.",
  });
}
