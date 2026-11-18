import type { AdminStats } from "@/lib/admin-types";
import { formatInt, formatUsd } from "@/lib/format";

type Day = AdminStats["days"][number];

/** One row per day; the bar is cost, or total tokens when no price is set. */
export function DaysList({ days, hasPrice }: { days: Day[]; hasPrice: boolean }) {
  const measure = (d: Day) => (hasPrice ? (d.costUsd ?? 0) : d.inputTokens + d.outputTokens);
  const max = Math.max(0, ...days.map(measure));
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-base font-semibold">Theo ngày</h2>
      <ul className="flex flex-col gap-1">
        {days.map((d) => (
          <li key={d.date} className="grid grid-cols-[3rem_1fr] items-center gap-2 text-xs tabular-nums">
            <span className="text-muted">{`${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`}</span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="h-2 rounded-full bg-line/60">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${max > 0 ? (measure(d) / max) * 100 : 0}%` }} />
              </div>
              <span>
                {hasPrice ? formatUsd(d.costUsd ?? 0) : `${formatInt(d.inputTokens + d.outputTokens)} token`} · {formatInt(d.requests)} lượt ·{" "}
                {formatInt(d.activeUsers)} người
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
