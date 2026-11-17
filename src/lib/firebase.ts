import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

// These four values are public web config, not secrets. They are written out by name so
// Next.js can inline them into the browser bundle.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
export const FIRESTORE_EMULATOR = { host: "127.0.0.1", port: 8085 } as const;

export function firebaseProjectId(): string {
  return config.projectId ?? "";
}

/** A `demo-` project id (Firebase's convention for emulator-only projects) switches to the emulators. */
export function isEmulator(): boolean {
  return firebaseProjectId().startsWith("demo-");
}

type FirebaseHandles = { app: FirebaseApp; auth: Auth; db: Firestore };
let handles: FirebaseHandles | undefined;

/** The app's Firebase handles, created on first call. Browser only. */
export function getFirebase(): FirebaseHandles {
  if (typeof window === "undefined") throw new Error("getFirebase() is browser-only");
  if (handles) return handles;

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  if (isEmulator()) {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
    connectFirestoreEmulator(db, FIRESTORE_EMULATOR.host, FIRESTORE_EMULATOR.port);
  }
  handles = { app, auth, db };
  return handles;
}
