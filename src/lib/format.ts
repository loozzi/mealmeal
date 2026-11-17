import { parseDateKey, type DateKey } from "./dates";

// Strings are assembled by hand (no Intl) so output does not depend on the runtime's locale data.

export function formatInt(n: number): string {
  const rounded = Math.round(n);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return rounded < 0 ? `-${digits}` : digits;
}

export function formatGrams(n: number): string {
  if (n < 10) {
    const oneDecimal = Math.round(n * 10) / 10;
    if (oneDecimal < 10) return String(oneDecimal).replace(".", ",");
  }
  return formatInt(n);
}

export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

function parts(k: DateKey): Date {
  const d = parseDateKey(k);
  if (!d) throw new Error(`Invalid DateKey: ${k}`);
  return d;
}

export function formatDate(k: DateKey): string {
  const d = parts(k);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const WEEKDAY_LONG = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export function formatDayLong(k: DateKey): string {
  const d = parts(k);
  return `${WEEKDAY_LONG[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatMonth(k: DateKey): string {
  const d = parts(k);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Column headers for a Monday-first week. */
export const WEEKDAY_SHORT: readonly string[] = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
