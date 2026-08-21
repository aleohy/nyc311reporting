import { notFound } from "next/navigation";

import { FixVerificationForm } from "@/components/FixVerificationForm";
import { getStoredReport } from "@/lib/storage";

interface VerifyPageProps {
  params: Promise<{ reportId: string }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { reportId } = await params;
  const report = await getStoredReport(reportId);

  if (!report) {
    notFound();
  }

  return <FixVerificationForm report={report} />;
}
