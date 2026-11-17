"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { DateKey } from "./dates";
import { getMeal, getProfile, listGoals, listMealsByDate, listMealsInRange } from "./db";
import type { Goal, Meal, Profile } from "./types";

// Every hook returns undefined while the query is loading.

export function useMealsByDate(date: DateKey): Meal[] | undefined {
  return useLiveQuery(() => listMealsByDate(date), [date]);
}

export function useMealsInRange(from: DateKey, to: DateKey): Meal[] | undefined {
  return useLiveQuery(() => listMealsInRange(from, to), [from, to]);
}

/** null = not found (as opposed to undefined = still loading). */
export function useMeal(id: string | null): Meal | null | undefined {
  return useLiveQuery(async () => (id ? ((await getMeal(id)) ?? null) : null), [id]);
}

export function useGoals(): Goal[] | undefined {
  return useLiveQuery(() => listGoals(), []);
}

/** null = no profile saved yet. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await getProfile()) ?? null, []);
}
