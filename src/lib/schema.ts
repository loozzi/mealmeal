import { z } from "zod";

export const IMAGE_MAX_CHARS = 4_000_000;
export const TEXT_MAX_CHARS = 1000;

const TITLE_MAX = 80;
const NAME_MAX = 60;
const NOTES_MAX = 300;
const DEFAULT_TITLE = "Bữa ăn";

// ---------- Request ----------

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export const analyzeRequestSchema = z
  .object({
    image: z.string().max(IMAGE_MAX_CHARS).regex(DATA_URL).optional(),
    text: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() || undefined : v),
      z.string().max(TEXT_MAX_CHARS).optional(),
    ),
  })
  .refine((v) => v.image !== undefined || v.text !== undefined);

export type AnalyzeRequest = { image?: string; text?: string };

// ---------- Model output (lenient) ----------
// Models often return numbers as strings or overrun a length limit. Those are repaired rather than
// rejected; values that cannot be trusted (negative, non-numeric, out of range) are still rejected.

const lenientNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v), schema);

const clipped = (max: number) => z.string().transform((s) => s.trim().slice(0, max));

const gram = lenientNumber(z.number().min(0).max(1000));

const modelItemSchema = z.object({
  name: clipped(NAME_MAX).pipe(z.string().min(1)),
  grams: lenientNumber(z.number().gt(0).max(5000)),
  kcal: lenientNumber(z.number().min(0).max(10_000)),
  carbs_g: gram,
  protein_g: gram,
  fat_g: gram,
  fiber_g: gram,
});

const confidenceSchema = z.enum(["low", "medium", "high"]);

export const modelOutputSchema = z.object({
  is_food: z.boolean(),
  title: z
    .string()
    .nullish()
    .transform((s) => (s ?? "").trim().slice(0, TITLE_MAX) || DEFAULT_TITLE),
  items: z.array(modelItemSchema).max(20),
  confidence: confidenceSchema,
  notes: z
    .string()
    .nullish()
    .transform((s) => (s ?? "").trim().slice(0, NOTES_MAX)),
});

// ---------- API result (strict; what the server returns and the client trusts) ----------

const grams1000 = z.number().min(0).max(1000);

const analysisItemSchema = z.object({
  name: z.string().min(1).max(NAME_MAX),
  grams: z.number().gt(0).max(5000),
  kcal: z.number().min(0).max(10_000),
  carbs_g: grams1000,
  protein_g: grams1000,
  fat_g: grams1000,
  fiber_g: grams1000,
});

export const mealAnalysisSchema = z.object({
  title: z.string().min(1).max(TITLE_MAX),
  items: z.array(analysisItemSchema).min(1).max(20),
  confidence: confidenceSchema,
  notes: z.string().max(NOTES_MAX),
});

export type AnalysisItem = z.infer<typeof analysisItemSchema>;
export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;

// ---------- JSON Schema for response_format (strict mode) ----------
// Strict mode requires every property listed in `required` and additionalProperties: false.
// Range limits are left to zod because strict mode supports only a subset of keywords.

const num = { type: "number" } as const;

export const mealAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["is_food", "title", "items", "confidence", "notes"],
  properties: {
    is_food: { type: "boolean" },
    title: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "grams", "kcal", "carbs_g", "protein_g", "fat_g", "fiber_g"],
        properties: {
          name: { type: "string" },
          grams: num,
          kcal: num,
          carbs_g: num,
          protein_g: num,
          fat_g: num,
          fiber_g: num,
        },
      },
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    notes: { type: "string" },
  },
} as const;
