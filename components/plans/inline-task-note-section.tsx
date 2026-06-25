"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

import { updatePlanItemAction } from "@/app/(app)/plans/actions";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

const NOTE_PREVIEW_MAX_LENGTH = 72;

type InlineTaskNoteSectionProps = {
  planId: string;
  itemId: string;
  savedComment: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
};

function formatNotePreview(comment: string): string {
  const singleLine = comment.replace(/\s+/g, " ").trim();
  if (singleLine.length <= NOTE_PREVIEW_MAX_LENGTH) {
    return singleLine;
  }

  return `${singleLine.slice(0, NOTE_PREVIEW_MAX_LENGTH - 1)}…`;
}

export function InlineTaskNoteSection({
  planId,
  itemId,
  savedComment,
  open,
  onOpenChange,
  disabled = false,
}: InlineTaskNoteSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(savedComment ?? "");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const savedValue = savedComment?.trim() ?? "";
  const hasSavedNote = Boolean(savedValue);

  useEffect(() => {
    if (!open) {
      setDraft(savedComment ?? "");
      setError(null);
    }
  }, [open, savedComment]);

  useEffect(() => {
    if (!open || disabled) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, disabled]);

  function closeEditor() {
    setDraft(savedComment ?? "");
    setError(null);
    onOpenChange(false);
  }

  function handleSave() {
    if (disabled || isPending) {
      return;
    }

    const trimmed = draft.trim();
    if (trimmed === savedValue) {
      closeEditor();
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await updatePlanItemAction({
          planId,
          itemId,
          comment: trimmed || null,
        });
        router.refresh();
        onOpenChange(false);
      } catch {
        setError("Could not save note. Try again.");
      }
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
      return;
    }

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSave();
    }
  }

  if (!open && !hasSavedNote) {
    return null;
  }

  return (
    <div className="mt-1.5 ms-11 border-s border-border-soft/70 ps-2.5 md:ms-9 md:ps-3">
      {!open && hasSavedNote ? (
        <p className="truncate text-[0.6875rem] leading-snug text-muted">
          <span aria-hidden="true">📝 </span>
          {formatNotePreview(savedValue)}
        </p>
      ) : null}

      {open ? (
        <div className="space-y-2 rounded-lg border border-border-soft/80 bg-accent-cream/20 px-3 py-2.5">
          <label htmlFor={fieldId} className="block text-xs text-muted">
            Notes
          </label>
          <textarea
            id={fieldId}
            ref={textareaRef}
            name={`inlineTaskNote-${itemId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isPending}
            rows={3}
            placeholder="Write notes here…"
            dir="auto"
            className="ui-input w-full px-3 py-2 text-sm"
            {...passwordManagerSafeControlProps}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled || isPending}
              onClick={handleSave}
              className="ui-btn-primary min-h-9 px-3 text-xs"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={disabled || isPending}
              onClick={closeEditor}
              className="ui-btn-secondary min-h-9 px-3 text-xs"
            >
              Cancel
            </button>
            <span className="text-[0.6875rem] text-muted-light">
              {draft.length} characters
            </span>
          </div>
          {error ? (
            <p className="text-xs text-accent-red" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
