import { expect, test, vi } from "vitest";
import { toGoalDoc, toMealDoc, toProfileDoc } from "@/lib/store";
import { onSyncError, reportSyncError, SYNC_ERROR_MESSAGE } from "@/lib/sync-errors";
import type { Meal } from "@/lib/types";

const STAMP = "2026-11-17T00:00:00.000Z";
const meal: Meal = {
  id: "m1", date: "2026-11-17", time: "12:00", title: "Phở", source: "text", hasPhoto: true,
  items: [], confidence: "medium", notes: "", createdAt: STAMP, updatedAt: STAMP,
};

test("toMealDoc drops undefined and photo", () => {
  const doc = toMealDoc({ ...meal, description: undefined, photo: new Blob(["x"]) } as Meal);
  expect(doc).not.toHaveProperty("description");
  expect(doc).not.toHaveProperty("photo");
  expect(doc.hasPhoto).toBe(true);
  expect(doc.id).toBe("m1");
});

test("toMealDoc bumps updatedAt keeps createdAt", () => {
  const doc = toMealDoc(meal);
  expect(doc.createdAt).toBe(STAMP);
  expect(doc.updatedAt).not.toBe(STAMP);
  expect(Date.parse(doc.updatedAt as string)).toBeGreaterThan(Date.parse(STAMP));
});

test("toGoalDoc and toProfileDoc drop undefined and the local id", () => {
  const g = toGoalDoc({ effectiveFrom: "2026-11-17", mode: "cut", targetKcal: 2000, suggestedKcal: undefined });
  expect(g).not.toHaveProperty("suggestedKcal");
  expect(g).not.toHaveProperty("id");
  expect(typeof g.createdAt).toBe("string");
  const p = toProfileDoc({ sex: "male", age: undefined });
  expect(p).toEqual({ sex: "male", updatedAt: expect.any(String) });
});

test("sync errors reach listeners and unsubscribe works", () => {
  const a = vi.fn();
  const b = vi.fn();
  const offA = onSyncError(a);
  const offB = onSyncError(b);
  vi.spyOn(console, "error").mockImplementation(() => {});
  reportSyncError(new Error("permission-denied"));
  expect(a).toHaveBeenCalledWith(SYNC_ERROR_MESSAGE);
  expect(b).toHaveBeenCalledTimes(1);
  offA();
  reportSyncError(new Error("again"));
  expect(a).toHaveBeenCalledTimes(1);
  expect(b).toHaveBeenCalledTimes(2);
  offB();
  expect(SYNC_ERROR_MESSAGE).toBe("Không đồng bộ được thay đổi. Hãy thử lại.");
});
