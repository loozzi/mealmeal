import OpenAI from "openai";
import { AnalyzeError } from "./analyze";

// The slice of the OpenAI client that analyzeMeal uses. Kept structural so tests can pass a fake.
export type ChatClient = {
  chat: {
    completions: {
      create(args: unknown): Promise<{
        choices: { message: { content: string | null } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
      }>;
    };
  };
};

export type AiConfig = {
  client: ChatClient;
  model: string;
  jsonMode: "json_schema" | "json_object";
};

const REQUEST_TIMEOUT_MS = 45_000;

let cached: AiConfig | undefined;

export function getAiConfig(): AiConfig {
  if (cached) return cached;

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) {
    console.error("analyze: missing OPENAI_API_KEY or AI_MODEL");
    throw new AnalyzeError("AI_ERROR");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });

  cached = {
    client: client as unknown as ChatClient,
    model,
    jsonMode: process.env.AI_JSON_MODE === "json_object" ? "json_object" : "json_schema",
  };
  return cached;
}
