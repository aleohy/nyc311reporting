import type { GeoPoint } from "@/types/report";

const CURSOR_API_BASE = "https://api.cursor.com/v1";
const REQUEST_TIMEOUT_MS = 60000;
const MAX_POLL_ATTEMPTS = 20;

interface CursorRunResponse {
  id: string;
  agentId: string;
  status: string;
  result?: string;
}

interface CursorCreateResponse {
  agent: { id: string };
  run: { id: string; status: string };
}

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runCursorVisionPrompt(
  apiKey: string,
  prompt: string,
  image: { data: string; mimeType: string },
): Promise<string> {
  const createResponse = await fetchWithTimeout(`${CURSOR_API_BASE}/agents`, {
    method: "POST",
    headers: {
      Authorization: authHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: {
        text: prompt,
        images: [{ data: image.data, mimeType: image.mimeType }],
      },
      model: { id: "composer-2.5" },
    }),
  });

  if (!createResponse.ok) {
    const detail = await createResponse.text();
    throw new Error(`Cursor API error (${createResponse.status}): ${detail}`);
  }

  const created = (await createResponse.json()) as CursorCreateResponse;
  const agentId = created.agent.id;
  const runId = created.run.id;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(attempt === 0 ? 1000 : 2000);

    const runResponse = await fetchWithTimeout(
      `${CURSOR_API_BASE}/agents/${agentId}/runs/${runId}`,
      { headers: { Authorization: authHeader(apiKey) } },
      30000,
    );

    if (!runResponse.ok) {
      const detail = await runResponse.text();
      throw new Error(`Cursor run lookup failed (${runResponse.status}): ${detail}`);
    }

    const run = (await runResponse.json()) as CursorRunResponse;
    if (run.status === "FINISHED" && run.result) {
      return run.result;
    }

    if (run.status === "ERROR" || run.status === "CANCELLED" || run.status === "EXPIRED") {
      throw new Error(`Cursor run ended with status ${run.status}.`);
    }
  }

  throw new Error("Cursor classification timed out.");
}

export function formatLocation(location: GeoPoint): string {
  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}
