import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "@/lib/server/rate-limit";

describe("createMemoryRateLimiter", () => {
  it("enforces per-minute and per-day limits per key", async () => {
    let t = 0;
    const rl = createMemoryRateLimiter({ perMinute: 2, perDay: 3, now: () => t });
    expect((await rl.check("ip")).ok).toBe(true);
    expect((await rl.check("ip")).ok).toBe(true);
    expect((await rl.check("ip")).ok).toBe(false); // over 2/minute
    expect((await rl.check("other")).ok).toBe(true); // other keys unaffected
    t = 61_000;
    expect((await rl.check("ip")).ok).toBe(true); // new minute, third of the day
    t = 122_000;
    expect((await rl.check("ip")).ok).toBe(false); // over 3/day
    t = 24 * 3600_000 + 1000;
    expect((await rl.check("ip")).ok).toBe(true); // new day
  });

  it("defaults to 10 per minute", async () => {
    const rl = createMemoryRateLimiter({ now: () => 0 });
    for (let i = 0; i < 10; i++) expect((await rl.check("ip")).ok).toBe(true);
    expect((await rl.check("ip")).ok).toBe(false);
  });
});
