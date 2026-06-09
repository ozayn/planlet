"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createPlanItemAction } from "@/app/(app)/plans/actions";

type AddItemFormProps = {
  planId: string;
  parentItemId?: string;
  placeholder?: string;
  buttonLabel?: string;
};

export function AddItemForm({
  planId,
  parentItemId,
  placeholder = "What’s on your mind?",
  buttonLabel = "Add item",
}: AddItemFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const canSubmit = title.trim().length > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    startTransition(async () => {
      await createPlanItemAction({
        planId,
        title: trimmed,
        parentItemId,
      });
      setTitle("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="ui-plan-item flex items-center gap-2 px-2.5 py-2"
    >
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={placeholder}
        dir="auto"
        aria-label={placeholder}
        className="ui-input ui-input-compact min-h-9 flex-1 border-transparent bg-transparent px-2 shadow-none focus:border-border focus:bg-surface"
      />
      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className={`ui-btn-compact shrink-0 rounded-lg px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
          canSubmit
            ? "border border-border bg-surface text-foreground hover:bg-accent-cream"
            : "border border-border-soft bg-transparent text-muted-light"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isPending ? "…" : buttonLabel}
      </button>
    </form>
  );
}
