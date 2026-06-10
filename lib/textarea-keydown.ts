import type { KeyboardEvent, MouseEvent, RefObject } from "react";

export function shouldSubmitTextareaOnEnter(
  event: KeyboardEvent<HTMLTextAreaElement>,
): boolean {
  if (event.key !== "Enter") {
    return false;
  }

  if (event.shiftKey) {
    return false;
  }

  if (event.nativeEvent.isComposing) {
    return false;
  }

  return true;
}

/** Refocus quick-add field after submit; double rAF helps mobile keyboards stay open. */
export function focusQuickAddInput(
  ref: RefObject<HTMLTextAreaElement | null>,
) {
  requestAnimationFrame(() => {
    ref.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true });
    });
  });
}

/** Prevent Add button mousedown from blurring the textarea before click. */
export function preventQuickAddButtonBlur(
  event: MouseEvent<HTMLButtonElement>,
) {
  event.preventDefault();
}
