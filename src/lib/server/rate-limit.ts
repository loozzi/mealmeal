import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimiter {
  check(key: string): Promise<{ ok: boolean }>;
}

const PER_MINUTE = 10;
const PER_DAY = 60;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 3600_000;

type Window = { start: number; count: number };
type Entry = { minute: Window; day: Window };

/**
 * In-process limiter for local development. Fixed windows that start at the first call of each
 * window. A denied call does not consume quota. Serverless instances do not share this memory, so
 * production must use the Upstash limiter.
 */
export function createMemoryRateLimiter(
  opts: { perMinute?: number; perDay?: number; now?: () => number } = {},
): RateLimiter {
  const perMinute = opts.perMinute ?? PER_MINUTE;
  const perDay = opts.perDay ?? PER_DAY;
  const now = opts.now ?? Date.now;
  const entries = new Map<string, Entry>();

  return {
    async check(key) {
      const t = now();

      // Drop keys whose day window has expired so the map cannot grow without bound.
      if (entries.size > 5000) {
        for (const [k, e] of entries) if (t - e.day.start >= DAY_MS) entries.delete(k);
      }

      let entry = entries.get(key);
      if (!entry) {
        entry = { minute: { start: t, count: 0 }, day: { start: t, count: 0 } };
        entries.set(key, entry);
      }
      if (t - entry.minute.start >= MINUTE_MS) entry.minute = { start: t, count: 0 };
      if (t - entry.day.start >= DAY_MS) entry.day = { start: t, count: 0 };

      if (entry.minute.count >= perMinute || entry.day.count >= perDay) return { ok: false };
      entry.minute.count += 1;
      entry.day.count += 1;
      return { ok: true };
    },
  };
}

function createUpstashRateLimiter(url: string, token: string): RateLimiter {
  const redis = new Redis({ url, token });
  const minute = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(PER_MINUTE, "60 s"),
    prefix: "mealmeal:rl:minute",
  });
  const day = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(PER_DAY, "1 d"),
    prefix: "mealmeal:rl:day",
  });

  return {
    async check(key) {
      // Minute first: a call stopped by the minute limit should not use up the daily quota.
      if (!(await minute.limit(key)).success) return { ok: false };
      return { ok: (await day.limit(key)).success };
    },
  };
}

let shared: RateLimiter | undefined;

export function getRateLimiter(): RateLimiter {
  if (shared) return shared;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  shared = url && token ? createUpstashRateLimiter(url, token) : createMemoryRateLimiter();
  return shared;
}
