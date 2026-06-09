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
        className="min-h-12 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
      />
      <button
        type="submit"
        disabled={isPending || !title.trim()}
        className="min-h-12 shrink-0 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "…" : buttonLabel}
      </button>
    </form>
  );
}
