import { analyzeRequestSchema } from "@/lib/schema";
import { getAiConfig } from "@/lib/server/ai-config";
import { analyzeMeal, AnalyzeError, ERROR_STATUS } from "@/lib/server/analyze";
import { getRateLimiter } from "@/lib/server/rate-limit";
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
};

function clientKey(req: Request): string {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
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

export async function POST(req: Request): Promise<Response> {
  const started = Date.now();
  let outcome: ApiErrorCode | "OK" = "OK";
  let response: Response;

  try {
    const { ok } = await getRateLimiter().check(clientKey(req));
    if (!ok) throw new AnalyzeError("RATE_LIMITED");

    const input = await readInput(req);
    const result = await analyzeMeal(input, getAiConfig());
    response = Response.json({ result });
  } catch (err) {
    outcome = err instanceof AnalyzeError ? err.code : "AI_ERROR";
    response = Response.json(
      { error: { code: outcome, message: ERROR_MESSAGE[outcome] } },
      { status: ERROR_STATUS[outcome] },
    );
  }

  // Never log the request body: it holds the user's photo and description.
  console.info(`analyze ${outcome} ${Date.now() - started}ms`);
  return response;
}
