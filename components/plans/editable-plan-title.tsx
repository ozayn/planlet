"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { updatePlanTitleAction } from "@/app/(app)/plans/actions";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import { MAX_PLAN_TITLE_LENGTH } from "@/lib/plan-titles";

type EditablePlanTitleProps = {
  planId: string;
  title: string;
  className?: string;
  canEdit?: boolean;
  editRequestSignal?: number;
};

export function EditablePlanTitle({
  planId,
  title: initialTitle,
  className = "text-xl font-semibold tracking-tight text-foreground",
  canEdit = true,
  editRequestSignal = 0,
}: EditablePlanTitleProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    setTitle(initialTitle);
    if (!editing) {
      setDraft(initialTitle);
    }
  }, [initialTitle, editing]);

  function startEdit() {
    if (!canEdit) return;
    setDraft(title);
    setError(null);
    setEditing(true);
  }

  useEffect(() => {
    if (editRequestSignal > 0 && canEdit) {
      setDraft(title);
      setError(null);
      setEditing(true);
    }
  }, [editRequestSignal, canEdit, title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function cancelEdit() {
    setDraft(title);
    setError(null);
    setEditing(false);
  }

  function saveTitle() {
    if (!canEdit) return;

    if (draft.trim() === title.trim()) {
      cancelEdit();
      return;
    }

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

  if (!canEdit) {
    return (
      <h2 className={`min-w-0 ${className}`} dir="auto">
        {title}
      </h2>
    );
  }

  if (editing) {
    return (
      <div className="min-w-0 space-y-1">
        <input
          ref={inputRef}
          id="plan-title"
          name="planTitle"
          type="text"
          value={draft}
          disabled={isSaving}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={saveTitle}
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
          {...passwordManagerSafeControlProps}
          className={`ui-input ui-click-to-edit-input w-full ${className}`}
          aria-label="Plan title"
        />
        {error ? <p className="text-sm text-accent-red">{error}</p> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      {...passwordManagerSafeControlProps}
      className={`ui-click-to-edit block w-full min-w-0 text-start ${className}`}
      dir="auto"
      title="Click to edit title"
      aria-label={`Plan title: ${title}. Click to edit.`}
    >
      {title}
    </button>
  );
}
