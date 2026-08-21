import { redirect } from "next/navigation";

interface ReviewPageProps {
  params: Promise<{ reportId: string }>;
}

/** Legacy route — Phase 1 handoff lives at /handoff */
export default async function ReviewPage({ params }: ReviewPageProps) {
  const { reportId } = await params;
  redirect(`/handoff/${reportId}`);
}
