/**
 * Hands a photo taken on the home screen to the add page. The file never leaves this tab:
 * it lives in memory until the add page has used it, and a reload simply forgets it.
 */
let slot: { id: string; file: File } | null = null;

/** Stores the photo (replacing any earlier one) and returns the id to put in the URL. */
export function setPendingPhoto(file: File): string {
  const id = crypto.randomUUID();
  slot = { id, file };
  return id;
}

/** The photo stored under this id, without removing it. */
export function peekPendingPhoto(id: string | null): File | null {
  return id !== null && slot?.id === id ? slot.file : null;
}

/** Forgets the photo, but only if it is still the one stored under this id. */
export function clearPendingPhoto(id: string): void {
  if (slot?.id === id) slot = null;
}
