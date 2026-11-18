/**
 * Whether the signed-in user may open /admin. `adminEmails` is the comma-separated
 * `ADMIN_EMAILS` env value; an unset or empty list means nobody is an admin.
 */
export function isAdmin(claims: { email?: string; emailVerified: boolean }, adminEmails: string | undefined): boolean {
  if (!claims.emailVerified || !claims.email) return false;
  const list = (adminEmails ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(claims.email.trim().toLowerCase());
}
