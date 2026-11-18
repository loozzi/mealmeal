import { describe, expect, it } from "vitest";
import { isAdmin } from "@/lib/server/admin-auth";

const LIST = " a@example.com , b@example.com ";

describe("isAdmin", () => {
  it("matches ignoring case and spaces", () => {
    expect(isAdmin({ email: "A@Example.com", emailVerified: true }, LIST)).toBe(true);
  });
  it("requires a verified email", () => {
    expect(isAdmin({ email: "a@example.com", emailVerified: false }, LIST)).toBe(false);
  });
  it("rejects a token without email", () => {
    expect(isAdmin({ emailVerified: true }, LIST)).toBe(false);
  });
  it("has no admin when the list is unset or empty", () => {
    const claims = { email: "a@example.com", emailVerified: true };
    expect(isAdmin(claims, undefined)).toBe(false);
    expect(isAdmin(claims, "")).toBe(false);
    expect(isAdmin(claims, " , ")).toBe(false);
  });
  it("rejects other emails", () => {
    expect(isAdmin({ email: "c@example.com", emailVerified: true }, LIST)).toBe(false);
  });
});
