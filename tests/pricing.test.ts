import { describe, expect, it } from "vitest";
import { costUsd, parsePrice } from "@/lib/server/pricing";

describe("parsePrice", () => {
  it("reads dot-decimal prices", () => {
    expect(parsePrice({ input: "0.10", output: "0.40" })).toEqual({ inputPer1M: 0.1, outputPer1M: 0.4 });
  });
  it("returns null for bad or missing values", () => {
    for (const bad of ["", "abc", "-1", "1,5"]) {
      expect(parsePrice({ input: bad, output: "0.4" })).toBeNull();
      expect(parsePrice({ input: "0.1", output: bad })).toBeNull();
    }
    expect(parsePrice({ input: "0.1" })).toBeNull();
    expect(parsePrice({ output: "0.4" })).toBeNull();
  });
});

describe("costUsd", () => {
  it("prices tokens per million", () => {
    expect(costUsd({ inputTokens: 1_000_000, outputTokens: 500_000 }, { inputPer1M: 0.1, outputPer1M: 0.4 })).toBeCloseTo(0.3);
  });
  it("is null without a price", () => {
    expect(costUsd({ inputTokens: 1, outputTokens: 1 }, null)).toBeNull();
  });
});
