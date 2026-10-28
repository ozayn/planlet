/**
 * Structured Google Drive / OAuth error details safe for logs and admin UI.
 * Never includes tokens, keys, or raw credential material.
 */

export type GoogleDriveErrorReason =
  | "insufficientPermissions"
  | "accessNotConfigured"
  | "forbidden"
  | "rateLimitExceeded"
  | "userRateLimitExceeded"
  | "dailyLimitExceeded"
  | "notFound"
  | "authError"
  | "unknown";

export type ParsedGoogleApiError = {
  httpStatus: number;
  code: number | null;
  message: string | null;
  status: string | null;
  reason: GoogleDriveErrorReason | string | null;
  reasons: string[];
};

const KNOWN_REASONS = new Set<string>([
  "insufficientPermissions",
  "accessNotConfigured",
  "forbidden",
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "dailyLimitExceeded",
  "notFound",
]);

export function isPermissionDeniedReason(
  reason: string | null | undefined,
): boolean {
  return (
    reason === "insufficientPermissions" ||
    reason === "accessNotConfigured" ||
    reason === "forbidden"
  );
}

export function isRateLimitReason(reason: string | null | undefined): boolean {
  return (
    reason === "rateLimitExceeded" ||
    reason === "userRateLimitExceeded" ||
    reason === "dailyLimitExceeded"
  );
}

export function parseGoogleApiErrorBody(
  httpStatus: number,
  bodyText: string,
): ParsedGoogleApiError {
  let code: number | null = null;
  let message: string | null = null;
  let status: string | null = null;
  const reasons: string[] = [];

  try {
    const parsed = JSON.parse(bodyText) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
        errors?: Array<{ reason?: string; message?: string }>;
      };
    };
    const error = parsed.error;
    if (error) {
      code = typeof error.code === "number" ? error.code : null;
      message = typeof error.message === "string" ? error.message : null;
      status = typeof error.status === "string" ? error.status : null;
      if (Array.isArray(error.errors)) {
        for (const entry of error.errors) {
          if (typeof entry?.reason === "string" && entry.reason.trim()) {
            reasons.push(entry.reason.trim());
          }
        }
      }
    }
  } catch {
    // Non-JSON body — keep httpStatus only.
  }

  if (httpStatus === 401 && reasons.length === 0) {
    reasons.push("authError");
  }

  const primary = reasons.find((reason) => KNOWN_REASONS.has(reason)) ??
    reasons[0] ??
    (httpStatus === 403 ? "forbidden" : httpStatus === 401 ? "authError" : null);

  return {
    httpStatus,
    code,
    message,
    status,
    reason: primary,
    reasons,
  };
}

export function formatGoogleDriveErrorMessage(
  parsed: ParsedGoogleApiError,
): string {
  const parts = [`Google Drive request failed (${parsed.httpStatus})`];
  if (parsed.reason) {
    parts.push(`reason=${parsed.reason}`);
  }
  if (parsed.status && parsed.status !== parsed.reason) {
    parts.push(`status=${parsed.status}`);
  }
  if (parsed.message) {
    // Keep admin-facing message concise; Google messages are usually safe.
    const trimmed = parsed.message.replace(/\s+/g, " ").trim();
    if (trimmed && trimmed.length <= 180) {
      parts.push(trimmed);
    }
  }
  return parts.join(" — ");
}
