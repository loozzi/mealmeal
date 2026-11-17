import { describe, expect, it } from "vitest";
import { arcPath, piePath } from "@/components/calendar/geometry";

describe("piePath", () => {
  it("starts at 12 o'clock and sweeps clockwise", () => {
    expect(piePath(0.75, 16, 16, 14)).toBe("M 16 16 L 16 2 A 14 14 0 1 1 2 16 Z"); // 3/4: ends at 9 o'clock
    expect(piePath(0.25, 16, 16, 14)).toBe("M 16 16 L 16 2 A 14 14 0 0 1 30 16 Z"); // 1/4: ends at 3 o'clock
    expect(piePath(0.5, 16, 16, 14)).toBe("M 16 16 L 16 2 A 14 14 0 0 1 16 30 Z"); // 1/2: ends at 6 o'clock
  });

  it("rounds coordinates to 3 decimals", () => {
    expect(piePath(0.05, 16, 16, 14)).toBe("M 16 16 L 16 2 A 14 14 0 0 1 20.326 2.685 Z");
  });
});

describe("arcPath", () => {
  it("draws the same sweep without closing to the centre", () => {
    expect(arcPath(0.25, 16, 16, 14)).toBe("M 16 2 A 14 14 0 0 1 30 16");
    expect(arcPath(0.75, 80, 80, 74)).toBe("M 80 6 A 74 74 0 1 1 6 80");
  });
});
