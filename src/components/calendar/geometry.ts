// `+ 0` turns -0 into 0 so it never prints as "-0".
const round3 = (n: number) => Math.round(n * 1000) / 1000 + 0;

/** Point on the circle at `fraction` of a full turn, measured clockwise from 12 o'clock. */
function endPoint(fraction: number, cx: number, cy: number, r: number): string {
  const angle = fraction * 2 * Math.PI;
  return `${round3(cx + r * Math.sin(angle))} ${round3(cy - r * Math.cos(angle))}`;
}

const arc = (fraction: number, cx: number, cy: number, r: number) =>
  `A ${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${endPoint(fraction, cx, cy, r)}`;

/** Pie slice from 12 o'clock, clockwise. Valid for 0 < fraction < 1; draw a full circle otherwise. */
export function piePath(fraction: number, cx: number, cy: number, r: number): string {
  return `M ${cx} ${cy} L ${cx} ${cy - r} ${arc(fraction, cx, cy, r)} Z`;
}

/** Open arc with the same start and direction as `piePath`. Valid for 0 < fraction < 1. */
export function arcPath(fraction: number, cx: number, cy: number, r: number): string {
  return `M ${cx} ${cy - r} ${arc(fraction, cx, cy, r)}`;
}
