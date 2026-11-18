import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { UsageCounts } from "@/lib/admin-types";
import { getAdmin } from "./firebase-admin";
import { usageIncrements, type UsageOutcome, type UsageTally } from "./usage";
import { vnDateKey } from "./vn-date";

function increments(counts: UsageCounts) {
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, FieldValue.increment(v)]));
}

/**
 * Adds one request to `usageDaily/{vnDate}_{uid}` and `usageTotals/{uid}`. Two blind writes,
 * no reads, so concurrent requests never conflict. Does nothing without admin credentials.
 */
export async function recordUsage(
  uid: string,
  outcome: UsageOutcome,
  tally: UsageTally,
  now: Date,
  db: Firestore | undefined = getAdmin()?.db,
): Promise<void> {
  if (!db) return;
  const date = vnDateKey(now);
  const inc = increments(usageIncrements(outcome, tally));
  const batch = db.batch();
  batch.set(
    db.doc(`usageDaily/${date}_${uid}`),
    { date, uid, ...inc, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  batch.set(db.doc(`usageTotals/${uid}`), { uid, ...inc, lastAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
}
