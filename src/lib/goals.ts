import type { DateKey } from "./dates";
import type { Goal } from "./types";

/**
 * The goal that applies to a day: the latest one with effectiveFrom <= date. Days before the first
 * goal use the earliest goal, so old days never lose their target. Undefined only for an empty list.
 */
export function goalForDate(goals: Goal[], date: DateKey): Goal | undefined {
  let latestInEffect: Goal | undefined;
  let earliest: Goal | undefined;
  for (const g of goals) {
    if (!earliest || g.effectiveFrom < earliest.effectiveFrom) earliest = g;
    if (g.effectiveFrom <= date && (!latestInEffect || g.effectiveFrom > latestInEffect.effectiveFrom)) {
      latestInEffect = g;
    }
  }
  return latestInEffect ?? earliest;
}
