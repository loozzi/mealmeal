import { collection, deleteDoc, doc, setDoc, writeBatch, type Firestore } from "firebase/firestore";
import { getFirebase } from "./firebase";
import { reportSyncError } from "./sync-errors";
import type { Goal, Meal, Profile } from "./types";

// Firestore layout: users/{uid} (profile), users/{uid}/meals/{id}, users/{uid}/goals/{effectiveFrom}.
// Writes do not wait for the server: Firestore applies them to its local cache at once (listeners
// see them immediately, also offline) and sends them when it can. A rejected write is reported.

function withoutUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export function toMealDoc(meal: Meal): Record<string, unknown> {
  // `photo` may linger on objects built from v1 data; it must never reach Firestore.
  const { photo: _photo, ...rest } = meal as Meal & { photo?: unknown };
  void _photo;
  return withoutUndefined({ ...rest, updatedAt: new Date().toISOString() });
}

export function toGoalDoc(
  goal: Pick<Goal, "effectiveFrom" | "mode" | "targetKcal" | "suggestedKcal"> & { createdAt?: string },
): Record<string, unknown> {
  return withoutUndefined({
    effectiveFrom: goal.effectiveFrom,
    mode: goal.mode,
    targetKcal: goal.targetKcal,
    suggestedKcal: goal.suggestedKcal,
    createdAt: goal.createdAt ?? new Date().toISOString(),
  });
}

export function toProfileDoc(profile: Omit<Profile, "id" | "updatedAt">): Record<string, unknown> {
  const { id: _id, photo: _photo, ...rest } = profile as Profile & { photo?: unknown };
  void _id;
  void _photo;
  return withoutUndefined({ ...rest, updatedAt: new Date().toISOString() });
}

/** The signed-in user's Firestore and uid. Throws when nobody is signed in. */
export function userScope(): { db: Firestore; uid: string } {
  const { auth, db } = getFirebase();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  return { db, uid };
}

export const mealsPath = (uid: string) => `users/${uid}/meals`;
export const goalsPath = (uid: string) => `users/${uid}/goals`;
export const profilePath = (uid: string) => `users/${uid}`;

/** Upserts by id, so saving the same meal twice never duplicates it. */
export function saveMeal(meal: Meal): void {
  const { db, uid } = userScope();
  setDoc(doc(collection(db, mealsPath(uid)), meal.id), toMealDoc(meal)).catch(reportSyncError);
}

export function deleteMeal(id: string): void {
  const { db, uid } = userScope();
  deleteDoc(doc(collection(db, mealsPath(uid)), id)).catch(reportSyncError);
}

/**
 * Saves the profile and the goal together. Goals are keyed by effectiveFrom, so a second goal on
 * the same day replaces the first while earlier days keep theirs.
 */
export function saveProfileAndGoal(
  profile: Omit<Profile, "id" | "updatedAt">,
  goal: Pick<Goal, "effectiveFrom" | "mode" | "targetKcal" | "suggestedKcal">,
): void {
  const { db, uid } = userScope();
  const batch = writeBatch(db);
  batch.set(doc(db, profilePath(uid)), toProfileDoc(profile));
  batch.set(doc(collection(db, goalsPath(uid)), goal.effectiveFrom), toGoalDoc(goal));
  batch.commit().catch(reportSyncError);
}
