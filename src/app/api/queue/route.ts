import { NextResponse } from "next/server";

import { getQueueStats } from "@/lib/queue";

export async function GET() {
  const stats = await getQueueStats();
  return NextResponse.json({ stats });
}
