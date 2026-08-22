import { NextResponse } from "next/server";

import { isComplaintLeafId } from "@/lib/311-catalog";
import { checkRateLimit } from "@/lib/rate-limit";
import { isUsageEventName, recordUsageEvent } from "@/lib/usage";

const CLIENT_EVENTS = new Set(["page_view", "nyc311_opened"]);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateLimit = checkRateLimit(`events:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: true });
  }

  let body: { name?: string; path?: string; leafId?: string };
  try {
    body = (await request.json()) as { name?: string; path?: string; leafId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.name || !isUsageEventName(body.name) || !CLIENT_EVENTS.has(body.name)) {
    return NextResponse.json({ error: "Unknown event." }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path.slice(0, 200) : undefined;
  const leafId = body.leafId && isComplaintLeafId(body.leafId) ? body.leafId : undefined;

  try {
    await recordUsageEvent({ name: body.name, path, leafId });
  } catch (error) {
    console.error("Unable to save usage event:", error);
  }

  return NextResponse.json({ ok: true });
}
