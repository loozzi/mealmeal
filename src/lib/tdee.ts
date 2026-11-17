import { z } from "zod";
import { formatInt } from "./format";
import type { Activity, GoalMode, Sex } from "./types";

export type BodyStats = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  activity: Activity;
};

export const bodyStatsSchema = z.object({
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(13).max(100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  bodyFatPct: z.number().min(3).max(60).optional(),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
});

export const ACTIVITY_OPTIONS: { code: Activity; label: string; description: string; factor: number }[] = [
  { code: "sedentary", label: "Ít vận động", description: "Ngồi nhiều, hầu như không tập", factor: 1.2 },
  { code: "light", label: "Vận động nhẹ", description: "Tập 1–3 buổi/tuần", factor: 1.375 },
  { code: "moderate", label: "Vận động vừa", description: "Tập 3–5 buổi/tuần", factor: 1.55 },
  { code: "active", label: "Vận động nhiều", description: "Tập 6–7 buổi/tuần", factor: 1.725 },
  { code: "very_active", label: "Vận động rất nhiều", description: "Lao động nặng hoặc tập 2 buổi/ngày", factor: 1.9 },
];

export const MODE_OPTIONS: { code: GoalMode; label: string }[] = [
  { code: "cut", label: "Thâm hụt calo (giảm mỡ)" },
  { code: "maintain", label: "Giữ cân" },
  { code: "bulk", label: "Bulking (tăng cơ)" },
];

/** Katch-McArdle when body fat is known, otherwise Mifflin-St Jeor. */
export function bmr(s: Omit<BodyStats, "activity">): number {
  if (s.bodyFatPct !== undefined) return 370 + 21.6 * s.weightKg * (1 - s.bodyFatPct / 100);
  return 10 * s.weightKg + 6.25 * s.heightCm - 5 * s.age + (s.sex === "male" ? 5 : -161);
}

export function tdee(s: BodyStats): number {
  const factor = ACTIVITY_OPTIONS.find((o) => o.code === s.activity)!.factor;
  return bmr(s) * factor;
}

const MODE_FACTOR: Record<GoalMode, number> = { cut: 0.8, maintain: 1, bulk: 1.1 };
const MODE_SUFFIX: Record<GoalMode, string> = { cut: " − 20%", maintain: "", bulk: " + 10%" };
const FLOOR: Record<Sex, number> = { male: 1500, female: 1200 };

export function suggestTarget(
  tdeeValue: number,
  mode: GoalMode,
  sex: Sex,
): { kcal: number; floored: boolean; explanation: string } {
  const rounded = Math.round((tdeeValue * MODE_FACTOR[mode]) / 50) * 50;
  const floored = rounded < FLOOR[sex];
  return {
    kcal: floored ? FLOOR[sex] : rounded,
    floored,
    explanation: `TDEE ${formatInt(tdeeValue)}${MODE_SUFFIX[mode]}`,
  };
}

export const TARGET_MIN = 800;
export const TARGET_MAX = 6000;

export function isValidTarget(n: number): boolean {
  return Number.isInteger(n) && n >= TARGET_MIN && n <= TARGET_MAX;
}
