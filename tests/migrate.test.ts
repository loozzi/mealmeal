import { expect, test, vi } from "vitest";
import { planMigration, runMigration, type MigrationOp, type RemoteState } from "@/lib/migrate";
import type { LegacyGoal, LegacyMeal, Profile } from "@/lib/types";

const STAMP = "2026-11-17T00:00:00.000Z";
const meal = (id: string, over: Partial<LegacyMeal> = {}): LegacyMeal => ({
  id, date: "2026-11-17", time: "12:00", title: "Phở", source: "text", items: [], confidence: "medium",
  notes: "", createdAt: STAMP, updatedAt: STAMP, ...over,
});
const goal = (effectiveFrom: string, id?: number): LegacyGoal => ({
  id, effectiveFrom, mode: "cut", targetKcal: 2000, createdAt: STAMP,
});
const profile: Profile = { id: "me", sex: "male", age: 25, updatedAt: STAMP };
const empty: RemoteState = { hasProfile: false, goalDates: new Set(), mealUpdatedAt: new Map() };

test("planMigration skips a meal the account has newer or equal", () => {
  const remote = { ...empty, mealUpdatedAt: new Map([["a", "2026-11-18T00:00:00.000Z"], ["b", STAMP]]) };
  const plan = planMigration({ meals: [meal("a"), meal("b"), meal("c")], goals: [] }, remote);
  expect(plan.meals.map((m) => m.id)).toEqual(["c"]);
});

test("planMigration overwrites a meal the account has older", () => {
  const remote = { ...empty, mealUpdatedAt: new Map([["a", "2026-11-01T00:00:00.000Z"]]) };
  expect(planMigration({ meals: [meal("a")], goals: [] }, remote).meals.map((m) => m.id)).toEqual(["a"]);
});

test("planMigration skips a goal on a day the account already has", () => {
  const remote = { ...empty, goalDates: new Set(["2026-11-01"]) };
  const plan = planMigration({ meals: [], goals: [goal("2026-11-01", 1), goal("2026-11-10", 2)] }, remote);
  expect(plan.goals.map((g) => g.effectiveFrom)).toEqual(["2026-11-10"]);
  expect(plan.goals[0]).not.toHaveProperty("id");
});

test("planMigration moves the profile only when the account has none", () => {
  expect(planMigration({ meals: [], goals: [], profile }, empty).profile?.age).toBe(25);
  expect(planMigration({ meals: [], goals: [], profile }, { ...empty, hasProfile: true }).profile).toBeUndefined();
});

test("planMigration sets hasPhoto from the v1 photo and drops the blob", () => {
  const plan = planMigration({ meals: [meal("a", { photo: new Blob(["x"]) }), meal("b")], goals: [] }, empty);
  expect(plan.meals.map((m) => m.hasPhoto)).toEqual([true, false]);
  expect(plan.meals[0]).not.toHaveProperty("photo");
});

function deps(over: Partial<Parameters<typeof runMigration>[0]> = {}) {
  const calls: string[] = [];
  return {
    calls,
    d: {
      read: vi.fn(async () => ({ meals: [meal("a")], goals: [goal("2026-11-01")], profile })),
      fetchRemote: vi.fn(async () => empty),
      commit: vi.fn(async (ops: MigrationOp[]) => {
        calls.push(`commit:${ops.length}`);
      }),
      clear: vi.fn(async () => {
        calls.push("clear");
      }),
      ...over,
    },
  };
}

test("runMigration commits then clears", async () => {
  const { d, calls } = deps();
  await runMigration(d);
  expect(calls).toEqual(["commit:3", "clear"]);
  expect(d.fetchRemote).toHaveBeenCalledWith(["a"]);
});

test("commit fails → no clear and rejects", async () => {
  const { d } = deps({ commit: vi.fn(async () => Promise.reject(new Error("offline"))) });
  await expect(runMigration(d)).rejects.toThrow("offline");
  expect(d.clear).not.toHaveBeenCalled();
});

test("fetchRemote fails → no commit, no clear", async () => {
  const { d } = deps({ fetchRemote: vi.fn(async () => Promise.reject(new Error("unavailable"))) });
  await expect(runMigration(d)).rejects.toThrow("unavailable");
  expect(d.commit).not.toHaveBeenCalled();
  expect(d.clear).not.toHaveBeenCalled();
});

test("1.201 meals → 3 batches", async () => {
  const meals = Array.from({ length: 1201 }, (_, i) => meal(`m${i}`));
  const { d, calls } = deps({ read: vi.fn(async () => ({ meals, goals: [] })) });
  await runMigration(d);
  expect(calls).toEqual(["commit:500", "commit:500", "commit:201", "clear"]);
});

test("no legacy data → reads nothing remote, no commit, no clear", async () => {
  const { d, calls } = deps({ read: vi.fn(async () => ({ meals: [], goals: [] })) });
  await runMigration(d);
  expect(calls).toEqual([]);
  expect(d.fetchRemote).not.toHaveBeenCalled();
});

test("everything already on the account → no commit, clears", async () => {
  const remote: RemoteState = {
    hasProfile: true,
    goalDates: new Set(["2026-11-01"]),
    mealUpdatedAt: new Map([["a", STAMP]]),
  };
  const { d, calls } = deps({ fetchRemote: vi.fn(async () => remote) });
  await runMigration(d);
  expect(calls).toEqual(["clear"]);
});
