import { expect, test } from "vitest";
import {
  ACTIVITY_OPTIONS, MODE_OPTIONS, TARGET_MAX, TARGET_MIN, bmr, bodyStatsSchema, isValidTarget,
  suggestTarget, tdee,
} from "@/lib/tdee";

const m = { sex: "male", age: 25, heightCm: 175, weightKg: 70 } as const;

test("bmr", () => {
  expect(bmr(m)).toBeCloseTo(1673.75);
  expect(bmr({ sex: "female", age: 30, heightCm: 160, weightKg: 55 })).toBeCloseTo(1239);
  expect(bmr({ ...m, bodyFatPct: 20 })).toBeCloseTo(1579.6);
});

test("tdee and option tables", () => {
  expect(tdee({ ...m, activity: "moderate" })).toBeCloseTo(2594.31, 1);
  expect(tdee({ ...m, activity: "sedentary" })).toBeCloseTo(2008.5);
  expect(ACTIVITY_OPTIONS.map((o) => o.code)).toEqual(["sedentary", "light", "moderate", "active", "very_active"]);
  expect(ACTIVITY_OPTIONS.map((o) => o.factor)).toEqual([1.2, 1.375, 1.55, 1.725, 1.9]);
  expect(ACTIVITY_OPTIONS[2].label).toBe("Vận động vừa");
  expect(MODE_OPTIONS.map((o) => o.code)).toEqual(["cut", "maintain", "bulk"]);
});

test("suggestTarget", () => {
  const t = tdee({ ...m, activity: "moderate" });
  expect(suggestTarget(t, "cut", "male")).toMatchObject({ kcal: 2100, floored: false });
  expect(suggestTarget(t, "maintain", "male").kcal).toBe(2600);
  expect(suggestTarget(t, "bulk", "male").kcal).toBe(2850);
  expect(suggestTarget(t, "cut", "male").explanation).toBe("TDEE 2.594 − 20%");
  expect(suggestTarget(t, "maintain", "male").explanation).toBe("TDEE 2.594");
  expect(suggestTarget(t, "bulk", "male").explanation).toBe("TDEE 2.594 + 10%");
  expect(suggestTarget(1231.8, "cut", "female")).toMatchObject({ kcal: 1200, floored: true });
  expect(suggestTarget(1700, "cut", "male")).toMatchObject({ kcal: 1500, floored: true });
  expect(suggestTarget(1500, "maintain", "female")).toMatchObject({ kcal: 1500, floored: false });
});

test("target and body stats validation", () => {
  expect([TARGET_MIN, TARGET_MAX]).toEqual([800, 6000]);
  expect(isValidTarget(799)).toBe(false);
  expect(isValidTarget(800)).toBe(true);
  expect(isValidTarget(6000)).toBe(true);
  expect(isValidTarget(6001)).toBe(false);
  expect(isValidTarget(2000.5)).toBe(false);
  expect(isValidTarget(NaN)).toBe(false);
  const ok = { ...m, activity: "light" };
  expect(bodyStatsSchema.safeParse(ok).success).toBe(true);
  expect(bodyStatsSchema.safeParse({ ...ok, bodyFatPct: 18.5 }).success).toBe(true);
  expect(bodyStatsSchema.safeParse({ ...ok, age: 12 }).success).toBe(false);
  expect(bodyStatsSchema.safeParse({ ...ok, age: 25.5 }).success).toBe(false);
  expect(bodyStatsSchema.safeParse({ ...ok, heightCm: 99 }).success).toBe(false);
  expect(bodyStatsSchema.safeParse({ ...ok, weightKg: 301 }).success).toBe(false);
  expect(bodyStatsSchema.safeParse({ ...ok, bodyFatPct: 2 }).success).toBe(false);
});
