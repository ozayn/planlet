"use client";

import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type InlineItemTitleProps = {
  id: string;
  name: string;
  value: string;
  displayValue: string;
  editing: boolean;
  canEdit: boolean;
  multiline?: boolean;
  pending?: boolean;
  ariaLabel: string;
  displayClassName?: string;
  inputClassName?: string;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function InlineItemTitle({
  id,
  name,
  value,
  displayValue,
  editing,
  canEdit,
  multiline = false,
  pending = false,
  ariaLabel,
  displayClassName = "ui-plan-item-title block w-full text-start text-sm font-medium leading-snug text-foreground",
  inputClassName = "ui-input ui-input-compact ui-click-to-edit-input min-h-8 w-full py-1 text-sm font-medium",
  onStartEdit,
  onChange,
  onSave,
  onCancel,
}: InlineItemTitleProps) {
  if (!canEdit) {
    return (
      <p className={displayClassName} dir="auto">
        {displayValue}
      </p>
    );
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          id={id}
          name={name}
          value={value}
          dir="auto"
          autoFocus
          rows={3}
          disabled={pending}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onSave}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
            if (
              (event.metaKey || event.ctrlKey) &&
              event.key === "Enter"
            ) {
              event.preventDefault();
              onSave();
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          {...passwordManagerSafeControlProps}
          className="ui-textarea ui-click-to-edit-input min-h-16 w-full py-1.5 text-sm leading-relaxed"
          aria-label={ariaLabel}
        />
      );
    }

    return (
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        dir="auto"
        autoFocus
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onSave}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSave();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        {...passwordManagerSafeControlProps}
        className={inputClassName}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onStartEdit();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      {...passwordManagerSafeControlProps}
      className={`ui-click-to-edit ${displayClassName}`}
      dir="auto"
      title={`Click to edit ${ariaLabel.toLowerCase()}`}
      aria-label={`${ariaLabel}: ${displayValue}. Click to edit.`}
    >
      {displayValue}
    </button>
  );
}
