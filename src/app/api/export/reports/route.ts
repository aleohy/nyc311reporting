import { NextResponse } from "next/server";

import { readReportsCsv, syncReportsCsv } from "@/lib/export";
import { isVolunteerAuthenticated } from "@/lib/volunteer-auth";

export async function GET() {
  if (!(await isVolunteerAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncReportsCsv();
  const csv = await readReportsCsv();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nyc-reports.csv"',
    },
  });
}
