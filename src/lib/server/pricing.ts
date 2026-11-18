import type { StatsPrice } from "@/lib/admin-types";

export type Price = StatsPrice;

const PRICE_PATTERN = /^\d+(\.\d+)?$/;

/** Reads USD prices per million tokens. Both must be plain dot-decimal numbers, otherwise there is no price. */
export function parsePrice(env: { input?: string; output?: string }): Price | null {
  const input = env.input?.trim() ?? "";
  const output = env.output?.trim() ?? "";
  if (!PRICE_PATTERN.test(input) || !PRICE_PATTERN.test(output)) return null;
  return { inputPer1M: Number(input), outputPer1M: Number(output) };
}

export function costUsd(c: { inputTokens: number; outputTokens: number }, price: Price | null): number | null {
  if (!price) return null;
  return (c.inputTokens / 1e6) * price.inputPer1M + (c.outputTokens / 1e6) * price.outputPer1M;
}
