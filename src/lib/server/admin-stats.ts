import type { AdminStats, StatsRange, UsageCounts } from "@/lib/admin-types";
import { addDays, type DateKey } from "@/lib/dates";
import { costUsd, type Price } from "./pricing";
import { rangeDates, vnDateKey } from "./vn-date";

export type RawAccount = { uid: string; email: string | null; createdAt: string | null; lastSignInAt: string | null };

/** What the admin page needs from Firestore and Auth, before any aggregation. */
export type RawStats = {
  accounts: RawAccount[];
  daily: (UsageCounts & { date: DateKey; uid: string })[];
  totals: { uid: string; lastAt: string | null }[];
  meals: Record<string, number>; // meals in range, by uid
};

const COUNT_KEYS = [
  "requests", "ok", "notFood", "failed", "rateLimited", "aiCalls", "inputTokens", "outputTokens", "missingUsage",
] as const satisfies readonly (keyof UsageCounts)[];

function zeroCounts(): UsageCounts {
  return { requests: 0, ok: 0, notFood: 0, failed: 0, rateLimited: 0, aiCalls: 0, inputTokens: 0, outputTokens: 0, missingUsage: 0 };
}

function addInto(target: UsageCounts, source: UsageCounts) {
  for (const k of COUNT_KEYS) target[k] += source[k];
}

function daysBetween(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

type UserRow = AdminStats["users"][number];

function compareUsers(a: UserRow, b: UserRow): number {
  const primary =
    a.costUsd !== null && b.costUsd !== null
      ? b.costUsd - a.costUsd
      : b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens);
  if (primary !== 0) return primary;
  if (a.meals !== b.meals) return b.meals - a.meals;
  if (a.email !== b.email) {
    if (a.email === null) return 1;
    if (b.email === null) return -1;
    return a.email < b.email ? -1 : 1;
  }
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

/** Turns raw reads into the /api/admin/stats response. Pure: the same input always gives the same output. */
export function buildStats(raw: RawStats, opts: { range: StatsRange; now: Date; price: Price | null }): AdminStats {
  const { range, now, price } = opts;
  const { from, to } = rangeDates(range, now);
  const inRange = (d: DateKey) => d >= from && d <= to;

  const byDay = new Map<DateKey, UsageCounts & { users: Set<string> }>();
  for (const date of daysBetween(from, to)) byDay.set(date, { ...zeroCounts(), users: new Set() });

  const byUser = new Map<string, UsageCounts>();
  for (const row of raw.daily) {
    if (!inRange(row.date)) continue;
    const day = byDay.get(row.date)!;
    addInto(day, row);
    if (row.requests > 0) day.users.add(row.uid);
    if (!byUser.has(row.uid)) byUser.set(row.uid, zeroCounts());
    addInto(byUser.get(row.uid)!, row);
  }

  const lastAt = new Map(raw.totals.map((t) => [t.uid, t.lastAt]));
  const accounts = new Map(raw.accounts.map((a) => [a.uid, a]));
  // Every Auth account, plus uids with usage in range whose account was deleted.
  const uids = new Set([...accounts.keys(), ...byUser.keys()]);

  const users: UserRow[] = [...uids].map((uid) => {
    const account = accounts.get(uid);
    const counts = byUser.get(uid) ?? zeroCounts();
    return {
      ...counts,
      uid,
      email: account?.email ?? null,
      createdAt: account?.createdAt ?? null,
      lastSignInAt: account?.lastSignInAt ?? null,
      lastUsedAt: lastAt.get(uid) ?? null,
      meals: raw.meals[uid] ?? 0,
      costUsd: costUsd(counts, price),
    };
  });
  users.sort(compareUsers);

  const totals = zeroCounts();
  for (const counts of byUser.values()) addInto(totals, counts);

  const days = [...byDay.entries()].map(([date, { users: active, ...counts }]) => ({
    ...counts,
    date,
    activeUsers: active.size,
    costUsd: costUsd(counts, price),
  }));

  return {
    range,
    from,
    to,
    generatedAt: now.toISOString(),
    price,
    totals: {
      ...totals,
      accounts: raw.accounts.length,
      newAccounts: raw.accounts.filter((a) => a.createdAt !== null && inRange(vnDateKey(new Date(a.createdAt)))).length,
      activeUsers: users.filter((u) => u.requests > 0 || u.meals > 0).length,
      meals: users.reduce((sum, u) => sum + u.meals, 0),
      costUsd: costUsd(totals, price),
    },
    days,
    users,
  };
}
