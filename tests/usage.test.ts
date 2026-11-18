import { describe, expect, it } from "vitest";
import { newTally, outcomeFor, usageIncrements } from "@/lib/server/usage";

describe("outcomeFor", () => {
  it("maps every result code to its usage outcome", () => {
    expect(outcomeFor("OK")).toBe("ok");
    expect(outcomeFor("NOT_FOOD")).toBe("notFood");
    expect(outcomeFor("AI_ERROR")).toBe("failed");
    expect(outcomeFor("TIMEOUT")).toBe("failed");
    expect(outcomeFor("RATE_LIMITED")).toBe("rateLimited");
    expect(outcomeFor("INVALID_INPUT")).toBe("invalid");
    expect(outcomeFor("UNAUTHENTICATED")).toBeNull();
  });
});

describe("usageIncrements", () => {
  it("sets the outcome field and adds the tally", () => {
    expect(usageIncrements("notFood", { aiCalls: 1, inputTokens: 30, outputTokens: 3, missingUsage: 0 })).toEqual({
      requests: 1, ok: 0, notFood: 1, failed: 0, rateLimited: 0, aiCalls: 1, inputTokens: 30, outputTokens: 3, missingUsage: 0,
    });
  });
  it("counts only the request for invalid input", () => {
    expect(usageIncrements("invalid", newTally())).toEqual({
      requests: 1, ok: 0, notFood: 0, failed: 0, rateLimited: 0, aiCalls: 0, inputTokens: 0, outputTokens: 0, missingUsage: 0,
    });
  });
});
