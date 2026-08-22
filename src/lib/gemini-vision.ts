const DEFAULT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
];

export async function runGeminiVisionPrompt(
  apiKey: string,
  prompt: string,
  imageDataUrl: string,
): Promise<string> {
  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid photo data URL.");
  }

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const models = process.env.GEMINI_VISION_MODEL
    ? [process.env.GEMINI_VISION_MODEL, ...DEFAULT_MODELS]
    : DEFAULT_MODELS;

  let lastError = "Gemini returned no usable response.";

  for (const model of [...new Set(models)]) {
    try {
      return await generateWithModel(apiKey, model, prompt, mimeType, match[2]);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Gemini model ${model} failed:`, lastError);
    }
  }

  throw new Error(lastError);
}

async function generateWithModel(
  apiKey: string,
  model: string,
  prompt: string,
  mimeType: string,
  data: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  const detail = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini ${model} (${response.status}): ${detail.slice(0, 400)}`);
  }

  const payload = JSON.parse(detail) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) {
    throw new Error(`Gemini ${model} returned an empty classification response.`);
  }

  return text;
}
