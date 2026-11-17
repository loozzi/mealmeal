"use client";

import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { DateKey } from "./dates";
import { getFirebase } from "./firebase";
import { goalsPath, mealsPath, profilePath } from "./store";
import { reportSyncError } from "./sync-errors";
import type { Goal, Meal, Profile } from "./types";

// Every hook returns undefined while loading. Each listens to Firestore (onSnapshot), which serves
// the local cache first, so data shows offline. Changing a parameter drops the old listener.
// A listener error is reported and the hook falls back to an empty result.

const byTime = (a: Meal, b: Meal) =>
  a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt);

const currentUid = () => getFirebase().auth.currentUser?.uid ?? null;

/** Subscribes while `key` is stable; the value for an older key is never returned. */
function useSnapshot<T>(
  key: string | null,
  subscribe: (uid: string, set: (value: T) => void, fail: () => void) => () => void,
  empty: T,
): T | undefined {
  const [state, setState] = useState<{ key: string; value: T } | null>(null);

  useEffect(() => {
    if (key === null) return;
    // AppGate renders the app only for a signed-in user, so there is always a uid here.
    const uid = currentUid();
    if (!uid) return;
    return subscribe(
      uid,
      (value) => setState({ key, value }),
      () => setState({ key, value: empty }),
    );
    // `subscribe` and `empty` are fully described by `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (key === null) return empty;
  return state?.key === key ? state.value : undefined;
}

/** The error callback every listener uses: report it, then show the empty result. */
const failWith = (fail: () => void) => (err: unknown) => {
  reportSyncError(err);
  fail();
};

function mealsBetween(from: DateKey, to: DateKey) {
  return (uid: string, set: (v: Meal[]) => void, fail: () => void) => {
    const q = query(
      collection(getFirebase().db, mealsPath(uid)),
      where("date", ">=", from),
      where("date", "<=", to),
    );
    return onSnapshot(q, (snap) => set(snap.docs.map((d) => d.data() as Meal).sort(byTime)), failWith(fail));
  };
}

export function useMealsByDate(date: DateKey): Meal[] | undefined {
  return useSnapshot(`day:${date}`, mealsBetween(date, date), []);
}

/** Both ends inclusive. */
export function useMealsInRange(from: DateKey, to: DateKey): Meal[] | undefined {
  return useSnapshot(`range:${from}:${to}`, mealsBetween(from, to), []);
}

/** null = not found (as opposed to undefined = still loading). */
export function useMeal(id: string | null): Meal | null | undefined {
  return useSnapshot<Meal | null>(
    id === null ? null : `meal:${id}`,
    (uid, set, fail) =>
      onSnapshot(
        doc(collection(getFirebase().db, mealsPath(uid)), id as string),
        (snap) => set((snap.data() as Meal | undefined) ?? null),
        failWith(fail),
      ),
    null,
  );
}

export function useGoals(): Goal[] | undefined {
  return useSnapshot<Goal[]>(
    "goals",
    (uid, set, fail) =>
      onSnapshot(
        collection(getFirebase().db, goalsPath(uid)),
        (snap) => set(snap.docs.map((d) => d.data() as Goal)),
        failWith(fail),
      ),
    [],
  );
}

/** undefined while loading; whether the user has set any goal yet. */
export function useHasGoal(): boolean | undefined {
  const goals = useGoals();
  return goals === undefined ? undefined : goals.length > 0;
}

/** null = no profile saved yet. */
export function useProfile(): Profile | null | undefined {
  return useSnapshot<Profile | null>(
    "profile",
    (uid, set, fail) =>
      onSnapshot(
        doc(getFirebase().db, profilePath(uid)),
        (snap) => {
          const data = snap.data() as Omit<Profile, "id"> | undefined;
          set(data ? { ...data, id: "me" } : null);
        },
        failWith(fail),
      ),
    null,
  );
}
