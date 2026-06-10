"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updatePlanTitleAction } from "@/app/(app)/plans/actions";
import { MAX_PLAN_TITLE_LENGTH } from "@/lib/plan-titles";

type EditablePlanTitleProps = {
  planId: string;
  title: string;
  className?: string;
};

export function EditablePlanTitle({
  planId,
  title: initialTitle,
  className = "text-xl font-semibold tracking-tight text-foreground",
}: EditablePlanTitleProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    setTitle(initialTitle);
    setDraft(initialTitle);
  }, [initialTitle]);

  function startEdit() {
    setDraft(title);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(title);
    setError(null);
    setEditing(false);
  }

  function saveTitle() {
    setError(null);

    startSave(async () => {
      const result = await updatePlanTitleAction(planId, draft);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setTitle(result.title);
      setDraft(result.title);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <input
          id={`plan-title-${planId}`}
          name={`planTitle-${planId}`}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              saveTitle();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelEdit();
            }
          }}
          maxLength={MAX_PLAN_TITLE_LENGTH}
          dir="auto"
          autoFocus
          className="ui-input w-full py-2 text-lg font-semibold"
          aria-label="Plan title"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveTitle}
            disabled={isSaving}
            className="ui-btn-secondary ui-btn-compact min-h-8 px-3 text-xs"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="ui-btn-ghost ui-btn-compact min-h-8 px-3 text-xs"
          >
            Cancel
          </button>
        </div>
        {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <h2 className={`min-w-0 flex-1 ${className}`} dir="auto">
        {title}
      </h2>
      <button
        type="button"
        onClick={startEdit}
        className="ui-btn-ghost mt-0.5 min-h-8 shrink-0 px-2 text-xs text-muted-light"
        aria-label="Edit plan title"
      >
        Edit
      </button>
    </div>
  );
}
