// A small event channel so a failed background write can tell the UI (SyncErrorBanner).

export const SYNC_ERROR_MESSAGE = "Không đồng bộ được thay đổi. Hãy thử lại.";

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function onSyncError(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Writes and listeners never throw at the caller; they report here instead. */
export function reportSyncError(err: unknown): void {
  // Only the error code: never the meal data.
  const code = typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined;
  console.error("sync error", typeof code === "string" ? code : "unknown");
  for (const listener of listeners) listener(SYNC_ERROR_MESSAGE);
}
