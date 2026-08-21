import { redirect } from "next/navigation";

import { getStoredReport } from "@/lib/storage";

interface ChoosePageProps {
  params: Promise<{ reportId: string }>;
}

/** Legacy route — Phase 1 goes straight to success after review. */
export default async function ChoosePage({ params }: ChoosePageProps) {
  const { reportId } = await params;
  const report = await getStoredReport(reportId);

  if (report) {
    redirect(`/success/${reportId}`);
  }

  redirect(`/category/${reportId}`);
}
