import { APIConnectionTimeoutError } from "openai";
import { mealAnalysisJsonSchema, modelOutputSchema, type AnalyzeRequest, type MealAnalysis } from "@/lib/schema";
import type { ApiErrorCode } from "@/lib/types";
import type { AiConfig } from "./ai-config";
import { DEFAULT_USER_TEXT, JSON_OBJECT_SUFFIX, SYSTEM_PROMPT } from "./prompt";

export class AnalyzeError extends Error {
  constructor(public code: ApiErrorCode) {
    super(code);
    this.name = "AnalyzeError";
  }
}

export const ERROR_STATUS: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  NOT_FOOD: 422,
  RATE_LIMITED: 429,
  AI_ERROR: 502,
  TIMEOUT: 504,
  UNAUTHENTICATED: 401,
};

const MAX_ATTEMPTS = 2;

/** Parses model text as JSON, tolerating a surrounding ``` or ```json fence. Throws if it is not JSON. */
export function extractJson(text: string): unknown {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : text.trim());
}

function buildArgs(input: AnalyzeRequest, config: AiConfig) {
  const jsonObject = config.jsonMode === "json_object";
  const userContent: unknown[] = [{ type: "text", text: input.text ?? DEFAULT_USER_TEXT }];
  if (input.image) userContent.push({ type: "image_url", image_url: { url: input.image } });

  return {
    model: config.model,
    messages: [
      { role: "system", content: jsonObject ? SYSTEM_PROMPT + JSON_OBJECT_SUFFIX : SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: jsonObject
      ? { type: "json_object" }
      : { type: "json_schema", json_schema: { name: "meal_analysis", strict: true, schema: mealAnalysisJsonSchema } },
  };
}

function parseOutput(content: string | null) {
  if (!content) return null;
  try {
    const parsed = modelOutputSchema.safeParse(extractJson(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function analyzeMeal(input: AnalyzeRequest, config: AiConfig): Promise<MealAnalysis> {
  const args = buildArgs(input, config);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let content: string | null;
    try {
      const completion = await config.client.chat.completions.create(args);
      content = completion.choices[0]?.message?.content ?? null;
    } catch (err) {
      throw new AnalyzeError(err instanceof APIConnectionTimeoutError ? "TIMEOUT" : "AI_ERROR");
    }

    const output = parseOutput(content);
    if (!output) continue; // unusable output: ask the model once more

    if (!output.is_food || output.items.length === 0) throw new AnalyzeError("NOT_FOOD");
    return { title: output.title, items: output.items, confidence: output.confidence, notes: output.notes };
  }

  throw new AnalyzeError("AI_ERROR");
}
