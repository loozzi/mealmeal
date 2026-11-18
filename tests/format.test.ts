import { expect, test } from "vitest";
import {
  WEEKDAY_SHORT, formatDate, formatDateTime, formatUsd, formatUsdRate, formatDayLong, formatGrams, formatInt, formatMonth, parseDecimal,
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

test("formatUsd uses 4 decimals under $1 and 2 otherwise", () => {
  expect(formatUsd(0.01234)).toBe("$0,0123");
  expect(formatUsd(0)).toBe("$0,0000");
  expect(formatUsd(0.3)).toBe("$0,3000");
  expect(formatUsd(1234.5)).toBe("$1.234,50");
  expect(formatUsd(1)).toBe("$1,00");
});

test("formatDateTime shows dd/MM HH:mm in local time", () => {
  expect(formatDateTime(new Date(2026, 10, 17, 20, 31).toISOString())).toBe("17/11 20:31");
});

test("formatUsdRate keeps at least 2 decimals and drops trailing zeros", () => {
  expect(formatUsdRate(0.1)).toBe("$0,10");
  expect(formatUsdRate(0.4)).toBe("$0,40");
  expect(formatUsdRate(0.075)).toBe("$0,075");
  expect(formatUsdRate(2.5)).toBe("$2,50");
});
