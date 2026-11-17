import Dexie, { type EntityTable } from "dexie";
import type { DateKey } from "./dates";
import type { Goal, Meal, Profile } from "./types";

// Dexie opens lazily on first query, so importing this module on the server is safe.
// Never call db.open() at module level.
export const db = new Dexie("mealmeal") as Dexie & {
  meals: EntityTable<Meal, "id">;
  profile: EntityTable<Profile, "id">;
  goals: EntityTable<Goal, "id">;
};

db.version(1).stores({
  meals: "id, date",
  profile: "id",
  goals: "++id, effectiveFrom",
});

const byTime = (a: Meal, b: Meal) =>
  a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt);

export async function listMealsByDate(date: DateKey): Promise<Meal[]> {
  return (await db.meals.where("date").equals(date).toArray()).sort(byTime);
}

/** Both ends inclusive. */
export async function listMealsInRange(from: DateKey, to: DateKey): Promise<Meal[]> {
  return db.meals.where("date").between(from, to, true, true).toArray();
}

export async function getMeal(id: string): Promise<Meal | undefined> {
  return db.meals.get(id);
}

/** Upserts by id, so saving the same meal twice never duplicates it. */
export async function saveMeal(meal: Meal): Promise<void> {
  await db.meals.put({ ...meal, updatedAt: new Date().toISOString() });
}

export async function deleteMeal(id: string): Promise<void> {
  await db.meals.delete(id);
}

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get("me");
}

export async function listGoals(): Promise<Goal[]> {
  return db.goals.toArray();
}

/**
 * Saves the profile and records a goal in one transaction. A goal already recorded for the same
 * effectiveFrom day is replaced; otherwise a new record is appended so earlier days keep theirs.
 */
export async function saveProfileAndGoal(
  profile: Omit<Profile, "id" | "updatedAt">,
  goal: Pick<Goal, "effectiveFrom" | "mode" | "targetKcal" | "suggestedKcal">,
): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction("rw", db.profile, db.goals, async () => {
    await db.profile.put({ ...profile, id: "me", updatedAt: now });
    const existing = await db.goals.where("effectiveFrom").equals(goal.effectiveFrom).first();
    const record: Goal = {
      effectiveFrom: goal.effectiveFrom,
      mode: goal.mode,
      targetKcal: goal.targetKcal,
      suggestedKcal: goal.suggestedKcal,
      createdAt: now,
    };
    if (existing?.id !== undefined) await db.goals.put({ ...record, id: existing.id });
    else await db.goals.add(record);
  });
}

/** Asks the browser not to evict our data. Best effort: never throws. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    // Unsupported or denied: nothing to do.
  }
}
