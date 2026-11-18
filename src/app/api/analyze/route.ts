import { after } from "next/server";
import { analyzeRequestSchema } from "@/lib/schema";
import { getAiConfig } from "@/lib/server/ai-config";
import { analyzeMeal, AnalyzeError, ERROR_STATUS } from "@/lib/server/analyze";
import { verifyIdToken } from "@/lib/server/auth";
import { getRateLimiter } from "@/lib/server/rate-limit";
import { newTally, outcomeFor } from "@/lib/server/usage";
import { recordUsage } from "@/lib/server/usage-store";
import type { ApiErrorCode } from "@/lib/types";

// Runs on the Node.js runtime, which is the default. `export const runtime` is rejected when
// `cacheComponents` is enabled in next.config.ts, so it is not declared here.
export const maxDuration = 60;

// Slightly above the image limit to leave room for the text field and JSON syntax.
const BODY_MAX_CHARS = 4_200_000;

const ERROR_MESSAGE: Record<ApiErrorCode, string> = {
  INVALID_INPUT: "Dữ liệu gửi lên không hợp lệ. Hãy thử lại với ảnh khác.",
  NOT_FOOD: "Không nhận ra món ăn. Hãy chụp rõ hơn hoặc thêm mô tả.",
  RATE_LIMITED: "Bạn đã dùng hết lượt phân tích. Hãy thử lại sau.",
  AI_ERROR: "Hệ thống phân tích đang gặp sự cố. Hãy thử lại.",
  TIMEOUT: "Phân tích mất quá nhiều thời gian. Hãy thử lại.",
  UNAUTHENTICATED: "Phiên đăng nhập đã hết. Hãy đăng nhập lại.",
};

/** The signed-in user's id from `Authorization: Bearer <Firebase ID token>`. */
async function authenticate(req: Request): Promise<string> {
  const match = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  if (!match) throw new AnalyzeError("UNAUTHENTICATED");
  const { uid } = await verifyIdToken(match[1]);
  return uid;
}

async function readInput(req: Request) {
  const raw = await req.text();
  if (raw.length > BODY_MAX_CHARS) throw new AnalyzeError("INVALID_INPUT");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AnalyzeError("INVALID_INPUT");
  }
  const parsed = analyzeRequestSchema.safeParse(json);
  if (!parsed.success) throw new AnalyzeError("INVALID_INPUT");
  return parsed.data;
}

/** An error code that is safe to log: Firestore's string/number code, never the message. */
function errorCode(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" || typeof code === "number" ? String(code) : "unknown";
}

export async function POST(req: Request): Promise<Response> {
  const started = Date.now();
  let outcome: ApiErrorCode | "OK" = "OK";
  let response: Response;
  let uid: string | undefined;
  const tally = newTally();

  try {
    // Before the body is read, so an unauthenticated caller costs nothing.
    uid = await authenticate(req);
    const { ok } = await getRateLimiter().check(`uid:${uid}`);
    if (!ok) throw new AnalyzeError("RATE_LIMITED");

    const input = await readInput(req);
    const result = await analyzeMeal(input, getAiConfig(), tally);
    response = Response.json({ result });
  } catch (err) {
    outcome = err instanceof AnalyzeError ? err.code : "AI_ERROR";
    response = Response.json(
      { error: { code: outcome, message: ERROR_MESSAGE[outcome] } },
      { status: ERROR_STATUS[outcome] },
    );
  }

  // Never log the request body (photo, description) or the user id.
  console.info(`analyze ${outcome} ${Date.now() - started}ms`);

  // Counted after the response is sent; a failed write never changes what the user got.
  const usageOutcome = outcomeFor(outcome);
  const recordFor = uid;
  if (recordFor && usageOutcome) {
    after(() =>
      recordUsage(recordFor, usageOutcome, tally, new Date()).catch((err) => {
        console.warn(`usage write failed ${errorCode(err)}`);
      }),
    );
  }
  return response;
}
