// Shared between the server (usage recording, admin stats) and the /admin page.

import type { DateKey } from "./dates";

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

export type StatsPrice = { inputPer1M: number; outputPer1M: number };

export type AdminStats = {
  range: StatsRange;
  from: DateKey; // first day, Vietnam time
  to: DateKey; // today, Vietnam time
  generatedAt: string;
  price: StatsPrice | null;
  totals: UsageCounts & {
    accounts: number;
    newAccounts: number;
    activeUsers: number;
    meals: number;
    costUsd: number | null;
  };
  days: Array<UsageCounts & { date: DateKey; activeUsers: number; costUsd: number | null }>;
  users: Array<
    UsageCounts & {
      uid: string;
      email: string | null;
      createdAt: string | null;
      lastSignInAt: string | null;
      lastUsedAt: string | null;
      meals: number;
      costUsd: number | null;
    }
  >;
};

export type AdminErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_INPUT" | "ADMIN_UNAVAILABLE" | "ADMIN_ERROR";

export const ADMIN_ERROR_MESSAGE: Record<AdminErrorCode, string> = {
  UNAUTHENTICATED: "Phiên đăng nhập đã hết. Hãy đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền xem trang này.",
  INVALID_INPUT: "Khoảng thời gian không hợp lệ.",
  ADMIN_UNAVAILABLE: "Chưa cấu hình quyền đọc số liệu trên server.",
  ADMIN_ERROR: "Không tải được số liệu. Hãy thử lại.",
};

export const ADMIN_ERROR_STATUS: Record<AdminErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  ADMIN_UNAVAILABLE: 503,
  ADMIN_ERROR: 502,
};
