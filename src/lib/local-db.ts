import Dexie, { type EntityTable } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import type { LegacyGoal, LegacyMeal, Profile } from "./types";

type PhotoRecord = { mealId: string; blob: Blob };

// What stays on this device: photos, and v1 data until it has moved to the account.
// Dexie opens lazily on first query, so importing this module on the server is safe.
// Never call localDb.open() at module level.
export const localDb = new Dexie("mealmeal") as Dexie & {
  meals: EntityTable<LegacyMeal, "id">;
  profile: EntityTable<Profile, "id">;
  goals: EntityTable<LegacyGoal, "id">;
  photos: EntityTable<PhotoRecord, "mealId">;
};

localDb.version(1).stores({
  meals: "id, date",
  profile: "id",
  goals: "++id, effectiveFrom",
});

localDb
  .version(2)
  .stores({
    meals: "id, date",
    profile: "id",
    goals: "++id, effectiveFrom",
    photos: "mealId",
  })
  .upgrade(async (tx) => {
    // v1 kept the photo inside the meal. Copy it out; the meal records stay as they are
    // until the migration to the account has succeeded.
    const found: PhotoRecord[] = [];
    await tx.table<LegacyMeal, string>("meals").each((meal) => {
      if (meal.photo) found.push({ mealId: meal.id, blob: meal.photo });
    });
    await tx.table<PhotoRecord, string>("photos").bulkPut(found);
  });

export async function getPhoto(mealId: string): Promise<Blob | undefined> {
  return (await localDb.photos.get(mealId))?.blob;
}

export async function putPhoto(mealId: string, blob: Blob): Promise<void> {
  await localDb.photos.put({ mealId, blob });
}

export async function deletePhoto(mealId: string): Promise<void> {
  await localDb.photos.delete(mealId);
}

/** The photo for a meal on this device: undefined while loading, null when there is none. */
export function usePhoto(mealId: string | null): Blob | null | undefined {
  return useLiveQuery(
    async () => (mealId ? ((await getPhoto(mealId)) ?? null) : null),
    [mealId],
  );
}

/** The v1 data still on this device. */
export async function readLegacy(): Promise<{ meals: LegacyMeal[]; profile?: Profile; goals: LegacyGoal[] }> {
  const [meals, profile, goals] = await Promise.all([
    localDb.meals.toArray(),
    localDb.profile.get("me"),
    localDb.goals.toArray(),
  ]);
  return { meals, profile, goals };
}

/** Removes the v1 meals, profile and goals. Photos stay: they are this device's copy. */
export async function clearLegacy(): Promise<void> {
  await localDb.transaction("rw", localDb.meals, localDb.profile, localDb.goals, async () => {
    await Promise.all([localDb.meals.clear(), localDb.profile.clear(), localDb.goals.clear()]);
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
