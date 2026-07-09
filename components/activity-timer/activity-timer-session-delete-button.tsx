"use client";

import { Trash2Icon } from "@/components/ui/action-icons";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ActivityTimerSessionDeleteButtonProps = {
  disabled?: boolean;
  onClick: () => void;
};

export function ActivityTimerSessionDeleteButton({
  disabled = false,
  onClick,
}: ActivityTimerSessionDeleteButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="ui-icon-action-quiet shrink-0"
      aria-label="Delete timer entry"
      title="Delete timer entry"
      {...passwordManagerSafeControlProps}
    >
      <Trash2Icon className="h-4 w-4" />
    </button>
  );
}
