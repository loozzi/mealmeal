import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-mealmeal",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8085 },
  });
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext("alice").firestore();
const bob = () => env.authenticatedContext("bob").firestore();
const guest = () => env.unauthenticatedContext().firestore();

function meal(over: Record<string, unknown> = {}) {
  return {
    id: "m1",
    date: "2026-11-17",
    time: "12:00",
    title: "Phở",
    source: "text",
    items: [],
    confidence: "medium",
    notes: "",
    hasPhoto: false,
    createdAt: "2026-11-17T05:00:00.000Z",
    updatedAt: "2026-11-17T05:00:00.000Z",
    ...over,
  };
}

function goal(over: Record<string, unknown> = {}) {
  return { effectiveFrom: "2026-11-17", mode: "cut", targetKcal: 2000, createdAt: "2026-11-17T05:00:00.000Z", ...over };
}

const item = { id: "i", name: "Bánh phở", grams: 100, per100g: { kcal: 1, carbs: 1, protein: 1, fat: 1, fiber: 0 } };

describe("meals", () => {
  test("owner can write and read own meal", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice/meals/m1"), meal()));
    await assertSucceeds(getDoc(doc(alice(), "users/alice/meals/m1")));
  });

  test("other user cannot read or write", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/meals/m1"), meal());
    });
    await assertFails(getDoc(doc(bob(), "users/alice/meals/m1")));
    await assertFails(setDoc(doc(bob(), "users/alice/meals/m2"), meal({ id: "m2" })));
    await assertFails(getDoc(doc(guest(), "users/alice/meals/m1")));
    await assertFails(setDoc(doc(guest(), "users/alice/meals/m2"), meal({ id: "m2" })));
  });

  test("meal with photo field is rejected", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice/meals/m1"), meal({ photo: "x" })));
  });

  test("meal id must match doc id", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice/meals/m1"), meal({ id: "other" })));
  });

  test("bad date rejected", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice/meals/m1"), meal({ date: "17/11/2026" })));
  });

  test("31 items rejected, 30 accepted", async () => {
    const items = (n: number) => Array.from({ length: n }, (_, i) => ({ ...item, id: `i${i}` }));
    await assertSucceeds(setDoc(doc(alice(), "users/alice/meals/m1"), meal({ items: items(30) })));
    await assertFails(setDoc(doc(alice(), "users/alice/meals/m1"), meal({ items: items(31) })));
  });

  test("title over 200 chars rejected", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice/meals/m1"), meal({ title: "a".repeat(200) })));
    await assertFails(setDoc(doc(alice(), "users/alice/meals/m1"), meal({ title: "a".repeat(201) })));
  });

  test("missing hasPhoto rejected", async () => {
    const { hasPhoto: _drop, ...rest } = meal();
    await assertFails(setDoc(doc(alice(), "users/alice/meals/m1"), rest));
  });

  test("owner can delete own meal", async () => {
    await setDoc(doc(alice(), "users/alice/meals/m1"), meal());
    const { deleteDoc } = await import("firebase/firestore");
    await assertSucceeds(deleteDoc(doc(alice(), "users/alice/meals/m1")));
  });
});

describe("goals", () => {
  test("valid goal accepted", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice/goals/2026-11-17"), goal()));
  });

  test("goal targetKcal outside 800–6000 rejected", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice/goals/2026-11-17"), goal({ targetKcal: 800 })));
    await assertSucceeds(setDoc(doc(alice(), "users/alice/goals/2026-11-17"), goal({ targetKcal: 6000 })));
    await assertFails(setDoc(doc(alice(), "users/alice/goals/2026-11-17"), goal({ targetKcal: 799 })));
    await assertFails(setDoc(doc(alice(), "users/alice/goals/2026-11-17"), goal({ targetKcal: 6001 })));
  });

  test("goal doc id must equal effectiveFrom", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice/goals/2026-11-18"), goal()));
  });

  test("other user cannot write goals", async () => {
    await assertFails(setDoc(doc(bob(), "users/alice/goals/2026-11-17"), goal()));
  });
});

describe("profile", () => {
  test("profile write ok, profile with photo rejected", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), { sex: "male", age: 25, updatedAt: "x" }));
    await assertFails(setDoc(doc(alice(), "users/alice"), { updatedAt: "x", photo: "y" }));
    await assertFails(getDoc(doc(bob(), "users/alice")));
  });
});

test("any other path denied", async () => {
  await assertFails(setDoc(doc(alice(), "foo/bar"), { a: 1 }));
  await assertFails(getDoc(doc(alice(), "foo/bar")));
});
