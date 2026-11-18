import { APIConnectionTimeoutError } from "openai";
import { describe, expect, it, vi, type Mock } from "vitest";
import { analyzeMeal, ERROR_STATUS, extractJson } from "@/lib/server/analyze";

const good = {
  is_food: true,
  title: "Cơm gà",
  confidence: "medium",
  notes: "",
  items: [{ name: "Cơm", grams: 200, kcal: 260, carbs_g: 57, protein_g: 5, fat_g: 0.5, fiber_g: 0.6 }],
};
const reply = (content: string | null) => ({ choices: [{ message: { content } }] });
const cfg = (create: Mock, jsonMode: "json_schema" | "json_object" = "json_schema") => ({
  client: { chat: { completions: { create } } },
  model: "m",
  jsonMode,
});

describe("extractJson", () => {
  it("parses plain and fenced JSON", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson(' {"a":1} ')).toEqual({ a: 1 });
  });
  it("throws on non-JSON", () => {
    expect(() => extractJson("xin lỗi")).toThrow();
  });
});

describe("ERROR_STATUS", () => {
  it("maps codes to HTTP statuses", () => {
    expect(ERROR_STATUS).toEqual({ INVALID_INPUT: 400, NOT_FOOD: 422, RATE_LIMITED: 429, AI_ERROR: 502, TIMEOUT: 504, UNAUTHENTICATED: 401 });
  });
});

describe("analyzeMeal", () => {
  it("returns the analysis without is_food and sends the right arguments", async () => {
    const create = vi.fn().mockResolvedValue(reply(JSON.stringify(good)));
    const r = await analyzeMeal({ text: "cơm gà" }, cfg(create));
    expect(r.title).toBe("Cơm gà");
    expect(r.items).toHaveLength(1);
    expect("is_food" in r).toBe(false);
    const args = create.mock.calls[0][0];
    expect(args.model).toBe("m");
    expect(args.response_format.type).toBe("json_schema");
    expect(args.response_format.json_schema.name).toBe("meal_analysis");
    expect(args.response_format.json_schema.strict).toBe(true);
    expect("temperature" in args).toBe(false);
    expect(args.messages[0].role).toBe("system");
    expect(args.messages[0].content).toContain("chuyên gia dinh dưỡng");
    expect(args.messages[1].content).toEqual([{ type: "text", text: "cơm gà" }]);
  });

  it("uses the default text and attaches the image; json_object mode describes the schema in the prompt", async () => {
    const create = vi.fn().mockResolvedValue(reply(JSON.stringify(good)));
    await analyzeMeal({ image: "data:image/jpeg;base64,AAAA" }, cfg(create, "json_object"));
    const a2 = create.mock.calls[0][0];
    expect(a2.response_format).toEqual({ type: "json_object" });
    expect(a2.messages[0].content).toContain("is_food");
    expect(a2.messages[1].content).toEqual([
      { type: "text", text: "Hãy phân tích bữa ăn trong ảnh." },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } },
    ]);
  });

  it("accepts fenced JSON", async () => {
    const create = vi.fn().mockResolvedValue(reply("```json\n" + JSON.stringify(good) + "\n```"));
    await expect(analyzeMeal({ text: "x" }, cfg(create))).resolves.toBeTruthy();
  });

  it("retries once on bad output", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(reply("không phải json"))
      .mockResolvedValueOnce(reply(JSON.stringify(good)));
    await expect(analyzeMeal({ text: "x" }, cfg(create))).resolves.toBeTruthy();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("fails with AI_ERROR after two bad outputs", async () => {
    const create = vi.fn().mockResolvedValue(reply(null));
    await expect(analyzeMeal({ text: "x" }, cfg(create))).rejects.toMatchObject({ code: "AI_ERROR" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("retries on schema-invalid output", async () => {
    const bad = { ...good, items: [{ ...good.items[0], kcal: -5 }] };
    const create = vi.fn().mockResolvedValue(reply(JSON.stringify(bad)));
    await expect(analyzeMeal({ text: "x" }, cfg(create))).rejects.toMatchObject({ code: "AI_ERROR" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("reports NOT_FOOD without retrying", async () => {
    let create = vi.fn().mockResolvedValue(reply(JSON.stringify({ ...good, is_food: false, items: [] })));
    await expect(analyzeMeal({ text: "x" }, cfg(create))).rejects.toMatchObject({ code: "NOT_FOOD" });
    expect(create).toHaveBeenCalledTimes(1);
    create = vi.fn().mockResolvedValue(reply(JSON.stringify({ ...good, items: [] })));
    await expect(analyzeMeal({ text: "x" }, cfg(create))).rejects.toMatchObject({ code: "NOT_FOOD" });
  });

  it("maps SDK errors", async () => {
    let create = vi.fn().mockRejectedValue(new APIConnectionTimeoutError());
    await expect(analyzeMeal({ text: "x" }, cfg(create))).rejects.toMatchObject({ code: "TIMEOUT" });
    create = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(analyzeMeal({ text: "x" }, cfg(create))).rejects.toMatchObject({ code: "AI_ERROR" });
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("analyzeMeal token tally", () => {
  const withUsage = (content: string | null, usage: unknown) => ({ ...reply(content), usage });
  const fresh = () => ({ aiCalls: 0, inputTokens: 0, outputTokens: 0, missingUsage: 0 });

  it("counts one call and its tokens on success", async () => {
    const tally = fresh();
    const create = vi.fn().mockResolvedValue(withUsage(JSON.stringify(good), { prompt_tokens: 100, completion_tokens: 20 }));
    await analyzeMeal({ text: "cơm gà" }, cfg(create), tally);
    expect(tally).toEqual({ aiCalls: 1, inputTokens: 100, outputTokens: 20, missingUsage: 0 });
  });

  it("counts both calls when the first output is unusable", async () => {
    const tally = fresh();
    const create = vi
      .fn()
      .mockResolvedValueOnce(withUsage("rác", { prompt_tokens: 50, completion_tokens: 5 }))
      .mockResolvedValueOnce(withUsage(JSON.stringify(good), { prompt_tokens: 100, completion_tokens: 20 }));
    await analyzeMeal({ text: "cơm gà" }, cfg(create), tally);
    expect(tally).toEqual({ aiCalls: 2, inputTokens: 150, outputTokens: 25, missingUsage: 0 });
  });

  it("still counts tokens when the answer is NOT_FOOD", async () => {
    const tally = fresh();
    const notFood = { ...good, is_food: false, items: [] };
    const create = vi.fn().mockResolvedValue(withUsage(JSON.stringify(notFood), { prompt_tokens: 30, completion_tokens: 3 }));
    await expect(analyzeMeal({ text: "cái ghế" }, cfg(create), tally)).rejects.toMatchObject({ code: "NOT_FOOD" });
    expect(tally).toEqual({ aiCalls: 1, inputTokens: 30, outputTokens: 3, missingUsage: 0 });
  });

  it("does not count calls that threw", async () => {
    const tally = fresh();
    const create = vi.fn().mockRejectedValue(new Error("network"));
    await expect(analyzeMeal({ text: "cơm gà" }, cfg(create), tally)).rejects.toMatchObject({ code: "AI_ERROR" });
    expect(tally.aiCalls).toBe(0);
  });

  it("marks a response without usage as missing", async () => {
    const tally = fresh();
    const create = vi.fn().mockResolvedValue(reply(JSON.stringify(good)));
    await analyzeMeal({ text: "cơm gà" }, cfg(create), tally);
    expect(tally).toEqual({ aiCalls: 1, inputTokens: 0, outputTokens: 0, missingUsage: 1 });
  });

  it("treats non-numeric usage as missing", async () => {
    const tally = fresh();
    const create = vi.fn().mockResolvedValue(withUsage(JSON.stringify(good), { prompt_tokens: "x", completion_tokens: 20 }));
    await analyzeMeal({ text: "cơm gà" }, cfg(create), tally);
    expect(tally).toEqual({ aiCalls: 1, inputTokens: 0, outputTokens: 0, missingUsage: 1 });
  });
});
