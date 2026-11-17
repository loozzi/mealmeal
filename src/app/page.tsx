"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "@/components/calendar/Calendar";
import { DayRing } from "@/components/calendar/DayRing";
import { MealListItem } from "@/components/meal/MealListItem";
import { monthGrid, resolveDateParam, todayKey, weekOf, type DateKey } from "@/lib/dates";
import { dayMessage, dayStatus, type DayStatus } from "@/lib/day-status";
import { useGoals, useMealsInRange } from "@/lib/db-hooks";
import { formatDayLong, formatGrams, formatInt } from "@/lib/format";
import { goalForDate } from "@/lib/goals";
import { dayNutrients } from "@/lib/nutrition";
import type { Meal } from "@/lib/types";

const EMPTY_STATUS: DayStatus = { kind: "empty", fill: 0, consumed: 0, target: 0, delta: 0 };
const SKELETON = "animate-pulse rounded-md bg-line/70 motion-reduce:animate-none";

const byTime = (a: Meal, b: Meal) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt);

function Home() {
  const router = useRouter();
  const today = todayKey();
  const selected = resolveDateParam(useSearchParams().get("d"), today);
  const [view, setView] = useState<"week" | "month">("week");

  const shown = (view === "week" ? weekOf(selected) : monthGrid(selected)).filter((k): k is DateKey => k !== null);
  const from = shown[0];
  const to = shown[shown.length - 1];
  const meals = useMealsInRange(from, to);
  const goals = useGoals();

  const mealsByDate = useMemo(() => {
    const map = new Map<DateKey, Meal[]>();
    for (const meal of meals ?? []) {
      const list = map.get(meal.date);
      if (list) list.push(meal);
      else map.set(meal.date, [meal]);
    }
    return map;
  }, [meals]);

  const statuses = useMemo(() => {
    const map = new Map<DateKey, DayStatus>();
    if (!goals) return map;
    for (const [date, list] of mealsByDate) {
      const goal = goalForDate(goals, date);
      if (!goal) continue;
      map.set(date, dayStatus({ mealCount: list.length, consumed: dayNutrients(list).kcal, target: goal.targetKcal, mode: goal.mode }));
    }
    return map;
  }, [mealsByDate, goals]);

  const goal = goals ? goalForDate(goals, selected) : undefined;
  const ready = meals !== undefined && goal !== undefined;
  const dayMeals = [...(mealsByDate.get(selected) ?? [])].sort(byTime);
  const nutrients = dayNutrients(dayMeals);
  const status = goal
    ? dayStatus({ mealCount: dayMeals.length, consumed: nutrients.kcal, target: goal.targetKcal, mode: goal.mode })
    : EMPTY_STATUS;

  return (
    <>
      <header className="flex min-h-14 items-center px-4 pt-[env(safe-area-inset-top)]">
        <p className="flex-1 text-xl font-bold">MealMeal</p>
        <Link href="/settings" aria-label="Mục tiêu" className="-mr-2 inline-flex size-11 items-center justify-center rounded-full active:bg-line/60">
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="4.5" />
            <circle cx="12" cy="12" r="0.8" fill="currentColor" />
          </svg>
        </Link>
      </header>

      <main className="flex flex-col gap-5 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <Calendar
          selected={selected}
          today={today}
          view={view}
          statuses={statuses}
          onSelect={(k) => router.replace(`/?d=${k}`, { scroll: false })}
          onToggleView={() => setView((v) => (v === "week" ? "month" : "week"))}
        />

        <section aria-label="Tổng kết ngày" className="flex flex-col items-center gap-2">
          <h1 className="self-start text-lg font-semibold">{formatDayLong(selected)}</h1>
          <DayRing status={ready ? status : EMPTY_STATUS}>
            {ready ? (
              <>
                <span className="text-3xl leading-9 font-bold tabular-nums">{formatInt(nutrients.kcal)}</span>
                <span className="text-sm leading-5 text-muted tabular-nums">/ {formatInt(goal.targetKcal)} kcal</span>
              </>
            ) : (
              <>
                <span className={`${SKELETON} my-1 h-7 w-20`} />
                <span className={`${SKELETON} my-0.5 h-4 w-24`} />
              </>
            )}
          </DayRing>
          {ready ? (
            <>
              <p className={`text-[15px] leading-6 font-medium ${status.kind === "over" ? "text-warn" : "text-ink"}`}>
                {dayMessage(status, goal.mode)}
              </p>
              <p className="text-sm leading-5 text-muted tabular-nums">
                Carb {formatGrams(nutrients.carbs)}g · Protein {formatGrams(nutrients.protein)}g · Fat {formatGrams(nutrients.fat)}g · Xơ{" "}
                {formatGrams(nutrients.fiber)}g
              </p>
            </>
          ) : (
            <>
              <span className={`${SKELETON} my-1 h-4 w-32`} />
              <span className={`${SKELETON} my-0.5 h-4 w-56`} />
            </>
          )}
        </section>

        <section aria-label="Các bữa trong ngày">
          {!ready ? (
            <div className={`${SKELETON} h-16 !rounded-2xl`} />
          ) : dayMeals.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[15px] text-muted">
              Chưa có bữa nào. Chụp hoặc mô tả bữa ăn đầu tiên của ngày.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {dayMeals.map((meal) => (
                <li key={meal.id}>
                  <MealListItem meal={meal} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-10 mx-auto flex max-w-[480px] justify-end px-4">
        <Link
          href={`/add?d=${selected}`}
          className="pointer-events-auto inline-flex min-h-12 items-center gap-1.5 rounded-full bg-ink px-5 text-[15px] font-semibold text-white shadow-lg shadow-ink/20 active:bg-ink/85"
        >
          <span aria-hidden className="text-xl leading-none">+</span>
          Thêm bữa
        </Link>
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  );
}
