import { toBlob } from "html-to-image";
import type { DateKey } from "./dates";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export function splitItemsForCard<T>(items: T[], max = 4): { shown: T[]; moreCount: number } {
  return { shown: items.slice(0, max), moreCount: Math.max(0, items.length - max) };
}

export function shareFileName(date: DateKey): string {
  return `mealmeal-${date}.png`;
}

/**
 * Exports the card as a 1080×1350 PNG. Pass the card element itself, not an off-screen wrapper:
 * the clone carries the node's computed position, so a positioned node would render blank.
 */
export async function renderCardToBlob(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  const options = { width: CARD_WIDTH, height: CARD_HEIGHT, pixelRatio: 1, cacheBust: false };
  // The first pass on Safari often leaves images out; the second pass has them decoded.
  await toBlob(node, options);
  const blob = await toBlob(node, options);
  if (!blob) throw new Error("Card export returned no image");
  return blob;
}

export function canShareFile(file: File): boolean {
  return typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] }) === true;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Lines `text` takes when wrapped at spaces into `maxWidth`; a word wider than a line breaks by character. */
function countLines(text: string, maxWidth: number, measure: (s: string) => number): number {
  let lines = 1;
  let current = "";
  for (const word of text.split(" ").filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines++;
    current = word;
    while (measure(current) > maxWidth) {
      let k = 1;
      while (k < current.length && measure(current.slice(0, k + 1)) <= maxWidth) k++;
      lines++;
      current = current.slice(k);
    }
  }
  return lines;
}

/**
 * `text` cut to at most `maxLines` lines of `maxWidth`, ending in "…" when cut. Used instead of CSS
 * line-clamp for the share card, whose ellipsis is lost when html-to-image copies the node.
 */
export function fitText(text: string, maxLines: number, maxWidth: number, measure: (s: string) => number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (countLines(t, maxWidth, measure) <= maxLines) return t;
  const cut = (n: number) => `${t.slice(0, n).trimEnd()}…`;
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (countLines(cut(mid), maxWidth, measure) <= maxLines) lo = mid;
    else hi = mid - 1;
  }
  return cut(lo);
}
