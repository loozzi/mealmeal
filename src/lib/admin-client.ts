import type { AdminErrorCode, AdminStats, StatsRange } from "./admin-types";
import { currentUserToken, type TokenGetter } from "./api-client";

export type AdminClientCode = AdminErrorCode | "NETWORK";

export class AdminClientError extends Error {
  /** `serverMessage` is the API's own text, shown for ADMIN_UNAVAILABLE. */
  constructor(public code: AdminClientCode, public serverMessage?: string) {
    super(code);
    this.name = "AdminClientError";
  }
}

const CODES: readonly AdminErrorCode[] = ["UNAUTHENTICATED", "FORBIDDEN", "INVALID_INPUT", "ADMIN_UNAVAILABLE", "ADMIN_ERROR"];

async function tokenOrThrow(getToken: TokenGetter, forceRefresh: boolean): Promise<string> {
  const token = await getToken(forceRefresh).catch(() => null);
  if (!token) throw new AdminClientError("UNAUTHENTICATED");
  return token;
}

async function send(range: StatsRange, token: string): Promise<AdminStats> {
  let response: Response;
  let body: unknown = null;
  try {
    response = await fetch(`/api/admin/stats?range=${range}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    body = await response.json().catch(() => null);
  } catch {
    throw new AdminClientError("NETWORK");
  }
  if (response.ok && body !== null) return body as AdminStats;

  const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  const code = CODES.includes(error?.code as AdminErrorCode) ? (error!.code as AdminErrorCode) : "ADMIN_ERROR";
  throw new AdminClientError(code, typeof error?.message === "string" ? error.message : undefined);
}

/** Loads `/api/admin/stats`. On a 401 the token is refreshed and the request retried once. */
export async function fetchAdminStats(range: StatsRange, getToken: TokenGetter = currentUserToken): Promise<AdminStats> {
  try {
    return await send(range, await tokenOrThrow(getToken, false));
  } catch (err) {
    if (!(err instanceof AdminClientError) || err.code !== "UNAUTHENTICATED") throw err;
    // No token at all also lands here; a second attempt with a forced refresh is harmless.
    return send(range, await tokenOrThrow(getToken, true));
  }
}
