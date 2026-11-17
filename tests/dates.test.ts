import { expect, test } from "vitest";
import {
  addDays, addMonths, isFuture, monthGrid, nowTime, parseDateKey,
  resolveDateParam, toDateKey, todayKey, weekOf,
} from "@/lib/dates";

test("toDateKey uses local date parts", () => {
  expect(toDateKey(new Date(2026, 10, 17, 23, 59))).toBe("2026-11-17");
  expect(toDateKey(new Date(2026, 10, 18, 0, 0))).toBe("2026-11-18");
  expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  expect(todayKey(new Date(2026, 10, 17, 0, 1))).toBe("2026-11-17");
});

test("parseDateKey rejects malformed and impossible dates", () => {
  expect(parseDateKey("2026-02-31")).toBeNull();
  expect(parseDateKey("abc")).toBeNull();
  expect(parseDateKey("2026-11-17")?.getDate()).toBe(17);
  expect(parseDateKey("2026-11-17")?.getHours()).toBe(0);
});

test("addDays and addMonths", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
});

test("weekOf starts on Monday", () => {
  expect(weekOf("2026-11-17")).toEqual([
    "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22",
  ]);
  expect(weekOf("2026-11-22")[0]).toBe("2026-11-16");
});

test("monthGrid pads to whole weeks", () => {
  const grid = monthGrid("2026-11-17");
  expect(grid.length % 7).toBe(0);
  expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
  expect(grid.filter(Boolean).length).toBe(30);
});

test("isFuture and resolveDateParam", () => {
  expect(isFuture("2026-11-18", "2026-11-17")).toBe(true);
  expect(isFuture("2026-11-17", "2026-11-17")).toBe(false);
  expect(resolveDateParam("2026-11-10", "2026-11-17")).toBe("2026-11-10");
  expect(resolveDateParam("2026-02-31", "2026-11-17")).toBe("2026-11-17");
  expect(resolveDateParam("abc", "2026-11-17")).toBe("2026-11-17");
  expect(resolveDateParam(null, "2026-11-17")).toBe("2026-11-17");
  expect(resolveDateParam("2026-11-18", "2026-11-17")).toBe("2026-11-17");
});

test("nowTime", () => {
  expect(nowTime(new Date(2026, 10, 17, 7, 5))).toBe("07:05");
});
