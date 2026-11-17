import "fake-indexeddb/auto";
import { beforeEach, expect, test } from "vitest";
import {
  db, deleteMeal, getMeal, getProfile, listGoals, listMealsByDate, listMealsInRange, saveMeal,
  saveProfileAndGoal,
} from "@/lib/db";
import type { Meal } from "@/lib/types";

const STAMP = "2026-11-17T00:00:00.000Z";
const meal = (id: string, date: string, time: string, createdAt = STAMP): Meal => ({
  id, date, time, title: "Phở", source: "text", items: [], confidence: "medium", notes: "",
  createdAt, updatedAt: STAMP,
});

beforeEach(async () => {
  await Promise.all([db.meals.clear(), db.profile.clear(), db.goals.clear()]);
});

test("meals are listed by day in time order and by inclusive range", async () => {
  await saveMeal(meal("a", "2026-11-17", "12:15"));
  await saveMeal(meal("b", "2026-11-17", "07:30"));
  await saveMeal(meal("c", "2026-11-18", "08:00"));
  await saveMeal(meal("e", "2026-11-17", "12:15", "2026-11-16T00:00:00.000Z"));
  expect((await listMealsByDate("2026-11-17")).map((m) => m.id)).toEqual(["b", "e", "a"]);
  expect((await listMealsInRange("2026-11-17", "2026-11-18")).length).toBe(4);
  expect((await listMealsInRange("2026-11-18", "2026-11-30")).map((m) => m.id)).toEqual(["c"]);
  expect(await listMealsByDate("2026-11-19")).toEqual([]);
});

test("saving the same id twice keeps one record and bumps updatedAt", async () => {
  await saveMeal(meal("a", "2026-11-17", "12:15"));
  await saveMeal(meal("a", "2026-11-17", "12:15"));
  expect((await listMealsByDate("2026-11-17")).length).toBe(1);
  const saved = await getMeal("a");
  expect(saved!.updatedAt).not.toBe(STAMP);
  expect(saved!.createdAt).toBe(STAMP);
});

test("deleteMeal", async () => {
  await saveMeal(meal("a", "2026-11-17", "12:15"));
  await deleteMeal("a");
  expect(await getMeal("a")).toBeUndefined();
});

test("saveProfileAndGoal overwrites a same-day goal and appends for a new day", async () => {
  expect(await getProfile()).toBeUndefined();
  expect(await listGoals()).toEqual([]);
  await saveProfileAndGoal({ sex: "male", age: 25 }, { effectiveFrom: "2026-11-17", mode: "cut", targetKcal: 2100, suggestedKcal: 2100 });
  await saveProfileAndGoal({ sex: "male", age: 25 }, { effectiveFrom: "2026-11-17", mode: "bulk", targetKcal: 2850 });
  const goals = await listGoals();
  expect(goals.length).toBe(1);
  expect(goals[0]).toMatchObject({ mode: "bulk", targetKcal: 2850 });
  expect(goals[0].suggestedKcal).toBeUndefined();
  await saveProfileAndGoal({}, { effectiveFrom: "2026-11-20", mode: "cut", targetKcal: 2000 });
  expect((await listGoals()).length).toBe(2);
  expect((await getProfile())!.id).toBe("me");
});
