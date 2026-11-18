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
