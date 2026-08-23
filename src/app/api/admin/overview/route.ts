import { NextResponse } from "next/server";

import { readFeedback } from "@/lib/storage";
import { getUsageSummary } from "@/lib/usage";
import { isVolunteerAuthenticated } from "@/lib/volunteer-auth";

export async function GET() {
  if (!(await isVolunteerAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [usage, feedback] = await Promise.all([getUsageSummary(), readFeedback()]);

  return NextResponse.json({
    usage,
    feedback: feedback.slice(0, 100),
    notify: {
      email: Boolean(process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY),
      webhook: Boolean(process.env.ADMIN_NOTIFY_WEBHOOK),
    },
  });
}
