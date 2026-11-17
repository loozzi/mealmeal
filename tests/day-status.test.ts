import { expect, test } from "vitest";
import { MIN_FILL, dayMessage, dayStatus } from "@/lib/day-status";
import type { GoalMode } from "@/lib/types";

const st = (consumed: number, mode: GoalMode, mealCount = 1) =>
  dayStatus({ mealCount, consumed, target: 2000, mode });

test("empty and progress", () => {
  expect(st(0, "cut", 0)).toMatchObject({ kind: "empty", fill: 0, consumed: 0, target: 2000 });
  expect(st(1500, "cut")).toMatchObject({ kind: "progress", fill: 0.75, delta: -500 });
  expect(st(50, "cut")).toMatchObject({ kind: "progress", fill: 0.05 });
  expect(st(0, "cut")).toMatchObject({ kind: "progress", fill: 0.05 });
  expect(MIN_FILL).toBe(0.05);
});

test("hit and over thresholds per mode", () => {
  expect(st(2000, "cut")).toMatchObject({ kind: "hit", fill: 1 });
  expect(st(2100, "cut").kind).toBe("hit");
  expect(st(2101, "cut")).toMatchObject({ kind: "over", fill: 1, delta: 101 });
  expect(st(2200, "maintain").kind).toBe("hit");
  expect(st(2201, "maintain").kind).toBe("over");
  expect(st(3000, "bulk").kind).toBe("hit");
});

test("dayMessage", () => {
  expect(dayMessage(st(1450, "cut"), "cut")).toBe("còn 550 kcal");
  expect(dayMessage(st(0, "cut", 0), "cut")).toBe("còn 2.000 kcal");
  expect(dayMessage(st(1450, "bulk"), "bulk")).toBe("cần thêm 550 kcal");
  expect(dayMessage(st(2000, "cut"), "cut")).toBe("Đã đạt mục tiêu");
  expect(dayMessage(st(2300, "cut"), "cut")).toBe("vượt 300 kcal");
  expect(dayMessage(st(2300, "bulk"), "bulk")).toBe("Đã đạt mục tiêu");
});
