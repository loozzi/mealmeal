import { describe, expect, it } from "vitest";
import { rangeDates, vnDateKey } from "@/lib/server/vn-date";

describe("vnDateKey", () => {
  it("switches day at 17:00 UTC", () => {
    expect(vnDateKey(new Date("2026-11-17T16:59:59Z"))).toBe("2026-11-17");
    expect(vnDateKey(new Date("2026-11-17T17:00:00Z"))).toBe("2026-11-18");
  });
  it("rolls over the year", () => {
    expect(vnDateKey(new Date("2026-12-31T17:00:00Z"))).toBe("2027-01-01");
  });
});

describe("rangeDates", () => {
  const now = new Date("2026-11-18T03:00:00Z");
  it("covers today, 7 and 30 days ending today", () => {
    expect(rangeDates("today", now)).toEqual({ from: "2026-11-18", to: "2026-11-18" });
    expect(rangeDates("7d", now)).toEqual({ from: "2026-11-12", to: "2026-11-18" });
    expect(rangeDates("30d", now)).toEqual({ from: "2026-10-20", to: "2026-11-18" });
  });
});
