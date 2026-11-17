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

const API_CODES: readonly ApiErrorCode[] = [
  "INVALID_INPUT",
  "NOT_FOOD",
  "RATE_LIMITED",
  "AI_ERROR",
  "TIMEOUT",
  "UNAUTHENTICATED",
];

/** Returns the signed-in user's Firebase ID token, or null when nobody is signed in. */
export type TokenGetter = (forceRefresh: boolean) => Promise<string | null>;

const currentUserToken: TokenGetter = async (forceRefresh) => {
  // Imported lazily so this module (and its tests) do not load Firebase up front.
  const { getFirebase } = await import("./firebase");
  return (await getFirebase().auth.currentUser?.getIdToken(forceRefresh)) ?? null;
};

const isAbort = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { name?: unknown }).name === "AbortError";

/**
 * Sends a meal to `/api/analyze` with the user's ID token. On a 401 the token is refreshed and the
 * request retried once; a second 401, or no token at all, is UNAUTHENTICATED.
 */
export async function analyze(
  req: AnalyzeRequest,
  signal?: AbortSignal,
  getToken: TokenGetter = currentUserToken,
): Promise<MealAnalysis> {
  const token = await tokenOrThrow(getToken, false);
  try {
    return await send(req, signal, token);
  } catch (err) {
    if (!(err instanceof AnalyzeClientError) || err.code !== "UNAUTHENTICATED") throw err;
    return send(req, signal, await tokenOrThrow(getToken, true));
  }
}

async function tokenOrThrow(getToken: TokenGetter, forceRefresh: boolean): Promise<string> {
  let token: string | null;
  try {
    token = await getToken(forceRefresh);
  } catch {
    token = null;
  }
  if (!token) throw new AnalyzeClientError("UNAUTHENTICATED");
  return token;
}

async function send(req: AnalyzeRequest, signal: AbortSignal | undefined, token: string): Promise<MealAnalysis> {
  let response: Response;
  let body: unknown = null;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
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
