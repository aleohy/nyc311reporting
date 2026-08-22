import type { FeedbackEntry } from "@/types/report";

const CATEGORY_LABELS: Record<FeedbackEntry["category"], string> = {
  wrong_category: "Wrong category suggestion",
  missing_field: "Missing or wrong field",
  bug: "Something is broken",
  idea: "Idea",
  other: "Something else",
};

function feedbackText(entry: FeedbackEntry): string {
  const lines = [
    `New feedback on NYC Street Report`,
    `Category: ${CATEGORY_LABELS[entry.category]}`,
    `When: ${entry.createdAt}`,
    entry.pagePath ? `Page: ${entry.pagePath}` : "",
    entry.email ? `Reply-to: ${entry.email}` : "Reply-to: (anonymous)",
    "",
    entry.message,
  ];
  return lines.filter((line) => line !== "").join("\n");
}

async function notifyEmail(entry: FeedbackEntry): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!apiKey || !to) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "NYC Street Report <onboarding@resend.dev>",
      to: [to],
      subject: `Feedback: ${CATEGORY_LABELS[entry.category]}`,
      text: feedbackText(entry),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${detail}`);
  }
}

async function notifyWebhook(entry: FeedbackEntry): Promise<void> {
  const webhook = process.env.ADMIN_NOTIFY_WEBHOOK;
  if (!webhook) return;

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: feedbackText(entry),
      content: feedbackText(entry),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Notify webhook failed (${response.status}): ${detail}`);
  }
}

export function notifyFeedback(entry: FeedbackEntry): void {
  void (async () => {
    try {
      await notifyEmail(entry);
    } catch (error) {
      console.error("Feedback email notify failed:", error);
    }
    try {
      await notifyWebhook(entry);
    } catch (error) {
      console.error("Feedback webhook notify failed:", error);
    }
  })();
}
