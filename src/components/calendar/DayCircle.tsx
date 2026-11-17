import type { DayStatus } from "@/lib/day-status";
import { piePath } from "./geometry";

/** Small day marker for the calendar. Decorative: the day button around it carries the label. */
export function DayCircle({ status, size = 32 }: { status: DayStatus; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32">
      {status.kind === "progress" && status.fill < 1 && <path d={piePath(status.fill, 16, 16, 14)} className="fill-brand" />}
      {(status.kind === "hit" || (status.kind === "progress" && status.fill >= 1)) && (
        <circle cx="16" cy="16" r="14" className="fill-brand" />
      )}
      {status.kind === "over" && <circle cx="16" cy="16" r="14" className="fill-warn" />}
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="none"
        strokeWidth="1.5"
        className={status.kind === "hit" ? "stroke-brand" : status.kind === "over" ? "stroke-warn" : "stroke-line"}
      />
    </svg>
  );
}
