"use client";

import type { InputHTMLAttributes } from "react";

import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type DurationMinutesInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "value" | "onChange" | "className"
> & {
  value: string;
  onChange: (value: string) => void;
  /** Defaults to "Duration in minutes". */
  "aria-label"?: string;
};

/**
 * Compact optional minutes field: [30] min
 * Keeps a 44px-tall touch target while the numeric input stays narrow.
 */
export function DurationMinutesInput({
  value,
  onChange,
  disabled,
  min = 1,
  max = 1440,
  id,
  name,
  placeholder,
  onKeyDown,
  "aria-label": ariaLabel = "Duration in minutes",
  ...rest
}: DurationMinutesInputProps) {
  return (
    <div className="flex min-h-11 items-center gap-1.5">
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="ui-input w-[4.375rem] shrink-0 px-2 text-center text-[length:var(--density-text-sm)] tabular-nums"
        {...rest}
        {...passwordManagerSafeControlProps}
      />
      <span
        className="text-[length:var(--density-text-sm)] text-muted"
        aria-hidden="true"
      >
        min
      </span>
    </div>
  );
}
