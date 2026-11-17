import type { AnalysisItem } from "./schema";
import type { MealItem, Nutrients } from "./types";

export const GRAMS_MIN = 1;
export const GRAMS_MAX = 5000;

const ZERO: Nutrients = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };

/** Converts an AI estimate into the stored form. Done once; values are kept unrounded. */
export function toMealItem(a: AnalysisItem, id: string): MealItem {
  const k = 100 / a.grams;
  return {
    id,
    name: a.name,
    grams: a.grams,
    per100: {
      kcal: a.kcal * k,
      carbs: a.carbs_g * k,
      protein: a.protein_g * k,
      fat: a.fat_g * k,
      fiber: a.fiber_g * k,
    },
  };
}

export function itemNutrients(item: MealItem): Nutrients {
  const k = item.grams / 100;
  const p = item.per100;
  return { kcal: p.kcal * k, carbs: p.carbs * k, protein: p.protein * k, fat: p.fat * k, fiber: p.fiber * k };
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return list.reduce<Nutrients>(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      carbs: acc.carbs + n.carbs,
      protein: acc.protein + n.protein,
      fat: acc.fat + n.fat,
      fiber: acc.fiber + n.fiber,
    }),
    { ...ZERO },
  );
}

export function mealNutrients(meal: { items: MealItem[] }): Nutrients {
  return sumNutrients(meal.items.map(itemNutrients));
}

export function dayNutrients(meals: { items: MealItem[] }[]): Nutrients {
  return sumNutrients(meals.map(mealNutrients));
}

/** Share of calories from each macro (carb 4, protein 4, fat 9 kcal/g). Sums to 1, or all 0. */
export function macroCalorieShares(n: Nutrients): { carbs: number; protein: number; fat: number } {
  const c = n.carbs * 4;
  const p = n.protein * 4;
  const f = n.fat * 9;
  const total = c + p + f;
  if (total <= 0) return { carbs: 0, protein: 0, fat: 0 };
  return { carbs: c / total, protein: p / total, fat: f / total };
}
