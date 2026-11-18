import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server only. Never import this from a "use client" file.

export type AdminHandles = { db: Firestore; auth: Auth };

let cached: AdminHandles | null | undefined;

function createApp(): App | null {
  const existing = getApps()[0];
  if (existing) return existing;

  const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  if (process.env.FIRESTORE_EMULATOR_HOST && publicProjectId.startsWith("demo-")) {
    // Tests: the SDK talks to the emulators through FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST.
    return initializeApp({ projectId: publicProjectId });
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!encoded) {
    console.warn("usage disabled: missing FIREBASE_SERVICE_ACCOUNT_B64");
    return null;
  }
  try {
    const json = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    return initializeApp({ credential: cert(json), projectId: json.project_id });
  } catch {
    // Never log the value or the parse error: either could contain the private key.
    console.warn("usage disabled: invalid FIREBASE_SERVICE_ACCOUNT_B64");
    return null;
  }
}

/** Firestore and Auth with admin rights, or `null` when the server has no credentials. Created once. */
export function getAdmin(): AdminHandles | null {
  if (cached !== undefined) return cached;
  const app = createApp();
  cached = app ? { db: getFirestore(app), auth: getAuth(app) } : null;
  return cached;
}
