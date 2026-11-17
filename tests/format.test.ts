import { expect, test } from "vitest";
import {
  WEEKDAY_SHORT, formatDate, formatDayLong, formatGrams, formatInt, formatMonth, parseDecimal,
} from "@/lib/format";

test("formatInt", () => {
  expect(formatInt(1450)).toBe("1.450");
  expect(formatInt(999.6)).toBe("1.000");
  expect(formatInt(0)).toBe("0");
  expect(formatInt(1234567)).toBe("1.234.567");
});

test("formatGrams", () => {
  expect(formatGrams(0.5)).toBe("0,5");
  expect(formatGrams(5)).toBe("5");
  expect(formatGrams(9.96)).toBe("10");
  expect(formatGrams(57.4)).toBe("57");
});

test("parseDecimal accepts comma or dot", () => {
  expect(parseDecimal("70,5")).toBe(70.5);
  expect(parseDecimal(" 70.5 ")).toBe(70.5);
  expect(parseDecimal("")).toBeNull();
  expect(parseDecimal("abc")).toBeNull();
  expect(parseDecimal("12abc")).toBeNull();
});

test("date formatting", () => {
  expect(formatDate("2026-11-17")).toBe("17/11/2026");
  expect(formatDayLong("2026-11-17")).toBe("Thứ Ba, 17/11");
  expect(formatDayLong("2026-11-22")).toBe("Chủ Nhật, 22/11");
  expect(formatMonth("2026-11-17")).toBe("Tháng 11/2026");
  expect(WEEKDAY_SHORT).toEqual(["T2", "T3", "T4", "T5", "T6", "T7", "CN"]);
});
