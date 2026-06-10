import type { KeyboardEvent } from "react";

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
