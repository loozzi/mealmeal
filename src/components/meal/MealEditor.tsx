"use client";

import { useEffect, useState } from "react";
import { formatGrams, formatInt } from "@/lib/format";
import { GRAMS_MAX, GRAMS_MIN, itemNutrients, mealNutrients } from "@/lib/nutrition";
import { CONFIDENCE_LABEL, type Meal } from "@/lib/types";
import { INPUT_CLASS } from "@/components/ui/Field";

export type MealDraft = Pick<Meal, "title" | "items" | "confidence" | "notes">;

type Props = {
  value: MealDraft;
  onChange(next: MealDraft): void;
  photoUrl?: string;
  onValidityChange?(valid: boolean): void;
};

const TITLE_MAX = 80;

/** A whole number of grams within the allowed range, or null. */
function parseGrams(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text.trim());
  return n >= GRAMS_MIN && n <= GRAMS_MAX ? n : null;
}

export function MealEditor({ value, onChange, photoUrl, onValidityChange }: Props) {
  // What the user is typing, per item id. An item with no entry has not been touched and shows its
  // stored weight; that weight stays as is (it may be fractional when it comes from the AI).
  const [gramsText, setGramsText] = useState<Record<string, string>>({});

  const gramsValid = (id: string) => gramsText[id] === undefined || parseGrams(gramsText[id]) !== null;
  const valid = value.items.length > 0 && value.items.every((i) => gramsValid(i.id)) && value.title.trim() !== "";

  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  const handleGrams = (id: string, text: string) => {
    setGramsText((prev) => ({ ...prev, [id]: text }));
    const grams = parseGrams(text);
    if (grams !== null) {
      onChange({ ...value, items: value.items.map((i) => (i.id === id ? { ...i, grams } : i)) });
    }
  };

  const total = mealNutrients(value);

  return (
    <div className="flex flex-col gap-4">
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- local data/blob URL, nothing to optimise
        <img src={photoUrl} alt="Ảnh bữa ăn" className="max-h-64 w-full rounded-2xl border border-line object-cover" />
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="meal-title" className="text-sm font-medium text-ink">
          Tên bữa
        </label>
        <input
          id="meal-title"
          className={INPUT_CLASS}
          value={value.title}
          maxLength={TITLE_MAX}
          aria-invalid={value.title.trim() === "" || undefined}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
        <p className="text-sm text-muted">Độ tin cậy: {CONFIDENCE_LABEL[value.confidence]}</p>
        {value.notes !== "" && <p className="text-sm text-muted italic">“{value.notes}”</p>}
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
        {value.items.map((item) => {
          const ok = gramsValid(item.id);
          return (
            <li key={item.id} className="flex items-center gap-2 py-1.5 pr-1 pl-3">
              <span className="min-w-0 flex-1 text-[15px] break-words">{item.name}</span>
              <input
                inputMode="numeric"
                aria-label={`Khối lượng ${item.name} (gam)`}
                aria-invalid={!ok || undefined}
                className={`${INPUT_CLASS} !w-[4.5rem] !px-2 text-right`}
                value={gramsText[item.id] ?? String(Math.max(GRAMS_MIN, Math.round(item.grams)))}
                onChange={(e) => handleGrams(item.id, e.target.value)}
              />
              <span className="text-sm text-muted">g</span>
              <span className="w-[4.75rem] text-right text-sm tabular-nums">{formatInt(itemNutrients(item).kcal)} kcal</span>
              <button
                type="button"
                aria-label={`Xóa ${item.name}`}
                onClick={() => onChange({ ...value, items: value.items.filter((i) => i.id !== item.id) })}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-line/60"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          );
        })}
        {value.items.length === 0 && (
          <li className="px-3 py-4 text-sm text-muted">Chưa có món nào. Hãy phân tích lại để thêm món.</li>
        )}
      </ul>
      {value.items.some((i) => !gramsValid(i.id)) && (
        <p role="alert" className="-mt-2 text-[13px] text-brand">
          Khối lượng là số nguyên từ {formatInt(GRAMS_MIN)} đến {formatInt(GRAMS_MAX)} g.
        </p>
      )}

      <div className="rounded-2xl border border-line bg-card px-3 py-3">
        <p className="text-lg font-semibold tabular-nums">Tổng {formatInt(total.kcal)} kcal</p>
        <p className="mt-0.5 text-sm text-muted tabular-nums">
          Carb {formatGrams(total.carbs)}g · Protein {formatGrams(total.protein)}g · Fat {formatGrams(total.fat)}g · Xơ{" "}
          {formatGrams(total.fiber)}g
        </p>
      </div>

      <p className="text-[13px] text-muted">Số liệu là ước tính của AI, có thể sai lệch.</p>
    </div>
  );
}
