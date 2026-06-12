export const STALE_PAGE_MESSAGE =
  "This page may be out of date. Reload and try again.";

export const SESSION_EXPIRED_MESSAGE =
  "Your session expired. Please sign in again.";

export function getActionErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Something went wrong. Please try again.";
}

export function isLikelyStalePageError(error: unknown): boolean {
  const message = getActionErrorMessage(error).toLowerCase();

  return (
    message.includes("failed to find server action") ||
    message.includes("older or newer deployment") ||
    message.includes("could not find server action") ||
    (message.includes("server action") && message.includes("not found"))
  );
}

export function isSessionExpiredError(error: unknown): boolean {
  const message = getActionErrorMessage(error).toLowerCase();

  return (
    message === "unauthorized" ||
    message.includes("session expired") ||
    message.includes("not authenticated") ||
    message.includes("sign in")
  );
}

export function getClientActionErrorMessage(error: unknown): string {
  if (isSessionExpiredError(error)) {
    return SESSION_EXPIRED_MESSAGE;
  }

  if (isLikelyStalePageError(error)) {
    return STALE_PAGE_MESSAGE;
  }

  return getActionErrorMessage(error);
}

export function shouldOfferReload(error: unknown): boolean {
  return isLikelyStalePageError(error) || isSessionExpiredError(error);
}

export function shouldOfferReloadForMessage(message: string): boolean {
  return message === STALE_PAGE_MESSAGE || message === SESSION_EXPIRED_MESSAGE;
}

/** Map server-side action failures to safe user-facing messages. */
export function mapServerActionError(error: unknown, fallback: string): string {
  if (isSessionExpiredError(error)) {
    return SESSION_EXPIRED_MESSAGE;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
