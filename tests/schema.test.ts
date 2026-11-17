import { expect, test } from "vitest";
import {
  analyzeRequestSchema, mealAnalysisJsonSchema, mealAnalysisSchema, modelOutputSchema,
} from "@/lib/schema";

const item = { name: "Cơm trắng", grams: 200, kcal: 260, carbs_g: 57, protein_g: 5, fat_g: 0.5, fiber_g: 0.6 };
const ok = { is_food: true, title: "Cơm gà", items: [item], confidence: "medium", notes: "" };

test("modelOutputSchema accepts a well-formed reply", () => {
  expect(modelOutputSchema.safeParse(ok).success).toBe(true);
  expect(modelOutputSchema.safeParse({ ...ok, is_food: false, items: [] }).success).toBe(true);
});

test("modelOutputSchema tolerates slightly off-spec replies", () => {
  const loose = modelOutputSchema.parse({
    ...ok, title: "  ", notes: undefined,
    items: [{ ...item, grams: "200", kcal: "260", name: "x".repeat(100) }],
  });
  expect(loose.items[0].grams).toBe(200);
  expect(loose.items[0].kcal).toBe(260);
  expect(loose.items[0].name.length).toBe(60);
  expect(loose.title).toBe("Bữa ăn");
  expect(loose.notes).toBe("");
  expect(modelOutputSchema.parse({ ...ok, notes: "n".repeat(400) }).notes.length).toBe(300);
});

test("modelOutputSchema rejects impossible values", () => {
  const bad = (patch: object) => modelOutputSchema.safeParse({ ...ok, items: [{ ...item, ...patch }] }).success;
  expect(bad({ kcal: -1 })).toBe(false);
  expect(bad({ grams: 0 })).toBe(false);
  expect(bad({ grams: 5001 })).toBe(false);
  expect(bad({ kcal: 10001 })).toBe(false);
  expect(bad({ carbs_g: 1001 })).toBe(false);
  expect(bad({ kcal: "abc" })).toBe(false);
  expect(bad({ kcal: null })).toBe(false);
  expect(bad({ name: "   " })).toBe(false);
  expect(modelOutputSchema.safeParse({ ...ok, confidence: "sure" }).success).toBe(false);
  expect(modelOutputSchema.safeParse({ is_food: true, title: "a", confidence: "low", notes: "" }).success).toBe(false);
});

test("mealAnalysisSchema requires at least one item", () => {
  expect(mealAnalysisSchema.safeParse({ title: "a", items: [], confidence: "low", notes: "" }).success).toBe(false);
  expect(mealAnalysisSchema.safeParse({ title: "a", items: [item], confidence: "low", notes: "" }).success).toBe(true);
});

test("analyzeRequestSchema", () => {
  expect(analyzeRequestSchema.safeParse({ text: "1 bát phở" }).success).toBe(true);
  expect(analyzeRequestSchema.parse({ text: "  1 bát phở  " }).text).toBe("1 bát phở");
  expect(analyzeRequestSchema.safeParse({ image: "data:image/jpeg;base64,AAAA" }).success).toBe(true);
  expect(analyzeRequestSchema.safeParse({ image: "data:image/webp;base64,AAAA", text: "phở" }).success).toBe(true);
  expect(analyzeRequestSchema.parse({ image: "data:image/png;base64,AAAA", text: "   " }).text).toBeUndefined();
  expect(analyzeRequestSchema.safeParse({}).success).toBe(false);
  expect(analyzeRequestSchema.safeParse({ text: "   " }).success).toBe(false);
  expect(analyzeRequestSchema.safeParse({ text: "a".repeat(1001) }).success).toBe(false);
  expect(analyzeRequestSchema.safeParse({ text: "a".repeat(1000) }).success).toBe(true);
  expect(analyzeRequestSchema.safeParse({ image: "data:image/gif;base64,AAAA" }).success).toBe(false);
  expect(analyzeRequestSchema.safeParse({ image: "https://x.com/a.jpg" }).success).toBe(false);
  expect(analyzeRequestSchema.safeParse({ image: "data:image/jpeg;base64," + "A".repeat(4_000_000) }).success).toBe(false);
});

test("JSON schema is strict-mode compatible", () => {
  const check = (node: Record<string, unknown>) => {
    if (node.type === "object") {
      expect(node.additionalProperties).toBe(false);
      const props = node.properties as Record<string, Record<string, unknown>>;
      expect([...(node.required as string[])].sort()).toEqual(Object.keys(props).sort());
      Object.values(props).forEach(check);
    }
    if (node.type === "array") check(node.items as Record<string, unknown>);
  };
  check(mealAnalysisJsonSchema as unknown as Record<string, unknown>);
  expect(Object.keys(mealAnalysisJsonSchema.properties)).toContain("is_food");
});
