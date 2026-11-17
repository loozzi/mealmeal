import type { DateKey } from "./dates";

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalMode = "cut" | "maintain" | "bulk";
export type Confidence = "low" | "medium" | "high";

export type Nutrients = { kcal: number; carbs: number; protein: number; fat: number; fiber: number };

export type ApiErrorCode = "INVALID_INPUT" | "NOT_FOOD" | "RATE_LIMITED" | "AI_ERROR" | "TIMEOUT" | "UNAUTHENTICATED";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

export interface MealItem {
  id: string;
  name: string;
  grams: number;
  /** Nutrients per 100 g, unrounded. Item totals are always derived from this and `grams`. */
  per100: Nutrients;
}

export interface Meal {
  id: string;
  date: DateKey;
  /** "HH:mm" */
  time: string;
  title: string;
  source: "photo" | "text" | "both";
  description?: string;
  /** The photo itself stays on the device that took it (local-db `photos`), never in Firestore. */
  hasPhoto: boolean;
  items: MealItem[];
  confidence: Confidence;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: "me";
  sex?: Sex;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  bodyFatPct?: number;
  activity?: Activity;
  updatedAt: string;
}

/** Stored at `users/{uid}/goals/{effectiveFrom}`, so one goal per day. */
export interface Goal {
  effectiveFrom: DateKey;
  mode: GoalMode;
  targetKcal: number;
  suggestedKcal?: number;
  createdAt: string;
}

/** A meal as the v1 app stored it on the device, before accounts. */
export type LegacyMeal = Omit<Meal, "hasPhoto"> & { photo?: Blob };

/** A goal as the v1 app stored it on the device, before accounts. */
export type LegacyGoal = Goal & { id?: number };
