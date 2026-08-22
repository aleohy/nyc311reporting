import {
  type CategoryCandidate,
  type ComplaintLeafId,
  buildCopyPacket,
  catalogPromptSection,
  candidatesFromIds,
  defaultCandidates,
  emptyFieldsForLeaf,
  getLeafDefinition,
  isComplaintLeafId,
  mergeAiIssueFieldsFromCatalog,
  pickAlternativeCandidates,
} from "@/lib/311-catalog";
import { formatLocation, runCursorVisionPrompt } from "@/lib/cursor-api";
import { runGeminiVisionPrompt } from "@/lib/gemini-vision";
import { runOpenAiVisionPrompt } from "@/lib/openai-vision";
import type { GeoPoint } from "@/types/report";

export interface ClassificationResult {
  candidates: CategoryCandidate[];
  topLeafId: ComplaintLeafId;
  description: string;
  confidence: number;
  isStreetIssue: boolean;
  isLikelyFake: boolean;
  fakeReason?: string;
  usedAi: boolean;
  aiTimedOut: boolean;
  issueFields: Record<string, string>;
  aiPrefilledFields: string[];
}

const AI_TIMEOUT_MS = 90000;

function buildPrompt(location: GeoPoint, exclude: ComplaintLeafId[] = []): string {
  const excludeNote =
    exclude.length > 0 ? `\nDo NOT suggest these (user rejected them): ${exclude.join(", ")}` : "";

  return `You classify NYC street photos for 311 illegal parking complaints.

Study the photo carefully. Look at WHERE the vehicle's tires are:
- Tires on sidewalk/pavement next to a building or pedestrian path → parking_blocked_sidewalk
- Tires in the street travel lane, parallel to traffic, blocking flow → parking_double_parked
- Blocking a driveway apron/entrance → parking_blocked_driveway
- Within ~15 feet of a yellow/red fire hydrant → parking_blocked_hydrant
- Blocking a marked crosswalk or zebra stripes → parking_blocked_crosswalk
- In a painted green bike lane → parking_blocked_bike_lane
- In a red/bus-only lane or at a bus stop curb → parking_blocked_bus_lane or parking_blocked_bus_stop
- Marked city/government vehicle (official plates/markings) on sidewalk → parking_city_vehicle_sidewalk
- In a posted No Standing / No Stopping zone → parking_no_standing / parking_no_stopping
- In an accessible/handicap space without permit → parking_blocked_accessible_space

Allowed complaint leaves (pick exactly 3 different ones as top matches):
${catalogPromptSection()}
${excludeNote}

Return strict JSON only (no markdown fences) with keys:
- candidates (array of exactly 3 objects, ranked best-first, each with: leafId, confidence 0-1, reason short string citing visible evidence)
- description (1-2 sentences, factual)
- confidence (0-1 for best match)
- isStreetIssue (boolean)
- isLikelyFake (boolean)
- fakeReason (string or null)
- issueFields (object with vehicle_color, vehicle_make, vehicle_model, license_plate, plate_state — empty string if not visible)

Rules:
- leafId must be one of the allowed ids above
- Rank by what is VISUALLY evident — do not guess obscure violations
- If tires are clearly on the sidewalk, parking_blocked_sidewalk must be candidate #1
- NEVER guess license plates — use empty string if not legible
- Use parking_city_vehicle_sidewalk only for marked city/government vehicles

Location: ${formatLocation(location)}.`;
}

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end > start) return content.slice(start, end + 1);
  return content.trim();
}

function parseClassification(
  content: string,
  usedAi: boolean,
  exclude: ComplaintLeafId[],
): ClassificationResult {
  const parsed = JSON.parse(extractJson(content)) as {
    candidates?: { leafId?: string; confidence?: number; reason?: string }[];
    description?: string;
    confidence?: number;
    isStreetIssue?: boolean;
    isLikelyFake?: boolean;
    fakeReason?: string | null;
    issueFields?: Record<string, unknown>;
  };

  const rawCandidates = parsed.candidates ?? [];
  const validIds: ComplaintLeafId[] = [];
  const confidences: number[] = [];
  const reasons: string[] = [];

  for (const item of rawCandidates) {
    if (item.leafId && isComplaintLeafId(item.leafId) && !exclude.includes(item.leafId)) {
      if (!validIds.includes(item.leafId)) {
        validIds.push(item.leafId);
        confidences.push(Math.max(0, Math.min(1, item.confidence ?? 0.5)));
        reasons.push(item.reason || "");
      }
    }
    if (validIds.length >= 3) break;
  }

  while (validIds.length < 3) {
    const next = pickAlternativeCandidates([...exclude, ...validIds], 1)[0];
    if (!next || validIds.includes(next)) break;
    validIds.push(next);
    confidences.push(0.3);
    reasons.push("Common parking violation — confirm from your photo");
  }

  const topLeafId = validIds[0] ?? defaultCandidates()[0];
  const { fields, prefilledKeys } = mergeAiIssueFieldsFromCatalog(topLeafId, parsed.issueFields);

  const candidates: CategoryCandidate[] = validIds.map((leafId, index) => {
    const leaf = getLeafDefinition(leafId);
    return {
      leafId,
      label: leaf.label,
      agency: leaf.agency,
      confidence: confidences[index] ?? 0.3,
      reason: reasons[index] || undefined,
    };
  });

  return {
    candidates,
    topLeafId,
    description: parsed.description?.trim() || "Illegal parking observed at this location.",
    confidence: Math.max(0, Math.min(1, parsed.confidence ?? confidences[0] ?? 0.5)),
    isStreetIssue: parsed.isStreetIssue !== false,
    isLikelyFake: Boolean(parsed.isLikelyFake),
    fakeReason: parsed.fakeReason ?? undefined,
    usedAi,
    aiTimedOut: false,
    issueFields: fields,
    aiPrefilledFields: prefilledKeys,
  };
}

function fallbackClassification(
  aiTimedOut = false,
  exclude: ComplaintLeafId[] = [],
): ClassificationResult {
  const fallbackIds = pickAlternativeCandidates(exclude, 3);
  const ids = fallbackIds.length >= 3 ? fallbackIds : defaultCandidates();
  const topLeafId = ids[0];
  return {
    candidates: candidatesFromIds(ids, [0.35, 0.25, 0.2]).map((candidate) => ({
      ...candidate,
      reason: aiTimedOut
        ? "AI timed out — please pick the category that matches your photo"
        : "AI unavailable — please pick the category that matches your photo",
    })),
    topLeafId,
    description: "Vehicle appears illegally parked. Add vehicle details if visible.",
    confidence: 0.35,
    isStreetIssue: true,
    isLikelyFake: false,
    usedAi: false,
    aiTimedOut,
    issueFields: emptyFieldsForLeaf(topLeafId),
    aiPrefilledFields: [],
  };
}

function parseDataUrl(imageDataUrl: string): { data: string; mimeType: string } {
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid photo data URL.");
  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  return { mimeType, data: match[2] };
}

async function classifyWithGemini(
  imageDataUrl: string,
  location: GeoPoint,
  apiKey: string,
  exclude: ComplaintLeafId[],
): Promise<ClassificationResult> {
  const result = await runGeminiVisionPrompt(apiKey, buildPrompt(location, exclude), imageDataUrl);
  return parseClassification(result, true, exclude);
}

async function classifyWithOpenAi(
  imageDataUrl: string,
  location: GeoPoint,
  apiKey: string,
  exclude: ComplaintLeafId[],
): Promise<ClassificationResult> {
  const result = await runOpenAiVisionPrompt(apiKey, buildPrompt(location, exclude), imageDataUrl);
  return parseClassification(result, true, exclude);
}

async function classifyWithCursor(
  imageDataUrl: string,
  location: GeoPoint,
  apiKey: string,
  exclude: ComplaintLeafId[],
): Promise<ClassificationResult> {
  const { data, mimeType } = parseDataUrl(imageDataUrl);
  const result = await runCursorVisionPrompt(apiKey, buildPrompt(location, exclude), {
    data,
    mimeType,
  });
  return parseClassification(result, true, exclude);
}

async function runWithTimeout(
  classify: () => Promise<ClassificationResult>,
): Promise<ClassificationResult> {
  return Promise.race([
    classify(),
    sleep(AI_TIMEOUT_MS).then(() => {
      throw new Error("AI timeout");
    }),
  ]);
}

export async function classifyStreetPhoto(
  imageDataUrl: string,
  location: GeoPoint,
  exclude: ComplaintLeafId[] = [],
): Promise<ClassificationResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const cursorKey = process.env.CURSOR_API_KEY;

  if (geminiKey) {
    try {
      return await runWithTimeout(() =>
        classifyWithGemini(imageDataUrl, location, geminiKey, exclude),
      );
    } catch (error) {
      const timedOut = error instanceof Error && error.message === "AI timeout";
      console.error("Gemini classification failed:", error);
      if (!openaiKey && !cursorKey) {
        return fallbackClassification(timedOut, exclude);
      }
    }
  }

  if (openaiKey) {
    try {
      return await runWithTimeout(() =>
        classifyWithOpenAi(imageDataUrl, location, openaiKey, exclude),
      );
    } catch (error) {
      const timedOut = error instanceof Error && error.message === "AI timeout";
      console.error("OpenAI classification failed:", error);
      if (!cursorKey) {
        return fallbackClassification(timedOut, exclude);
      }
    }
  }

  if (cursorKey) {
    try {
      return await runWithTimeout(() =>
        classifyWithCursor(imageDataUrl, location, cursorKey, exclude),
      );
    } catch (error) {
      const timedOut = error instanceof Error && error.message === "AI timeout";
      console.error("Cursor classification failed:", error);
      return fallbackClassification(timedOut, exclude);
    }
  }

  return fallbackClassification(false, exclude);
}

export { buildCopyPacket };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
