import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, expect, test } from "vitest";
import { clearLegacy, deletePhoto, getPhoto, localDb, putPhoto, readLegacy } from "@/lib/local-db";

const STAMP = "2026-11-17T00:00:00.000Z";
const v1Meal = (id: string, photo?: Blob) => ({
  id, date: "2026-11-17", time: "12:00", title: "Phở", source: "text", items: [], confidence: "medium",
  notes: "", createdAt: STAMP, updatedAt: STAMP, ...(photo ? { photo } : {}),
});

async function blobText(b: Blob | undefined) {
  return b ? await b.text() : undefined;
}

beforeEach(async () => {
  localDb.close({ disableAutoOpen: false });
  await Dexie.delete("mealmeal");
});

/** Writes data the way the v1 app did, then closes so the v2 schema opens it next. */
async function seedV1() {
  const v1 = new Dexie("mealmeal");
  v1.version(1).stores({ meals: "id, date", profile: "id", goals: "++id, effectiveFrom" });
  await v1.table("meals").bulkAdd([v1Meal("a", new Blob(["x"])), v1Meal("b")]);
  await v1.table("profile").put({ id: "me", sex: "male", age: 25, updatedAt: STAMP });
  await v1.table("goals").add({ effectiveFrom: "2026-11-01", mode: "cut", targetKcal: 2000, createdAt: STAMP });
  v1.close();
}

test("upgrade copies v1 photos", async () => {
  await seedV1();
  expect(await blobText(await getPhoto("a"))).toBe("x");
  expect(await getPhoto("b")).toBeUndefined();
  expect(localDb.verno).toBe(2);

  const legacy = await readLegacy();
  expect(legacy.meals.map((m) => m.id).sort()).toEqual(["a", "b"]);
  expect(legacy.profile?.age).toBe(25);
  expect(legacy.goals.map((g) => g.targetKcal)).toEqual([2000]);
});

test("clearLegacy keeps photos", async () => {
  await seedV1();
  await clearLegacy();
  const legacy = await readLegacy();
  expect(legacy).toEqual({ meals: [], profile: undefined, goals: [] });
  expect(await blobText(await getPhoto("a"))).toBe("x");
});

test("a fresh device has no legacy data", async () => {
  expect(await readLegacy()).toEqual({ meals: [], profile: undefined, goals: [] });
});

test("put/get/delete photo", async () => {
  await putPhoto("m1", new Blob(["hello"]));
  expect(await blobText(await getPhoto("m1"))).toBe("hello");
  await putPhoto("m1", new Blob(["again"]));
  expect(await blobText(await getPhoto("m1"))).toBe("again");
  await deletePhoto("m1");
  expect(await getPhoto("m1")).toBeUndefined();
  await deletePhoto("missing");
});
