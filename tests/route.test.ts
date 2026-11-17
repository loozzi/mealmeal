import { APIConnectionTimeoutError } from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  check: vi.fn(),
  getAiConfig: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("@/lib/server/ai-config", () => ({ getAiConfig: mocks.getAiConfig }));
vi.mock("@/lib/server/rate-limit", () => ({ getRateLimiter: () => ({ check: mocks.check }) }));
vi.mock("@/lib/server/auth", () => ({ verifyIdToken: mocks.verify }));

import { POST } from "@/app/api/analyze/route";
import { AnalyzeError } from "@/lib/server/analyze";

const good = {
  is_food: true,
  title: "Cơm gà",
  confidence: "medium",
  notes: "",
  items: [{ name: "Cơm", grams: 200, kcal: 260, carbs_g: 57, protein_g: 5, fat_g: 0.5, fiber_g: 0.6 }],
};
const reply = (content: string | null) => ({ choices: [{ message: { content } }] });
const post = (body: string, headers: Record<string, string> = { authorization: "Bearer good" }) =>
  POST(new Request("http://x/api/analyze", { method: "POST", headers, body }));
const validBody = JSON.stringify({ text: "cơm gà" });

async function expectError(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  const json = await res.json();
  expect(json.error.code).toBe(code);
  expect(typeof json.error.message).toBe("string");
  expect(json.error.message.length).toBeGreaterThan(0);
  expect(json.error.message).toMatch(/[àáạảãăâđèéêìíòóôơùúưỳý]/i);
}

beforeEach(() => {
  mocks.create.mockReset().mockResolvedValue(reply(JSON.stringify(good)));
  mocks.check.mockReset().mockResolvedValue({ ok: true });
  mocks.getAiConfig.mockReset().mockReturnValue({
    client: { chat: { completions: { create: mocks.create } } },
    model: "m",
    jsonMode: "json_schema",
  });
  mocks.verify.mockReset().mockImplementation(async (token: string) => {
    if (token === "good") return { uid: "u1" };
    throw new AnalyzeError("UNAUTHENTICATED");
  });
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("POST /api/analyze", () => {
  it("returns the result for a valid body", async () => {
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.title).toBe("Cơm gà");
    expect("is_food" in json.result).toBe(false);
  });

  it("rejects an empty object", async () => {
    await expectError(await post("{}"), 400, "INVALID_INPUT");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects non-JSON", async () => {
    await expectError(await post("không phải json"), 400, "INVALID_INPUT");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an oversized body", async () => {
    const body = JSON.stringify({ text: "x", image: "data:image/jpeg;base64," + "A".repeat(4_200_001) });
    await expectError(await post(body), 400, "INVALID_INPUT");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mocks.check.mockResolvedValue({ ok: false });
    await expectError(await post(validBody), 429, "RATE_LIMITED");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("401 without Authorization", async () => {
    const res = await post(validBody, {});
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
    expect(json.error.message).toBe("Phiên đăng nhập đã hết. Hãy đăng nhập lại.");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it("401 with a bad token", async () => {
    await expectError(await post(validBody, { authorization: "Bearer bad" }), 401, "UNAUTHENTICATED");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it("401 with a non-Bearer header", async () => {
    await expectError(await post(validBody, { authorization: "Basic good" }), 401, "UNAUTHENTICATED");
  });

  it("checks the token before reading an oversized body", async () => {
    const body = JSON.stringify({ text: "x", image: "data:image/jpeg;base64," + "A".repeat(4_200_001) });
    await expectError(await post(body, {}), 401, "UNAUTHENTICATED");
  });

  it("rate limit keyed by uid", async () => {
    await post(validBody, { authorization: "Bearer good", "x-forwarded-for": "1.2.3.4" });
    expect(mocks.verify).toHaveBeenCalledWith("good");
    expect(mocks.check).toHaveBeenCalledWith("uid:u1");
  });

  it("returns 422 when the model sees no food", async () => {
    mocks.create.mockResolvedValue(reply(JSON.stringify({ ...good, is_food: false, items: [] })));
    await expectError(await post(validBody), 422, "NOT_FOOD");
  });

  it("returns 502 when the model returns garbage twice", async () => {
    mocks.create.mockResolvedValue(reply("rác"));
    await expectError(await post(validBody), 502, "AI_ERROR");
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });

  it("returns 504 on timeout", async () => {
    mocks.create.mockRejectedValue(new APIConnectionTimeoutError());
    await expectError(await post(validBody), 504, "TIMEOUT");
  });

  it("returns 502 when configuration is missing", async () => {
    mocks.getAiConfig.mockImplementation(() => {
      throw new AnalyzeError("AI_ERROR");
    });
    await expectError(await post(validBody), 502, "AI_ERROR");
  });

  it("returns 502 on unexpected errors", async () => {
    mocks.getAiConfig.mockImplementation(() => {
      throw new Error("boom");
    });
    await expectError(await post(validBody), 502, "AI_ERROR");
  });

  it("logs only the outcome code and duration", async () => {
    await post(validBody);
    const line = (console.info as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().join(" ");
    expect(line).toMatch(/OK/);
    expect(line).not.toContain("cơm gà");
    expect(line).not.toContain("u1");
  });
});
