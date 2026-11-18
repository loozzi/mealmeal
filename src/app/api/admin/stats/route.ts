import { ADMIN_ERROR_MESSAGE, ADMIN_ERROR_STATUS, STATS_RANGES, type AdminErrorCode, type StatsRange } from "@/lib/admin-types";
import { isAdmin } from "@/lib/server/admin-auth";
import { loadRawStats } from "@/lib/server/admin-data";
import { buildStats } from "@/lib/server/admin-stats";
import { verifyIdToken } from "@/lib/server/auth";
import { getAdmin } from "@/lib/server/firebase-admin";
import { parsePrice } from "@/lib/server/pricing";
import { rangeDates } from "@/lib/server/vn-date";

// Node.js runtime (the default). Reading the Authorization header makes this route dynamic.
export const maxDuration = 60;

class AdminError extends Error {
  constructor(public code: AdminErrorCode) {
    super(code);
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

async function authorize(req: Request) {
  const match = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  if (!match) throw new AdminError("UNAUTHENTICATED");
  let claims;
  try {
    claims = await verifyIdToken(match[1]);
  } catch {
    throw new AdminError("UNAUTHENTICATED");
  }
  if (!isAdmin(claims, process.env.ADMIN_EMAILS)) throw new AdminError("FORBIDDEN");
}

function readRange(req: Request): StatsRange {
  const raw = new URL(req.url).searchParams.get("range") ?? "7d";
  if (!(STATS_RANGES as readonly string[]).includes(raw)) throw new AdminError("INVALID_INPUT");
  return raw as StatsRange;
}

export async function GET(req: Request): Promise<Response> {
  const started = Date.now();
  let outcome: AdminErrorCode | "OK" = "OK";
  let response: Response;

  try {
    await authorize(req);
    const range = readRange(req);
    const admin = getAdmin();
    if (!admin) throw new AdminError("ADMIN_UNAVAILABLE");

    const now = new Date();
    const { from, to } = rangeDates(range, now);
    let raw;
    try {
      raw = await loadRawStats(admin, from, to);
    } catch {
      throw new AdminError("ADMIN_ERROR");
    }
    const price = parsePrice({
      input: process.env.AI_PRICE_INPUT_PER_1M_USD,
      output: process.env.AI_PRICE_OUTPUT_PER_1M_USD,
    });
    response = Response.json(buildStats(raw, { range, now, price }), { headers: NO_STORE });
  } catch (err) {
    outcome = err instanceof AdminError ? err.code : "ADMIN_ERROR";
    response = Response.json(
      { error: { code: outcome, message: ADMIN_ERROR_MESSAGE[outcome] } },
      { status: ADMIN_ERROR_STATUS[outcome], headers: NO_STORE },
    );
  }

  // No uid or email in logs.
  console.info(`admin stats ${outcome} ${Date.now() - started}ms`);
  return response;
}
