"use client";

import { addDays, addMonths, isFuture, monthGrid, parseDateKey, weekOf, type DateKey } from "@/lib/dates";
import type { DayStatus } from "@/lib/day-status";
import { WEEKDAY_SHORT, formatInt, formatMonth } from "@/lib/format";
import { DayCircle } from "./DayCircle";

type Props = {
  selected: DateKey;
  today: DateKey;
  view: "week" | "month";
  statuses: Map<DateKey, DayStatus>;
  onSelect(k: DateKey): void;
  onToggleView(): void;
};

const EMPTY: DayStatus = { kind: "empty", fill: 0, consumed: 0, target: 0, delta: 0 };

const NAV_CLASS = "inline-flex size-11 items-center justify-center rounded-full active:bg-line/60 disabled:opacity-30";

function Chevron({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function dayLabel(k: DateKey, status: DayStatus): string {
  const d = parseDateKey(k)!;
  const day = `${d.getDate()} tháng ${d.getMonth() + 1}`;
  if (status.kind === "empty") return `${day}: chưa ghi`;
  return `${day}: ${formatInt(status.consumed)} trên ${formatInt(status.target)} kcal`;
}

export function Calendar({ selected, today, view, statuses, onSelect, onToggleView }: Props) {
  const cells: (DateKey | null)[] = view === "week" ? weekOf(selected) : monthGrid(selected);
  const step = (dir: 1 | -1) => (view === "week" ? addDays(selected, 7 * dir) : addMonths(selected, dir));
  const showsToday = view === "week" ? cells.includes(today) : selected.slice(0, 7) === today.slice(0, 7);

  const goNext = () => {
    const next = step(1);
    onSelect(isFuture(next, today) ? today : next);
  };

  return (
    <section aria-label="Lịch">
      <div className="flex items-center">
        <button type="button" aria-label={view === "week" ? "Tuần trước" : "Tháng trước"} className={NAV_CLASS} onClick={() => onSelect(step(-1))}>
          <Chevron d="M15 5l-7 7 7 7" />
        </button>
        <p className="min-w-0 flex-1 text-center text-[15px] font-semibold tabular-nums">{formatMonth(selected)}</p>
        <button type="button" aria-label={view === "week" ? "Tuần sau" : "Tháng sau"} className={NAV_CLASS} disabled={showsToday} onClick={goNext}>
          <Chevron d="M9 5l7 7-7 7" />
        </button>
        <button
          type="button"
          aria-label={view === "week" ? "Xem theo tháng" : "Xem theo tuần"}
          className={NAV_CLASS}
          onClick={onToggleView}
        >
          <Chevron d={view === "week" ? "M5 9l7 7 7-7" : "M5 15l7-7 7 7"} />
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7 text-center text-xs text-muted">
        {WEEKDAY_SHORT.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1">
        {cells.map((k, i) => {
          if (k === null) return <span key={`blank-${i}`} />;
          const status = statuses.get(k) ?? EMPTY;
          const isSelected = k === selected;
          return (
            <button
              key={k}
              type="button"
              disabled={isFuture(k, today)}
              aria-label={dayLabel(k, status)}
              aria-pressed={isSelected}
              onClick={() => onSelect(k)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl py-1 disabled:opacity-40 ${
                isSelected ? "bg-line/70" : "active:bg-line/40"
              }`}
            >
              <DayCircle status={status} />
              <span className={`text-xs tabular-nums ${k === today ? "font-bold text-brand" : "text-ink"}`}>
                {Number(k.slice(8))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
