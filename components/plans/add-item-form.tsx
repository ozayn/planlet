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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={placeholder}
        dir="auto"
        aria-label={placeholder}
        className="ui-input min-h-12 flex-1"
      />
      <button
        type="submit"
        disabled={isPending || !title.trim()}
        className="ui-btn-primary min-h-12 shrink-0"
      >
        {isPending ? "…" : buttonLabel}
      </button>
    </form>
  );
}
