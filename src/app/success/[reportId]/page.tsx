import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyPacketPanel } from "@/components/CopyPacketPanel";
import { getLeafDefinition } from "@/lib/311-catalog";
import { getStoredReport } from "@/lib/storage";

interface SuccessPageProps {
  params: Promise<{ reportId: string }>;
}

export default async function SuccessPage({ params }: SuccessPageProps) {
  const { reportId } = await params;
  const report = await getStoredReport(reportId);

  if (!report) {
    notFound();
  }

  const { submitResult } = report;
  const isFiled = report.status === "filed";
  const leaf = report.leafId ? getLeafDefinition(report.leafId) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--success)]">
          {isFiled ? "Filed" : "Handoff ready"}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          {isFiled ? "Submitted to NYC 311" : "File on NYC311"}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{submitResult.message}</p>
        {leaf && (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Complaint: {leaf.label} ({leaf.agency})
          </p>
        )}
      </div>

      {(submitResult.serviceRequestNumber || report.serviceRequestNumber) && (
        <div className="card p-5">
          <p className="text-sm uppercase tracking-wide text-[var(--muted)]">Service request number</p>
          <p className="mt-2 text-2xl font-bold">
            {report.serviceRequestNumber || submitResult.serviceRequestNumber}
          </p>
        </div>
      )}

      {!isFiled && (
        <CopyPacketPanel
          handoffUrl={submitResult.handoffUrl}
          summary={submitResult.summary}
          pages={submitResult.packetPages}
        />
      )}

      {isFiled && (
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Submitted details</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            {submitResult.summary}
          </pre>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {!isFiled && (
          <a href={submitResult.handoffUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
            Open NYC311 form
          </a>
        )}
        <Link href={`/track/${reportId}`} className="btn btn-secondary">
          Track this report
        </Link>
        <Link href={`/verify/${reportId}`} className="btn btn-secondary">
          Verify if fixed
        </Link>
        <Link href="/" className="btn btn-secondary">
          Report another issue
        </Link>
      </div>
    </div>
  );
}
