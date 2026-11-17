import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from "firebase/firestore";
import { getFirebase } from "./firebase";

const errorCode = (err: unknown) =>
  typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;

/**
 * Signs in with a Google popup. A blocked popup falls back to a full-page redirect; closing the
 * popup is the user's choice and is not an error. Any other failure is thrown for the screen to show.
 */
export async function signInWithGoogle(): Promise<void> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = errorCode(err);
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
    if (code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

/** True when some local changes have not reached the server within `timeoutMs` (e.g. offline). */
export async function hasPendingWrites(timeoutMs = 3000): Promise<boolean> {
  const { db } = getFirebase();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(true), timeoutMs);
  });
  try {
    return await Promise.race([waitForPendingWrites(db).then(() => false), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Signs out and removes this device's copy of the account's Firestore data, then reloads at
 * /login so no state from the old account survives. Photos (local-db) stay on the device.
 */
export async function signOutAndClear(): Promise<void> {
  const { auth, db } = getFirebase();
  await signOut(auth);
  await terminate(db);
  try {
    await clearIndexedDbPersistence(db);
  } catch (err) {
    // Another tab still holds the cache open; the data stays rules-protected for the old uid.
    console.error("clear cache failed", errorCode(err) ?? "unknown");
  }
  // A full reload on purpose: nothing in memory from the old account may survive.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
}
