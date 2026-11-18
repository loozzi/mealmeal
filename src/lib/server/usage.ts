import type { UsageCounts } from "@/lib/admin-types";
import type { ApiErrorCode } from "@/lib/types";

/** AI calls and tokens spent while serving one /api/analyze request. */
export type UsageTally = { aiCalls: number; inputTokens: number; outputTokens: number; missingUsage: number };

export type UsageOutcome = "ok" | "notFood" | "failed" | "rateLimited" | "invalid";

export function newTally(): UsageTally {
  return { aiCalls: 0, inputTokens: 0, outputTokens: 0, missingUsage: 0 };
}

/** Which counter a request result goes into. `null` means the request is not recorded (no known user). */
export function outcomeFor(code: ApiErrorCode | "OK"): UsageOutcome | null {
  switch (code) {
    case "OK":
      return "ok";
    case "NOT_FOOD":
      return "notFood";
    case "AI_ERROR":
    case "TIMEOUT":
      return "failed";
    case "RATE_LIMITED":
      return "rateLimited";
    case "INVALID_INPUT":
      return "invalid";
    case "UNAUTHENTICATED":
      return null;
  }
}

/** The amounts to add to the stored counters for one request. */
export function usageIncrements(outcome: UsageOutcome, tally: UsageTally): UsageCounts {
  return {
    requests: 1,
    ok: outcome === "ok" ? 1 : 0,
    notFood: outcome === "notFood" ? 1 : 0,
    failed: outcome === "failed" ? 1 : 0,
    rateLimited: outcome === "rateLimited" ? 1 : 0,
    aiCalls: tally.aiCalls,
    inputTokens: tally.inputTokens,
    outputTokens: tally.outputTokens,
    missingUsage: tally.missingUsage,
  };
}
