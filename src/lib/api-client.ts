import { mealAnalysisSchema, type AnalyzeRequest, type MealAnalysis } from "./schema";
import type { ApiErrorCode } from "./types";

export type ClientErrorCode = ApiErrorCode | "NETWORK" | "ABORTED";

export class AnalyzeClientError extends Error {
  constructor(public code: ClientErrorCode) {
    super(code);
    this.name = "AnalyzeClientError";
  }
}

/** ABORTED has no message: cancelling is the user's own action and shows no error. */
export const ERROR_MESSAGE: Record<Exclude<ClientErrorCode, "ABORTED">, string> = {
  INVALID_INPUT: "Dữ liệu gửi lên không hợp lệ. Hãy thử lại với ảnh khác.",
  NOT_FOOD: "Không nhận ra món ăn. Hãy chụp rõ hơn hoặc thêm mô tả.",
  RATE_LIMITED: "Bạn đã dùng hết lượt phân tích. Hãy thử lại sau.",
  AI_ERROR: "Hệ thống phân tích đang gặp sự cố. Hãy thử lại.",
  TIMEOUT: "Phân tích mất quá nhiều thời gian. Hãy thử lại.",
  UNAUTHENTICATED: "Phiên đăng nhập đã hết. Hãy đăng nhập lại.",
  NETWORK: "Không có kết nối mạng.",
};

const API_CODES: readonly ApiErrorCode[] = ["INVALID_INPUT", "NOT_FOOD", "RATE_LIMITED", "AI_ERROR", "TIMEOUT"];

const isAbort = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { name?: unknown }).name === "AbortError";

export async function analyze(req: AnalyzeRequest, signal?: AbortSignal): Promise<MealAnalysis> {
  let response: Response;
  let body: unknown = null;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal,
    });
    // A body that is not JSON (e.g. an HTML error page from the host) is handled below as AI_ERROR.
    body = await response.json().catch((err: unknown) => {
      if (isAbort(err)) throw err;
      return null;
    });
  } catch (err) {
    throw new AnalyzeClientError(isAbort(err) ? "ABORTED" : "NETWORK");
  }

  if (response.ok) {
    const parsed = mealAnalysisSchema.safeParse((body as { result?: unknown } | null)?.result);
    if (parsed.success) return parsed.data;
    throw new AnalyzeClientError("AI_ERROR");
  }

  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
  throw new AnalyzeClientError(API_CODES.includes(code as ApiErrorCode) ? (code as ApiErrorCode) : "AI_ERROR");
}
