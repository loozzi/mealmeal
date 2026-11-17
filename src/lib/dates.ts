/** Local calendar day, "YYYY-MM-DD". Always built from local date parts, never from toISOString(). */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of the given key, or null when malformed or not a real calendar day. */
export function parseDateKey(k: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

function mustParse(k: DateKey): Date {
  const d = parseDateKey(k);
  if (!d) throw new Error(`Invalid DateKey: ${k}`);
  return d;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function addDays(k: DateKey, n: number): DateKey {
  const d = mustParse(k);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Keeps the day of month, clamped to the last day of a shorter target month. */
export function addMonths(k: DateKey, n: number): DateKey {
  const d = mustParse(k);
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return toDateKey(new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), lastDay)));
}

/** 0 = Monday … 6 = Sunday. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function weekOf(k: DateKey): DateKey[] {
  const monday = addDays(k, -mondayIndex(mustParse(k)));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function monthGrid(k: DateKey): (DateKey | null)[] {
  const d = mustParse(k);
  const y = d.getFullYear();
  const mo = d.getMonth();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const cells: (DateKey | null)[] = Array(mondayIndex(new Date(y, mo, 1))).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toDateKey(new Date(y, mo, day)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function isFuture(k: DateKey, today: DateKey): boolean {
  return k > today;
}

/** Sanitises a `?d=` URL parameter: invalid or future values fall back to today. */
export function resolveDateParam(raw: string | null | undefined, today: DateKey): DateKey {
  if (!raw || !parseDateKey(raw) || isFuture(raw, today)) return today;
  return raw;
}

export function nowTime(now: Date = new Date()): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
