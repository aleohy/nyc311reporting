import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { isComplaintLeafId } from "@/lib/311-catalog";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveFeedback } from "@/lib/storage";
import type { FeedbackCategory, FeedbackEntry } from "@/types/report";

const MAX_MESSAGE_LENGTH = 2000;

const CATEGORIES: FeedbackCategory[] = [
  "wrong_category",
  "missing_field",
  "bug",
  "idea",
  "other",
];

interface FeedbackRequestBody {
  category?: string;
  message?: string;
  email?: string;
  reportId?: string;
  leafId?: string;
  pagePath?: string;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rateLimit = checkRateLimit(`feedback:${ip}`);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too much feedback too quickly. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
      { status: 429 },
    );
  }

  let body: FeedbackRequestBody;
  try {
    body = (await request.json()) as FeedbackRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (message.length < 3) {
    return NextResponse.json({ error: "Tell us a little more first." }, { status: 400 });
  }

  const category = CATEGORIES.includes(body.category as FeedbackCategory)
    ? (body.category as FeedbackCategory)
    : "other";

  const email = (body.email || "").trim();
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }

  const entry: FeedbackEntry = {
    id: uuidv4(),
    category,
    message: message.slice(0, MAX_MESSAGE_LENGTH),
    email: email || undefined,
    reportId: body.reportId,
    leafId: body.leafId && isComplaintLeafId(body.leafId) ? body.leafId : undefined,
    pagePath: body.pagePath,
    createdAt: new Date().toISOString(),
  };

  await saveFeedback(entry);

  return NextResponse.json({ ok: true, id: entry.id });
}
