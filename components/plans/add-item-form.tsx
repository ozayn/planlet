"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPlanItemAction } from "@/app/(app)/plans/actions";
import { ActionErrorBanner } from "@/components/ui/action-error-banner";
import type { AddItemKind } from "@/lib/plan-item-sections";
import {
  getMutationError,
  invokeServerAction,
} from "@/lib/invoke-server-action";
import { passwordManagerSafeControlProps, passwordManagerSafeFormProps } from "@/lib/password-manager-ignore";

type AddItemFormProps = {
  planId: string;
  parentItemId?: string;
  placeholder?: string;
  buttonLabel?: string;
  compact?: boolean;
};

const KIND_OPTIONS: { value: AddItemKind; label: string }[] = [
  { value: "TASK", label: "Task" },
  { value: "INTENTION", label: "Intention" },
  { value: "NOTE", label: "Note" },
];

const KIND_COPY: Record<
  AddItemKind,
  { placeholder: string; buttonLabel: string }
> = {
  TASK: {
    placeholder: "What needs doing?",
    buttonLabel: "Add",
  },
  INTENTION: {
    placeholder: "What do you want to hold in mind?",
    buttonLabel: "Add",
  },
  NOTE: {
    placeholder: "What do you want to remember?",
    buttonLabel: "Add",
  },
};

export function AddItemForm({
  planId,
  parentItemId,
  placeholder,
  buttonLabel,
  compact = false,
}: AddItemFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AddItemKind>("TASK");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canSubmit = title.trim().length > 0;
  const showKindSelector = !parentItemId;
  const copy = KIND_COPY[kind];
  const inputId = parentItemId ? `new-plan-item-${parentItemId}` : "new-plan-item";
  const inputName = parentItemId ? `newPlanItem-${parentItemId}` : "newPlanItem";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setError(null);

    startTransition(async () => {
      const invoked = await invokeServerAction(() =>
        createPlanItemAction({
          planId,
          title: trimmed,
          parentItemId,
          type: parentItemId ? "TASK" : kind,
        }),
      );
      const mutationError = getMutationError(invoked);
      if (mutationError) {
        setError(mutationError.message);
        return;
      }

      setTitle("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      {...passwordManagerSafeFormProps}
      className={
        compact
          ? "ui-add-item-form ui-add-item-form-compact space-y-1.5"
          : "ui-add-item-form space-y-2"
      }
    >
      {showKindSelector ? (
        <div
          className="ui-add-item-kind flex flex-wrap gap-1.5"
          role="group"
          aria-label="Item type"
        >
          {KIND_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              {...passwordManagerSafeControlProps}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                kind === option.value
                  ? "border-border-subtle bg-accent-cream text-foreground"
                  : "border-border-soft bg-transparent text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <ActionErrorBanner message={error} /> : null}

      <div
        className={
          compact
            ? "ui-add-item-row flex items-center gap-1.5 rounded-lg border border-dashed border-border-soft bg-surface-muted/50 px-2 py-1"
            : "ui-add-item-row ui-plan-item flex items-center gap-2 px-3 py-2"
        }
      >
        <input
          id={inputId}
          name={inputName}
          type="text"
          {...passwordManagerSafeControlProps}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={placeholder ?? copy.placeholder}
          dir="auto"
          aria-label={placeholder ?? copy.placeholder}
          className={
            compact
              ? "ui-input min-h-8 flex-1 border-transparent bg-transparent px-1.5 py-1 text-xs shadow-none focus:border-border focus:bg-surface"
              : "ui-input ui-input-compact ui-add-item-input min-h-10 flex-1 border-transparent bg-transparent px-2 shadow-none focus:border-border focus:bg-surface"
          }
        />
        <button
          type="submit"
          disabled={isPending || !canSubmit}
          {...passwordManagerSafeControlProps}
          className={`shrink-0 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
            compact
              ? "min-h-8 px-2 text-xs"
              : "ui-btn-compact min-h-10 px-3"
          } ${
            canSubmit
              ? "border border-border bg-surface text-foreground hover:bg-accent-cream"
              : "border border-border-soft bg-transparent text-muted-light"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isPending ? "…" : buttonLabel ?? copy.buttonLabel}
        </button>
      </div>
    </form>
  );
}
