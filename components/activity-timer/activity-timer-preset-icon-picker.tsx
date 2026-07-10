"use client";

import { ActivityPresetIcon } from "@/components/activity-timer/activity-preset-icon";
import { PRESET_ICON_OPTIONS } from "@/lib/activity-timer/preset-icons";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type ActivityTimerPresetIconPickerProps = {
  value: string | null;
  onChange: (iconName: string | null) => void;
  disabled?: boolean;
};

function segmentClass(active: boolean): string {
  return active ? "ui-segment-active" : "ui-segment";
}

export function ActivityTimerPresetIconPicker({
  value,
  onChange,
  disabled = false,
}: ActivityTimerPresetIconPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Icon</p>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_ICON_OPTIONS.map((option) => {
          const active = (value ?? null) === option.value;

          return (
            <button
              key={option.label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              title={option.label}
              aria-label={option.label}
              {...passwordManagerSafeControlProps}
              className={`flex min-h-10 min-w-10 items-center justify-center rounded-xl px-2 transition-colors ${segmentClass(
                active,
              )}`}
            >
              <ActivityPresetIcon
                iconName={option.value}
                className="size-4 shrink-0 text-muted"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
