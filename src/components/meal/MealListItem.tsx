"use client";

import Link from "next/link";
import { formatInt } from "@/lib/format";
import { mealNutrients } from "@/lib/nutrition";
import { usePhoto } from "@/lib/local-db";
import type { Meal } from "@/lib/types";
import { useObjectUrl } from "@/lib/use-object-url";

export function MealListItem({ meal }: { meal: Meal }) {
  const photo = usePhoto(meal.id);
  const photoUrl = useObjectUrl(photo ?? undefined);
  // Grey box while the local photo loads; a photo taken on another device shows the letter tile.
  const showPhoto = meal.hasPhoto && photo !== null;

  return (
    <Link href={`/meal?id=${encodeURIComponent(meal.id)}`} className="flex min-h-16 items-center gap-3 px-3 py-2 active:bg-bg">
      {showPhoto ? (
        photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing to optimise
          <img src={photoUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span aria-hidden className="size-12 shrink-0 rounded-xl bg-line/70" />
        )
      ) : (
        <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-line/70 text-lg font-semibold text-muted">
          {meal.title.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium">{meal.title}</span>
        <span className="text-[13px] text-muted tabular-nums">{meal.time}</span>
      </span>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatInt(mealNutrients(meal).kcal)} kcal</span>
    </Link>
  );
}
