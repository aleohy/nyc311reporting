import Link from "next/link";
import { notFound } from "next/navigation";

import { getLeafDefinition } from "@/lib/311-catalog";
import { fixStatusDescription, fixStatusLabel, issueLabel } from "@/lib/verification";
import { getStoredReport } from "@/lib/storage";

interface TrackPageProps {
  params: Promise<{ reportId: string }>;
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { reportId } = await params;
  const report = await getStoredReport(reportId);

  if (!report) {
    notFound();
  }

  const leaf = report.leafId ? getLeafDefinition(report.leafId) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Track report
        </p>
        <h1 className="mt-2 text-3xl font-bold">Status: {report.status.replaceAll("_", " ")}</h1>
        <p className="mt-2 text-[var(--muted)]">
          {report.status === "handoff_ready"
            ? "Handoff packet created — file on NYC311 when ready."
            : "Report saved in this app."}
        </p>
      </div>

      <div className="card space-y-3 p-5 text-sm">
        <p>
          <span className="font-semibold">Issue:</span> {issueLabel(report)}
        </p>
        {leaf && (
          <p>
            <span className="font-semibold">Agency:</span> {leaf.agency}
          </p>
        )}
        <p>
          <span className="font-semibold">Address:</span> {report.address.label}
        </p>
        {report.serviceRequestNumber && (
          <p>
            <span className="font-semibold">311 number:</span> {report.serviceRequestNumber}
          </p>
        )}
        <p>
          <span className="font-semibold">Fix verification:</span>{" "}
          {fixStatusLabel(report.fixVerification?.status ?? "not_checked")}
        </p>
        <p className="text-[var(--muted)]">
          {fixStatusDescription(report.fixVerification?.status ?? "not_checked")}
        </p>
        <p className="text-[var(--muted)]">
          Submitted {new Date(report.submittedAt).toLocaleString()}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/success/${reportId}`} className="btn btn-primary">
          View handoff packet
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
