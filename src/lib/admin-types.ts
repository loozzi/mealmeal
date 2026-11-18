// Shared between the server (usage recording, admin stats) and the /admin page.

export type UsageCounts = {
  requests: number;
  ok: number;
  notFood: number;
  failed: number;
  rateLimited: number;
  aiCalls: number;
  inputTokens: number;
  outputTokens: number;
  missingUsage: number;
};

export type StatsRange = "today" | "7d" | "30d";
export const STATS_RANGES: readonly StatsRange[] = ["today", "7d", "30d"];
