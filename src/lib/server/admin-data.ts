import type { Timestamp } from "firebase-admin/firestore";
import type { UsageCounts } from "@/lib/admin-types";
import type { DateKey } from "@/lib/dates";
import type { RawAccount, RawStats } from "./admin-stats";
import type { AdminHandles } from "./firebase-admin";

const COUNT_KEYS: (keyof UsageCounts)[] = [
  "requests", "ok", "notFood", "failed", "rateLimited", "aiCalls", "inputTokens", "outputTokens", "missingUsage",
];
const MEAL_COUNT_CONCURRENCY = 10;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const isoOrNull = (s: string | undefined) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

async function listAccounts(auth: AdminHandles["auth"]): Promise<RawAccount[]> {
  const accounts: RawAccount[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      accounts.push({
        uid: u.uid,
        email: u.email ?? null,
        createdAt: isoOrNull(u.metadata.creationTime),
        lastSignInAt: isoOrNull(u.metadata.lastSignInTime),
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return accounts;
}

async function countMeals(db: AdminHandles["db"], uids: string[], from: DateKey, to: DateKey) {
  const meals: Record<string, number> = {};
  for (let i = 0; i < uids.length; i += MEAL_COUNT_CONCURRENCY) {
    const batch = uids.slice(i, i + MEAL_COUNT_CONCURRENCY);
    const counts = await Promise.all(
      batch.map(async (uid) => {
        const snap = await db
          .collection(`users/${uid}/meals`)
          .where("date", ">=", from)
          .where("date", "<=", to)
          .count()
          .get();
        return snap.data().count;
      }),
    );
    batch.forEach((uid, j) => {
      if (counts[j] > 0) meals[uid] = counts[j];
    });
  }
  return meals;
}

/** Reads accounts, usage counters and meal counts for [from, to] (Vietnam dates). */
export async function loadRawStats(admin: AdminHandles, from: DateKey, to: DateKey): Promise<RawStats> {
  const { db, auth } = admin;
  const [accounts, dailySnap, totalsSnap] = await Promise.all([
    listAccounts(auth),
    db.collection("usageDaily").where("date", ">=", from).where("date", "<=", to).get(),
    db.collection("usageTotals").get(),
  ]);

  const daily = dailySnap.docs.map((d) => {
    const data = d.data();
    const counts = Object.fromEntries(COUNT_KEYS.map((k) => [k, num(data[k])])) as UsageCounts;
    return { ...counts, date: String(data.date), uid: String(data.uid) };
  });
  const totals = totalsSnap.docs.map((d) => {
    const lastAt = d.get("lastAt") as Timestamp | undefined;
    return { uid: d.id, lastAt: lastAt?.toDate ? lastAt.toDate().toISOString() : null };
  });
  const meals = await countMeals(db, accounts.map((a) => a.uid), from, to);

  return { accounts, daily, totals, meals };
}
