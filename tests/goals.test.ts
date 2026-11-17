import { expect, test } from "vitest";
import { goalForDate } from "@/lib/goals";
import type { Goal } from "@/lib/types";

const g = (id: number, effectiveFrom: string, targetKcal: number) =>
  ({ id, effectiveFrom, targetKcal, mode: "cut", createdAt: "" }) as Goal;

test("goalForDate picks the latest goal in effect, or the earliest for older days", () => {
  const goals = [g(2, "2026-11-10", 1800), g(1, "2026-11-01", 2000)];
  expect(goalForDate(goals, "2026-10-20")?.targetKcal).toBe(2000);
  expect(goalForDate(goals, "2026-11-05")?.targetKcal).toBe(2000);
  expect(goalForDate(goals, "2026-11-09")?.targetKcal).toBe(2000);
  expect(goalForDate(goals, "2026-11-10")?.targetKcal).toBe(1800);
  expect(goalForDate(goals, "2026-12-01")?.targetKcal).toBe(1800);
  expect(goalForDate([...goals].reverse(), "2026-11-05")?.targetKcal).toBe(2000);
  expect(goalForDate([], "2026-11-10")).toBeUndefined();
});
