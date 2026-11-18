import type { StatsRange } from "@/lib/admin-types";
import { addDays, type DateKey } from "@/lib/dates";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar date in Vietnam (UTC+7, no DST) at `now`, whatever the server's time zone. */
export function vnDateKey(now: Date): DateKey {
  const d = new Date(now.getTime() + VN_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const RANGE_DAYS: Record<StatsRange, number> = { today: 1, "7d": 7, "30d": 30 };

/** First and last VN date (inclusive) of a stats range ending today. */
export function rangeDates(range: StatsRange, now: Date): { from: DateKey; to: DateKey } {
  const to = vnDateKey(now);
  return { from: addDays(to, 1 - RANGE_DAYS[range]), to };
}
