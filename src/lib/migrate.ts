import {
  collection,
  doc,
  documentId,
  getDocFromServer,
  getDocsFromServer,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { clearLegacy, readLegacy } from "./local-db";
import { goalsPath, mealsPath, profilePath, toGoalDoc, toMealDoc, toProfileDoc, userScope } from "./store";
import type { Goal, LegacyGoal, LegacyMeal, Meal, Profile } from "./types";

// Moves the v1 data on this device (meals, profile, goals) into the signed-in account, once.
// Photos stay on the device (local-db `photos`); only the hasPhoto flag goes up.

export type Legacy = { meals: LegacyMeal[]; profile?: Profile; goals: LegacyGoal[] };

/** What the account already has, read from the server. */
export type RemoteState = {
  hasProfile: boolean;
  goalDates: Set<string>;
  mealUpdatedAt: Map<string, string>;
};

export type MigrationPlan = { meals: Meal[]; goals: Goal[]; profile?: Profile };

export type MigrationOp =
  | { kind: "meal"; meal: Meal }
  | { kind: "goal"; goal: Goal }
  | { kind: "profile"; profile: Profile };

/** Firestore allows at most 500 writes in one batch. */
export const BATCH_LIMIT = 500;

/** Pure: decides what to write so the account's newer data is never overwritten. */
export function planMigration(legacy: Legacy, remote: RemoteState): MigrationPlan {
  const meals = legacy.meals
    .filter((m) => {
      const theirs = remote.mealUpdatedAt.get(m.id);
      return theirs === undefined || theirs < m.updatedAt;
    })
    .map(({ photo, ...rest }): Meal => ({ ...rest, hasPhoto: photo !== undefined }));
  const goals = legacy.goals
    .filter((g) => !remote.goalDates.has(g.effectiveFrom))
    .map(({ id: _id, ...rest }): Goal => {
      void _id;
      return rest;
    });
  return { meals, goals, profile: remote.hasProfile ? undefined : legacy.profile };
}

type Deps = {
  read: () => Promise<Legacy>;
  /** Must read from the server and reject when it cannot (offline): a cache miss is not "absent". */
  fetchRemote: (mealIds: string[]) => Promise<RemoteState>;
  /** Writes one batch (at most BATCH_LIMIT ops) and resolves only once the server has it. */
  commit: (ops: MigrationOp[]) => Promise<void>;
  clear: () => Promise<void>;
};

export async function hasLegacyData(read: Deps["read"] = readLegacy): Promise<boolean> {
  const { meals, profile, goals } = await read();
  return meals.length > 0 || goals.length > 0 || profile !== undefined;
}

/**
 * Writes the plan batch by batch, waiting for each, and clears the local v1 data only after every
 * batch succeeded. Any failure rejects and leaves the local data in place for the next try; running
 * again is safe because the plan skips what the account already has.
 */
export async function runMigration(deps: Deps = defaultDeps): Promise<void> {
  const legacy = await deps.read();
  if (!(await hasLegacyData(async () => legacy))) return;

  const remote = await deps.fetchRemote(legacy.meals.map((m) => m.id));
  const plan = planMigration(legacy, remote);
  const ops: MigrationOp[] = [
    ...(plan.profile ? [{ kind: "profile", profile: plan.profile } as const] : []),
    ...plan.goals.map((goal) => ({ kind: "goal", goal }) as const),
    ...plan.meals.map((meal) => ({ kind: "meal", meal }) as const),
  ];
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    await deps.commit(ops.slice(i, i + BATCH_LIMIT));
  }
  await deps.clear();
}

/** Firestore's `in` filter takes at most 30 values. */
const IN_LIMIT = 30;

const defaultDeps: Deps = {
  read: readLegacy,
  clear: clearLegacy,

  async fetchRemote(mealIds) {
    const { db, uid } = userScope();
    const [profileSnap, goalsSnap] = await Promise.all([
      getDocFromServer(doc(db, profilePath(uid))),
      getDocsFromServer(collection(db, goalsPath(uid))),
    ]);
    const mealUpdatedAt = new Map<string, string>();
    for (let i = 0; i < mealIds.length; i += IN_LIMIT) {
      const chunk = mealIds.slice(i, i + IN_LIMIT);
      const snap = await getDocsFromServer(
        query(collection(db, mealsPath(uid)), where(documentId(), "in", chunk)),
      );
      for (const d of snap.docs) mealUpdatedAt.set(d.id, String(d.get("updatedAt") ?? ""));
    }
    return {
      hasProfile: profileSnap.exists(),
      goalDates: new Set(goalsSnap.docs.map((d) => d.id)),
      mealUpdatedAt,
    };
  },

  async commit(ops) {
    const { db, uid } = userScope();
    const batch = writeBatch(db);
    for (const op of ops) {
      if (op.kind === "meal") {
        // Keep the meal's own updatedAt so a later edit on another device still wins.
        batch.set(doc(collection(db, mealsPath(uid)), op.meal.id), {
          ...toMealDoc(op.meal),
          updatedAt: op.meal.updatedAt,
        });
      } else if (op.kind === "goal") {
        batch.set(doc(collection(db, goalsPath(uid)), op.goal.effectiveFrom), toGoalDoc(op.goal));
      } else {
        batch.set(doc(db, profilePath(uid)), toProfileDoc(op.profile));
      }
    }
    // Resolves only when the server has acknowledged the batch.
    await batch.commit();
  },
};
