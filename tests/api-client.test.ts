import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyze, ERROR_MESSAGE } from "@/lib/api-client";

const good = {
  title: "Cơm gà",
  confidence: "medium",
  notes: "",
  items: [{ name: "Cơm", grams: 200, kcal: 260, carbs_g: 57, protein_g: 5, fat_g: 0.5, fiber_g: 0.6 }],
};
const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn();
const tok = async () => "t0";

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("analyze", () => {
  it("posts JSON to /api/analyze and returns the result", async () => {
    fetchMock.mockResolvedValueOnce(res(200, { result: good }));
    const signal = new AbortController().signal;
    await expect(analyze({ text: "x" }, signal, tok)).resolves.toMatchObject({ title: "Cơm gà" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analyze");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ text: "x" });
    expect(init.signal).toBe(signal);
  });

  it("passes through known error codes", async () => {
    fetchMock.mockResolvedValueOnce(res(422, { error: { code: "NOT_FOOD", message: "" } }));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "NOT_FOOD" });
    fetchMock.mockResolvedValueOnce(res(429, { error: { code: "RATE_LIMITED", message: "" } }));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("treats unreadable or unknown responses as AI_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 500 }));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "AI_ERROR" });
    fetchMock.mockResolvedValueOnce(res(500, { error: { code: "WHATEVER" } }));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "AI_ERROR" });
    fetchMock.mockResolvedValueOnce(res(200, { result: { title: "x" } }));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "AI_ERROR" });
  });

  it("distinguishes network failure from cancellation", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "NETWORK" });
    fetchMock.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("has a message for every code shown to the user", () => {
    for (const k of ["INVALID_INPUT", "NOT_FOOD", "RATE_LIMITED", "AI_ERROR", "TIMEOUT", "UNAUTHENTICATED", "NETWORK"] as const)
      expect(ERROR_MESSAGE[k].length).toBeGreaterThan(0);
    expect(ERROR_MESSAGE.NETWORK).toBe("Không có kết nối mạng.");
  });

  it("sends bearer token", async () => {
    fetchMock.mockResolvedValueOnce(res(200, { result: good }));
    await analyze({ text: "x" }, undefined, tok);
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe("Bearer t0");
  });

  it("401 then refresh once", async () => {
    const getToken = vi.fn(async (force: boolean) => (force ? "t1" : "t0"));
    fetchMock
      .mockResolvedValueOnce(res(401, { error: { code: "UNAUTHENTICATED", message: "" } }))
      .mockResolvedValueOnce(res(200, { result: good }));
    await expect(analyze({ text: "x" }, undefined, getToken)).resolves.toMatchObject({ title: "Cơm gà" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getToken.mock.calls).toEqual([[false], [true]]);
    expect(fetchMock.mock.calls[1][1].headers.authorization).toBe("Bearer t1");
  });

  it("401 twice → UNAUTHENTICATED", async () => {
    fetchMock.mockImplementation(async () => res(401, { error: { code: "UNAUTHENTICATED", message: "" } }));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(ERROR_MESSAGE.UNAUTHENTICATED).toBe("Phiên đăng nhập đã hết. Hãy đăng nhập lại.");
  });

  it("no token → UNAUTHENTICATED without fetch", async () => {
    await expect(analyze({ text: "x" }, undefined, async () => null)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a failing token getter is UNAUTHENTICATED", async () => {
    await expect(
      analyze({ text: "x" }, undefined, async () => {
        throw new Error("auth/network-request-failed");
      }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("abort during the retry is ABORTED", async () => {
    fetchMock
      .mockResolvedValueOnce(res(401, { error: { code: "UNAUTHENTICATED", message: "" } }))
      .mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    await expect(analyze({ text: "x" }, undefined, tok)).rejects.toMatchObject({ code: "ABORTED" });
  });
});
