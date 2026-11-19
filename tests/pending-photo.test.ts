import { afterEach, expect, test } from "vitest";
import { clearPendingPhoto, peekPendingPhoto, setPendingPhoto } from "@/lib/pending-photo";

const file = (name: string) => new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });

afterEach(() => {
  const id = setPendingPhoto(file("reset.png"));
  clearPendingPhoto(id);
});

test("returns the stored file for its id", () => {
  const f = file("a.png");
  const id = setPendingPhoto(f);
  expect(id).toMatch(/\S/);
  expect(peekPendingPhoto(id)).toBe(f);
  // peeking does not consume
  expect(peekPendingPhoto(id)).toBe(f);
});

test("returns null for an unknown or missing id", () => {
  setPendingPhoto(file("a.png"));
  expect(peekPendingPhoto("nope")).toBeNull();
  expect(peekPendingPhoto(null)).toBeNull();
});

test("a new photo replaces the old one", () => {
  const first = setPendingPhoto(file("a.png"));
  const b = file("b.png");
  const second = setPendingPhoto(b);
  expect(second).not.toBe(first);
  expect(peekPendingPhoto(first)).toBeNull();
  expect(peekPendingPhoto(second)).toBe(b);
});

test("clear only removes the matching id", () => {
  const first = setPendingPhoto(file("a.png"));
  const b = file("b.png");
  const second = setPendingPhoto(b);
  clearPendingPhoto(first);
  expect(peekPendingPhoto(second)).toBe(b);
  clearPendingPhoto(second);
  expect(peekPendingPhoto(second)).toBeNull();
});
