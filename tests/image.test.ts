import { describe, expect, it } from "vitest";
import { fitWithin } from "@/lib/image";

describe("fitWithin", () => {
  it("scales the long edge down to max, keeping the ratio", () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 });
  });
  it("never upscales", () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
  it("handles extreme ratios without reaching zero", () => {
    expect(fitWithin(8000, 100, 1024)).toEqual({ width: 1024, height: 13 });
    expect(fitWithin(10000, 1, 1024).height).toBe(1);
  });
});
