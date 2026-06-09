/**
 * Server-side email allowlist for Google sign-in.
 * When ALLOWED_EMAILS is unset or empty, all Google accounts are allowed (local dev).
 */

export function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email?: string | null): boolean {
  if (!email?.trim()) {
    return false;
  }

  const allowed = getAllowedEmails();
  if (allowed.length === 0) {
    return true;
  }

  return allowed.includes(email.trim().toLowerCase());
}
