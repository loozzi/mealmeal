import { describe, expect, it } from "vitest";
import { CARD_HEIGHT, CARD_WIDTH, fitText, shareFileName, splitItemsForCard } from "@/lib/share";

describe("share", () => {
  it("splits items for the card", () => {
    expect(splitItemsForCard([1, 2, 3])).toEqual({ shown: [1, 2, 3], moreCount: 0 });
    expect(splitItemsForCard([1, 2, 3, 4])).toEqual({ shown: [1, 2, 3, 4], moreCount: 0 });
    expect(splitItemsForCard([1, 2, 3, 4, 5, 6])).toEqual({ shown: [1, 2, 3, 4], moreCount: 2 });
  });

  it("names the file and fixes the card size", () => {
    expect(shareFileName("2026-11-17")).toBe("mealmeal-2026-11-17.png");
    expect(CARD_WIDTH).toBe(1080);
    expect(CARD_HEIGHT).toBe(1350);
  });

  describe("fitText", () => {
    // One unit per character, so a line of width 10 holds 10 characters.
    const measure = (s: string) => s.length;

    it("returns text that already fits, trimmed", () => {
      expect(fitText("  Cơm gà  ", 2, 10, measure)).toBe("Cơm gà");
      expect(fitText("aaaa bbbb cccc", 2, 10, measure)).toBe("aaaa bbbb cccc");
    });

    it("cuts text that needs more lines and ends it with an ellipsis that fits", () => {
      const out = fitText("aaaa bbbb cccc dddd eeee", 2, 10, measure);
      expect(out).toBe("aaaa bbbb cccc dddd…");
      expect(out.endsWith("…")).toBe(true);
    });

    it("breaks a word longer than a line by characters", () => {
      expect(fitText("abcdefghijklmnopqrstuvwxyz", 2, 10, measure)).toBe("abcdefghijklmnopqrs…");
    });

    it("handles a single line limit", () => {
      expect(fitText("Phở bò tái nạm gầu", 1, 10, measure)).toBe("Phở bò tá…");
    });
  });
});
