import { expect, test } from "vitest";
import {
  dayNutrients, itemNutrients, macroCalorieShares, mealNutrients, sumNutrients, toMealItem,
} from "@/lib/nutrition";

const item = { name: "Cơm trắng", grams: 200, kcal: 260, carbs_g: 57, protein_g: 5, fat_g: 0.5, fiber_g: 0.6 };
const mi = toMealItem(item, "i1");
const b = toMealItem({ name: "Gà", grams: 150, kcal: 250, carbs_g: 0, protein_g: 45, fat_g: 7, fiber_g: 0 }, "i2");

test("toMealItem stores per-100g values", () => {
  expect(mi).toMatchObject({ id: "i1", name: "Cơm trắng", grams: 200 });
  expect(mi.per100.kcal).toBeCloseTo(130);
  expect(mi.per100.carbs).toBeCloseTo(28.5);
});

test("itemNutrients scales with grams and round-trips", () => {
  expect(itemNutrients(mi).kcal).toBeCloseTo(260);
  expect(itemNutrients({ ...mi, grams: 100 }).kcal).toBeCloseTo(130);
  expect(itemNutrients({ ...mi, grams: 100 }).carbs).toBeCloseTo(28.5);
  const back = { ...{ ...mi, grams: 100 }, grams: 200 };
  expect(itemNutrients(back)).toEqual(itemNutrients(mi));
});

test("meal and day totals", () => {
  expect(mealNutrients({ items: [mi, b] }).kcal).toBeCloseTo(510);
  expect(dayNutrients([{ items: [mi] }, { items: [b] }]).protein).toBeCloseTo(50);
  expect(dayNutrients([])).toEqual({ kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 });
  expect(sumNutrients([])).toEqual({ kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 });
});

test("macroCalorieShares", () => {
  const s = macroCalorieShares({ kcal: 0, carbs: 50, protein: 25, fat: 0, fiber: 0 });
  expect(s.carbs).toBeCloseTo(2 / 3);
  expect(s.protein).toBeCloseTo(1 / 3);
  expect(s.fat).toBe(0);
  const t = macroCalorieShares({ kcal: 0, carbs: 10, protein: 10, fat: 10, fiber: 0 });
  expect(t.carbs + t.protein + t.fat).toBeCloseTo(1);
  expect(t.fat).toBeCloseTo(90 / 170);
  expect(macroCalorieShares({ kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 })).toEqual({ carbs: 0, protein: 0, fat: 0 });
});
