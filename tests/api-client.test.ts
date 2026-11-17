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

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("analyze", () => {
  it("posts JSON to /api/analyze and returns the result", async () => {
    fetchMock.mockResolvedValueOnce(res(200, { result: good }));
    const signal = new AbortController().signal;
    await expect(analyze({ text: "x" }, signal)).resolves.toMatchObject({ title: "Cơm gà" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/analyze");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ text: "x" });
    expect(init.signal).toBe(signal);
  });

  it("passes through known error codes", async () => {
    fetchMock.mockResolvedValueOnce(res(422, { error: { code: "NOT_FOOD", message: "" } }));
    await expect(analyze({ text: "x" })).rejects.toMatchObject({ code: "NOT_FOOD" });
    fetchMock.mockResolvedValueOnce(res(429, { error: { code: "RATE_LIMITED", message: "" } }));
    await expect(analyze({ text: "x" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("treats unreadable or unknown responses as AI_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 500 }));
    await expect(analyze({ text: "x" })).rejects.toMatchObject({ code: "AI_ERROR" });
    fetchMock.mockResolvedValueOnce(res(500, { error: { code: "WHATEVER" } }));
    await expect(analyze({ text: "x" })).rejects.toMatchObject({ code: "AI_ERROR" });
    fetchMock.mockResolvedValueOnce(res(200, { result: { title: "x" } }));
    await expect(analyze({ text: "x" })).rejects.toMatchObject({ code: "AI_ERROR" });
  });

  it("distinguishes network failure from cancellation", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(analyze({ text: "x" })).rejects.toMatchObject({ code: "NETWORK" });
    fetchMock.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    await expect(analyze({ text: "x" })).rejects.toMatchObject({ code: "ABORTED" });
  });

  it("has a message for every code shown to the user", () => {
    for (const k of ["INVALID_INPUT", "NOT_FOOD", "RATE_LIMITED", "AI_ERROR", "TIMEOUT", "NETWORK"] as const)
      expect(ERROR_MESSAGE[k].length).toBeGreaterThan(0);
    expect(ERROR_MESSAGE.NETWORK).toBe("Không có kết nối mạng.");
  });
});
