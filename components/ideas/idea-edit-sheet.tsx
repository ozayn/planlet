"use client";

import { useEffect, useId, useState, useTransition } from "react";

import { updateIdeaAction } from "@/app/(app)/ideas/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import {
  IDEA_CATEGORIES,
  IDEA_CATEGORY_LABELS,
  IDEA_STATUS_LABELS,
  IDEA_STATUSES,
  parseIdeaTagsInput,
  type IdeaCategoryValue,
  type IdeaStatusValue,
  type SerializedIdea,
  type UpdateIdeaInput,
} from "@/lib/ideas/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type IdeaEditSheetProps = {
  idea: SerializedIdea | null;
  open: boolean;
  onClose: () => void;
};

export function IdeaEditSheet({ idea, open, onClose }: IdeaEditSheetProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<IdeaCategoryValue | "">("");
  const [status, setStatus] = useState<IdeaStatusValue>("NEW");
  const [ideaDate, setIdeaDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const titleId = useId();
  const contentId = useId();
  const notesId = useId();

  useEffect(() => {
    if (!open || !idea) {
      return;
    }

    setTitle(idea.title);
    setContent(idea.content);
    setCategory(idea.category ?? "");
    setStatus(idea.status);
    setIdeaDate(idea.ideaDate);
    setTagsInput(idea.tags.join(", "));
    setNotes(idea.notes ?? "");
    setError(null);
  }, [open, idea]);

  const hasContent = Boolean(title.trim() || content.trim() || notes.trim());

  function handleSave() {
    if (!idea || !hasContent) {
      return;
    }

    const input: UpdateIdeaInput = {
      title: title.trim() || null,
      content: content.trim() || null,
      category: category || null,
      status,
      tags: parseIdeaTagsInput(tagsInput),
      notes: notes.trim() || null,
      ideaDate,
    };

    startTransition(async () => {
      const result = await updateIdeaAction(idea.id, input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onClose();
    });
  }

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title="Edit idea"
      footer={
        <div className="space-y-2">
          {error ? (
            <p className="text-sm text-accent-red" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={isPending || !hasContent}
            onClick={handleSave}
            className="ui-btn-primary w-full disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label htmlFor={titleId} className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Title</span>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isPending}
            placeholder="Optional short title"
            className="ui-input w-full"
            dir="auto"
            {...passwordManagerSafeControlProps}
          />
        </label>

        <label htmlFor={contentId} className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Idea</span>
          <textarea
            id={contentId}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={isPending}
            rows={4}
            placeholder="What idea is on your mind?"
            className="ui-textarea w-full resize-y text-base leading-relaxed"
            dir="auto"
            {...passwordManagerSafeControlProps}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as IdeaStatusValue)
              }
              disabled={isPending}
              className="ui-input w-full"
              {...passwordManagerSafeControlProps}
            >
              {IDEA_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {IDEA_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as IdeaCategoryValue | "")
              }
              disabled={isPending}
              className="ui-input w-full"
              {...passwordManagerSafeControlProps}
            >
              <option value="">None</option>
              {IDEA_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {IDEA_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Date</span>
            <input
              type="date"
              value={ideaDate}
              onChange={(event) => setIdeaDate(event.target.value)}
              disabled={isPending}
              className="ui-input w-full"
              {...passwordManagerSafeControlProps}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Tags</span>
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              disabled={isPending}
              placeholder="Comma-separated"
              className="ui-input w-full"
              dir="auto"
              {...passwordManagerSafeControlProps}
            />
          </label>
        </div>

        <label htmlFor={notesId} className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Notes</span>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
            rows={3}
            placeholder="Optional extra context or next steps"
            className="ui-textarea w-full resize-y"
            dir="auto"
            {...passwordManagerSafeControlProps}
          />
        </label>

        {!hasContent ? (
          <p className="text-xs text-muted">
            Add at least an idea, title, or notes to save.
          </p>
        ) : null}
      </div>
    </SimpleSheet>
  );
}
