import { describe, expect, it } from "vitest";
import type { UsageCounts } from "@/lib/admin-types";
import { buildStats, type RawStats } from "@/lib/server/admin-stats";

const zero: UsageCounts = {
  requests: 0, ok: 0, notFood: 0, failed: 0, rateLimited: 0, aiCalls: 0, inputTokens: 0, outputTokens: 0, missingUsage: 0,
};
const now = new Date("2026-11-18T03:00:00Z");
const price = { inputPer1M: 0.1, outputPer1M: 0.4 };

const raw: RawStats = {
  accounts: [
    { uid: "A", email: "a@example.com", createdAt: "2026-11-15T10:00:00.000Z", lastSignInAt: "2026-11-18T01:00:00.000Z" },
    { uid: "B", email: "b@example.com", createdAt: "2026-10-01T00:00:00.000Z", lastSignInAt: null },
  ],
  daily: [
    { ...zero, date: "2026-11-18", uid: "A", requests: 3, ok: 2, notFood: 1, aiCalls: 4, inputTokens: 1_000_000, outputTokens: 500_000 },
    { ...zero, date: "2026-11-12", uid: "A", inputTokens: 2_000_000 },
    { ...zero, date: "2026-11-17", uid: "ghost", requests: 1, outputTokens: 1_000_000 },
  ],
  totals: [{ uid: "A", lastAt: "2026-11-18T02:00:00.000Z" }],
  meals: { B: 2 },
};

describe("buildStats", () => {
  const stats = buildStats(raw, { range: "7d", now, price });

  it("lists every day of the range in order, including empty days", () => {
    expect(stats.days).toHaveLength(7);
    expect(stats.days[0].date).toBe("2026-11-12");
    expect(stats.days[6].date).toBe("2026-11-18");
    expect(stats.days[1]).toEqual({ ...zero, date: "2026-11-13", activeUsers: 0, costUsd: 0 });
    expect(stats.days[6].activeUsers).toBe(1);
  });

  it("adds up totals and cost", () => {
    expect(stats.range).toBe("7d");
    expect(stats.from).toBe("2026-11-12");
    expect(stats.to).toBe("2026-11-18");
    expect(stats.price).toEqual(price);
    expect(stats.totals.costUsd).toBeCloseTo(0.9);
    expect(stats.totals.requests).toBe(4);
    expect(stats.totals.inputTokens).toBe(3_000_000);
    expect(stats.totals.accounts).toBe(2);
    expect(stats.totals.newAccounts).toBe(1);
    expect(stats.totals.activeUsers).toBe(3);
    expect(stats.totals.meals).toBe(2);
  });

  it("orders users by cost and keeps users missing from Auth", () => {
    expect(stats.users.map((u) => u.uid)).toEqual(["A", "ghost", "B"]);
    const [a, ghost, b] = stats.users;
    expect(a.costUsd).toBeCloseTo(0.5);
    expect(a.lastUsedAt).toBe("2026-11-18T02:00:00.000Z");
    expect(a.requests).toBe(3);
    expect(ghost.costUsd).toBeCloseTo(0.4);
    expect(ghost.email).toBeNull();
    expect(b.costUsd).toBe(0);
    expect(b.meals).toBe(2);
  });

  it("has no cost without a price and orders by tokens", () => {
    const s = buildStats(raw, { range: "7d", now, price: null });
    expect(s.price).toBeNull();
    expect(s.totals.costUsd).toBeNull();
    expect(s.days.every((d) => d.costUsd === null)).toBe(true);
    expect(s.users.every((u) => u.costUsd === null)).toBe(true);
    expect(s.users.map((u) => u.uid)).toEqual(["A", "ghost", "B"]);
  });

  it("counts a new account by its Vietnam date", () => {
    // 2026-11-11T17:30Z is already 2026-11-12 in Vietnam, the first day of the range.
    const s = buildStats(
      { ...raw, accounts: [{ uid: "C", email: null, createdAt: "2026-11-11T17:30:00.000Z", lastSignInAt: null }] },
      { range: "7d", now, price },
    );
    expect(s.totals.newAccounts).toBe(1);
  });
});
