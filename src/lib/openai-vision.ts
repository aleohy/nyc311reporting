import OpenAI from "openai";

export async function runOpenAiVisionPrompt(
  apiKey: string,
  prompt: string,
  imageDataUrl: string,
): Promise<string> {
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 900,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty classification response.");
  }

  return content;
}
