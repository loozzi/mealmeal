import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminStats } from "@/lib/admin-client";

const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();
const body = { range: "7d", from: "2026-11-11", to: "2026-11-17", users: [] };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchAdminStats", () => {
  it("returns the body on 200 and sends the range and token", async () => {
    fetchMock.mockResolvedValueOnce(res(200, body));
    await expect(fetchAdminStats("7d", async () => "t0")).resolves.toEqual(body);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/stats?range=7d");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer t0");
    expect(init.cache).toBe("no-store");
  });

  it("refreshes the token once after a 401", async () => {
    const getToken = vi.fn(async (force: boolean) => (force ? "t1" : "t0"));
    fetchMock.mockResolvedValueOnce(res(401, { error: { code: "UNAUTHENTICATED", message: "" } }));
    fetchMock.mockResolvedValueOnce(res(200, body));
    await expect(fetchAdminStats("30d", getToken)).resolves.toEqual(body);
    expect(getToken.mock.calls).toEqual([[false], [true]]);
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get("authorization")).toBe("Bearer t1");
  });

  it("gives UNAUTHENTICATED after a second 401", async () => {
    fetchMock.mockImplementation(async () => res(401, { error: { code: "UNAUTHENTICATED", message: "" } }));
    await expect(fetchAdminStats("7d", async () => "t")).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps 403 to FORBIDDEN", async () => {
    fetchMock.mockResolvedValueOnce(res(403, { error: { code: "FORBIDDEN", message: "x" } }));
    await expect(fetchAdminStats("7d", async () => "t")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps the server message for ADMIN_UNAVAILABLE", async () => {
    fetchMock.mockResolvedValueOnce(res(503, { error: { code: "ADMIN_UNAVAILABLE", message: "Chưa cấu hình." } }));
    await expect(fetchAdminStats("7d", async () => "t")).rejects.toMatchObject({
      code: "ADMIN_UNAVAILABLE",
      serverMessage: "Chưa cấu hình.",
    });
  });

  it("maps a rejected fetch to NETWORK", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(fetchAdminStats("7d", async () => "t")).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("maps unknown codes and non-JSON bodies to ADMIN_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(res(500, { error: { code: "XYZ" } }));
    await expect(fetchAdminStats("7d", async () => "t")).rejects.toMatchObject({ code: "ADMIN_ERROR" });
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 502 }));
    await expect(fetchAdminStats("7d", async () => "t")).rejects.toMatchObject({ code: "ADMIN_ERROR" });
  });

  it("gives UNAUTHENTICATED without calling fetch when there is no token", async () => {
    await expect(fetchAdminStats("7d", async () => null)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
