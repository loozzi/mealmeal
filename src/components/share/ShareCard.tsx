import type { CSSProperties, Ref } from "react";
import { formatDate, formatGrams, formatInt } from "@/lib/format";
import { macroCalorieShares, mealNutrients } from "@/lib/nutrition";
import { CARD_HEIGHT, CARD_WIDTH, fitText, splitItemsForCard } from "@/lib/share";
import type { Meal } from "@/lib/types";

// Fixed pixel sizes throughout: the card is exported at exactly 1080×1350 whatever the screen.

const PHOTO_HEIGHT = 700;
const PAD = 64;
const TITLE_WIDTH = CARD_WIDTH - 2 * PAD;
const TITLE = { photo: { size: 56, lines: 2 }, plain: { size: 96, lines: 3 } } as const;

/** The title cut to the lines the card has room for. Call in the browser, after fonts have loaded. */
export function fitCardTitle(title: string, hasPhoto: boolean): string {
  const spec = hasPhoto ? TITLE.photo : TITLE.plain;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return title;
  ctx.font = `700 ${spec.size}px ${getComputedStyle(document.body).fontFamily}`;
  // A little slack so rounding differences between canvas and layout never wrap an extra line.
  return fitText(title, spec.lines, TITLE_WIDTH - 12, (s) => ctx.measureText(s).width);
}

const MACROS = [
  { key: "carbs", label: "Carb", color: "var(--color-warn)" },
  { key: "protein", label: "Protein", color: "var(--color-brand)" },
  { key: "fat", label: "Fat", color: "var(--color-ink)" },
] as const;

const clampLines = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  overflowWrap: "anywhere",
});

const oneLine: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function Stats({ meal }: { meal: Meal }) {
  const total = mealNutrients(meal);
  const shares = macroCalorieShares(total);
  const { shown, moreCount } = splitItemsForCard(meal.items);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20, lineHeight: 1 }}>
        <span style={{ fontSize: 160, fontWeight: 700, letterSpacing: -4 }} className="tabular-nums">
          {formatInt(total.kcal)}
        </span>
        <span style={{ fontSize: 48, fontWeight: 600, color: "var(--color-muted)" }}>kcal</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
        {MACROS.map((m) => (
          <div key={m.key} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 28, fontWeight: 500, color: "var(--color-muted)" }}>{m.label}</span>
              <span style={{ fontSize: 26, color: "var(--color-muted)" }} className="tabular-nums">
                {formatInt(shares[m.key] * 100)}%
              </span>
            </div>
            <span style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }} className="tabular-nums">
              {formatGrams(total[m.key])}g
            </span>
            <div style={{ height: 12, borderRadius: 6, background: "var(--color-line)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${shares[m.key] * 100}%`, borderRadius: 6, background: m.color }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 40, rowGap: 10 }}>
        {shown.map((item) => (
          <span key={item.id} style={{ display: "flex", fontSize: 32, lineHeight: 1.3, minWidth: 0 }}>
            <span style={{ ...oneLine, minWidth: 0 }}>{item.name}</span>
            <span style={{ flexShrink: 0, whiteSpace: "pre", color: "var(--color-muted)" }} className="tabular-nums">
              {" · "}
              {formatGrams(item.grams)}g
            </span>
          </span>
        ))}
        {moreCount > 0 && (
          <span style={{ fontSize: 32, lineHeight: 1.3, color: "var(--color-muted)" }}>+{moreCount} món khác</span>
        )}
      </div>
    </div>
  );
}

function Signature({ color }: { color: string }) {
  return (
    <span style={{ position: "absolute", right: PAD, bottom: 52, fontSize: 32, fontWeight: 700, color, letterSpacing: -0.5 }}>
      MealMeal
    </span>
  );
}

type Props = { meal: Meal; photoDataUrl: string | null; ref?: Ref<HTMLDivElement> };

export function ShareCard({ meal, photoDataUrl, ref }: Props) {
  const root: CSSProperties = {
    position: "relative",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    overflow: "hidden",
    fontFamily: "var(--font-sans)",
    color: "var(--color-ink)",
    background: "var(--color-bg)",
  };

  if (photoDataUrl) {
    return (
      <div ref={ref} style={root}>
        <div style={{ position: "relative", width: CARD_WIDTH, height: PHOTO_HEIGHT }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, must be a plain img for export */}
          <img
            src={photoDataUrl}
            alt=""
            width={CARD_WIDTH}
            height={PHOTO_HEIGHT}
            style={{ display: "block", width: CARD_WIDTH, height: PHOTO_HEIGHT, objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)",
            }}
          />
          <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 48, color: "#fff" }}>
            <div style={{ fontSize: 32, fontWeight: 500, opacity: 0.85, marginBottom: 8 }} className="tabular-nums">
              {formatDate(meal.date)}
            </div>
            <div style={{ fontSize: TITLE.photo.size, fontWeight: 700, lineHeight: 1.15, ...clampLines(TITLE.photo.lines) }}>{meal.title}</div>
          </div>
        </div>
        <div style={{ padding: `56px ${PAD}px 0` }}>
          <Stats meal={meal} />
        </div>
        <Signature color="var(--color-brand)" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{
        ...root,
        background: "linear-gradient(135deg, var(--color-brand), var(--color-warn))",
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        paddingBottom: 128,
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", color: "#fff", minHeight: 0 }}>
        <div style={{ fontSize: 32, fontWeight: 500, opacity: 0.9, marginBottom: 16 }} className="tabular-nums">
          {formatDate(meal.date)}
        </div>
        <div style={{ fontSize: TITLE.plain.size, fontWeight: 700, lineHeight: 1.1, ...clampLines(TITLE.plain.lines) }}>{meal.title}</div>
      </div>
      <div style={{ background: "var(--color-card)", borderRadius: 48, padding: 56, marginTop: 48 }}>
        <Stats meal={meal} />
      </div>
      <Signature color="#fff" />
    </div>
  );
}
