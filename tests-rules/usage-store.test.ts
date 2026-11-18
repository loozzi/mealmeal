import { afterAll, beforeAll, expect, test } from "vitest";
import { getAdmin } from "@/lib/server/firebase-admin";
import { recordUsage } from "@/lib/server/usage-store";

// Runs against the Firestore emulator started by `npm run test:rules` (FIRESTORE_EMULATOR_HOST is set by it).
const tally = { aiCalls: 1, inputTokens: 100, outputTokens: 20, missingUsage: 0 };
const dailyPath = "usageDaily/2026-11-18_u1";
const totalsPath = "usageTotals/u1";

beforeAll(() => {
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-mealmeal";
});

afterAll(async () => {
  const db = getAdmin()?.db;
  await Promise.all([db?.doc(dailyPath).delete(), db?.doc(totalsPath).delete()]);
});

test("concurrent writes add up on the VN date", async () => {
  const now = new Date("2026-11-17T17:30:00Z");
  await Promise.all([recordUsage("u1", "ok", tally, now), recordUsage("u1", "ok", tally, now)]);

  const db = getAdmin()!.db;
  const daily = (await db.doc(dailyPath).get()).data();
  expect(daily).toMatchObject({ date: "2026-11-18", uid: "u1", requests: 2, ok: 2, inputTokens: 200, outputTokens: 40 });
  const totals = (await db.doc(totalsPath).get()).data();
  expect(totals?.requests).toBe(2);
});
