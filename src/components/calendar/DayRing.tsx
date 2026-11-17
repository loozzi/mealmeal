import type { ReactNode } from "react";
import type { DayStatus } from "@/lib/day-status";
import { arcPath } from "./geometry";

const STROKE = 12;

/** Large progress ring for the selected day, with `children` centred inside. */
export function DayRing({ status, size = 160, children }: { status: DayStatus; size?: number; children?: ReactNode }) {
  const c = size / 2;
  const r = (size - STROKE) / 2;
  const color = status.kind === "over" ? "stroke-warn" : "stroke-brand";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={STROKE} className="stroke-line" />
        {status.kind !== "empty" &&
          (status.fill < 1 ? (
            <path d={arcPath(status.fill, c, c, r)} fill="none" strokeWidth={STROKE} strokeLinecap="round" className={color} />
          ) : (
            <circle cx={c} cy={c} r={r} fill="none" strokeWidth={STROKE} className={color} />
          ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
