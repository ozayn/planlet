import {
  getClientActionErrorMessage,
  shouldOfferReload,
  shouldOfferReloadForMessage,
} from "@/lib/action-errors";

export type InvokeServerActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; offerReload: boolean };

export async function invokeServerAction<T>(
  fn: () => Promise<T>,
): Promise<InvokeServerActionResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return {
      ok: false,
      message: getClientActionErrorMessage(error),
      offerReload: shouldOfferReload(error),
    };
  }
}

export function getMutationError<T extends { success: boolean; error?: string }>(
  invoked: InvokeServerActionResult<T>,
): { message: string; offerReload: boolean } | null {
  if (!invoked.ok) {
    return { message: invoked.message, offerReload: invoked.offerReload };
  }

  if (!invoked.value.success) {
    const message = invoked.value.error ?? "Something went wrong. Please try again.";
    return {
      message,
      offerReload: shouldOfferReloadForMessage(message),
    };
  }

  return null;
}

export function unwrapMutationSuccess<TResult extends { success: boolean }>(
  invoked: InvokeServerActionResult<TResult>,
): Extract<TResult, { success: true }> | null {
  if (!invoked.ok || !invoked.value.success) {
    return null;
  }

  return invoked.value as Extract<TResult, { success: true }>;
}
