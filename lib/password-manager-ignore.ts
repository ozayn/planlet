/**
 * Hints for password managers (1Password, LastPass, Dashlane, etc.) to skip
 * non-credential interactive controls. Use on planning UI buttons only — not on
 * login, share-email, or other real identity fields.
 */
export const passwordManagerIgnoreProps = {
  "data-lpignore": "true",
  "data-1p-ignore": "true",
  "data-form-type": "other",
  "data-dashlane-ignore": "true",
} as const;

/**
 * Planning controls that extensions may annotate before hydration (e.g.
 * data-dashlane-label). suppressHydrationWarning is scoped to these elements
 * only — not used globally.
 */
export const passwordManagerSafeControlProps = {
  ...passwordManagerIgnoreProps,
  suppressHydrationWarning: true,
} as const;
