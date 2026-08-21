import { NextResponse } from "next/server";

import { createHandoffPacket } from "@/lib/nyc311/submit";
import { saveReportPhoto, syncReportsCsv } from "@/lib/export";
import { resolveDraftLeafId } from "@/lib/issue-fields";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveStoredReport } from "@/lib/storage";
import { canSubmitDraft } from "@/lib/trust-validation";
import type { ReportDraft, StoredReport } from "@/types/report";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateLimit = checkRateLimit(`submit:${ip}`);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many submissions. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
      { status: 429 },
    );
  }

  try {
    const draft = (await request.json()) as ReportDraft;
    const leafId = resolveDraftLeafId(draft);

    if (!draft?.id || !draft.photoDataUrl || !draft.description || !leafId || !draft.categoryConfirmed) {
      return NextResponse.json({ error: "A complete report draft is required." }, { status: 400 });
    }

    if (!canSubmitDraft(draft)) {
      return NextResponse.json(
        { error: "Complete the review steps before submitting." },
        { status: 422 },
      );
    }

    const submitResult = await createHandoffPacket({ ...draft, leafId });
    const status = submitResult.mode === "partner" ? "filed" : "handoff_ready";

    const storedReport: StoredReport = {
      ...draft,
      leafId,
      submittedAt: new Date().toISOString(),
      status,
      serviceRequestNumber: submitResult.serviceRequestNumber,
      filedAt: submitResult.serviceRequestNumber ? new Date().toISOString() : undefined,
      submitResult,
      fixVerification: { status: "not_checked" },
    };

    await saveStoredReport(storedReport);
    await saveReportPhoto(draft.id, draft.photoDataUrl);
    await syncReportsCsv();

    return NextResponse.json({
      submitResult,
      reportId: draft.id,
      next: `/success/${draft.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
