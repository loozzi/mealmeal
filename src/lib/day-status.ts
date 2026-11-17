import { formatInt } from "./format";
import type { GoalMode } from "./types";

export type DayStatus = {
  kind: "empty" | "progress" | "hit" | "over";
  /** Portion of the day circle to fill, 0–1. */
  fill: number;
  consumed: number;
  target: number;
  /** consumed − target */
  delta: number;
};

/** A logged day always shows at least this much fill so it is distinguishable from an empty day. */
export const MIN_FILL = 0.05;

/** Ratio above which a day counts as "over". Bulking has no upper limit. */
const OVER_RATIO: Record<GoalMode, number> = { cut: 1.05, maintain: 1.1, bulk: Infinity };

export function dayStatus(input: {
  mealCount: number;
  consumed: number;
  target: number;
  mode: GoalMode;
}): DayStatus {
  const { mealCount, consumed, target, mode } = input;
  const base = { consumed, target, delta: consumed - target };
  if (mealCount === 0) return { kind: "empty", fill: 0, ...base };
  const r = consumed / target;
  if (r < 1) return { kind: "progress", fill: Math.max(r, MIN_FILL), ...base };
  if (r > OVER_RATIO[mode]) return { kind: "over", fill: 1, ...base };
  return { kind: "hit", fill: 1, ...base };
}

export function dayMessage(s: DayStatus, mode: GoalMode): string {
  switch (s.kind) {
    case "hit":
      return "Đã đạt mục tiêu";
    case "over":
      return `vượt ${formatInt(s.delta)} kcal`;
    default:
      return `${mode === "bulk" ? "cần thêm" : "còn"} ${formatInt(-s.delta)} kcal`;
  }
}
