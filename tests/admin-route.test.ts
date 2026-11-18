import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), getAdmin: vi.fn(), load: vi.fn(), connection: vi.fn() }));

vi.mock("@/lib/server/auth", () => ({ verifyIdToken: mocks.verify }));
vi.mock("@/lib/server/firebase-admin", () => ({ getAdmin: mocks.getAdmin }));
vi.mock("@/lib/server/admin-data", () => ({ loadRawStats: mocks.load }));
vi.mock("next/server", () => ({ connection: mocks.connection }));

import { GET } from "@/app/api/admin/stats/route";
import { AnalyzeError } from "@/lib/server/analyze";

const get = (query = "", headers: Record<string, string> = { authorization: "Bearer admin" }) =>
  GET(new Request(`http://x/api/admin/stats${query}`, { headers }));

async function expectError(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toBe("no-store");
  const json = await res.json();
  expect(json.error.code).toBe(code);
  return json.error.message as string;
}

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  mocks.verify.mockReset().mockImplementation(async (token: string) => {
    if (token === "admin") return { uid: "a1", email: "admin@example.com", emailVerified: true };
    if (token === "user") return { uid: "u1", email: "user@example.com", emailVerified: true };
    throw new AnalyzeError("UNAUTHENTICATED");
  });
  mocks.connection.mockReset().mockResolvedValue(undefined);
  mocks.getAdmin.mockReset().mockReturnValue({ db: {}, auth: {} });
  mocks.load.mockReset().mockResolvedValue({ accounts: [], daily: [], totals: [], meals: {} });
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/admin/stats", () => {
  // Under cacheComponents a GET is prerendered at build time unless it waits for a request first.
  it("waits for a request before reading it", async () => {
    await get();
    expect(mocks.connection).toHaveBeenCalledTimes(1);
    expect(mocks.connection.mock.invocationCallOrder[0]).toBeLessThan(mocks.verify.mock.invocationCallOrder[0]);
  });

  it("401 without a token", async () => {
    expect(await expectError(await get("", {}), 401, "UNAUTHENTICATED")).toBe("Phiên đăng nhập đã hết. Hãy đăng nhập lại.");
  });

  it("403 for a non-admin", async () => {
    const message = await expectError(await get("", { authorization: "Bearer user" }), 403, "FORBIDDEN");
    expect(message).toBe("Bạn không có quyền xem trang này.");
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("400 for an unknown range", async () => {
    expect(await expectError(await get("?range=1y"), 400, "INVALID_INPUT")).toBe("Khoảng thời gian không hợp lệ.");
  });

  it("503 without admin credentials", async () => {
    mocks.getAdmin.mockReturnValue(null);
    expect(await expectError(await get(), 503, "ADMIN_UNAVAILABLE")).toBe("Chưa cấu hình quyền đọc số liệu trên server.");
  });

  it("502 when reading fails", async () => {
    mocks.load.mockRejectedValue(new Error("boom"));
    expect(await expectError(await get(), 502, "ADMIN_ERROR")).toBe("Không tải được số liệu. Hãy thử lại.");
  });

  it("returns 7-day stats by default, uncached", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.range).toBe("7d");
    expect(json.days).toHaveLength(7);
    expect(mocks.load).toHaveBeenCalledWith({ db: {}, auth: {} }, json.from, json.to);
  });

  it("logs only the outcome and duration", async () => {
    await get("", { authorization: "Bearer user" });
    const line = (console.info as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(" ");
    expect(line).toMatch(/^admin stats FORBIDDEN \d+ms$/);
  });
});
