"use client";

import { useEffect, useId, useState, useTransition } from "react";

import { updateLearningEntryAction } from "@/app/(app)/learning/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import {
  LEARNING_CATEGORIES,
  LEARNING_CATEGORY_LABELS,
  LEARNING_SOURCE_TYPE_LABELS,
  LEARNING_SOURCE_TYPES,
  formatLearningEntryTags,
  type LearningCategoryValue,
  type LearningSourceTypeValue,
  type SerializedLearningEntry,
  type UpdateLearningEntryInput,
} from "@/lib/learning-journey/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LearningEntryEditSheetProps = {
  entry: SerializedLearningEntry | null;
  open: boolean;
  onClose: () => void;
};

export function LearningEntryEditSheet({
  entry,
  open,
  onClose,
}: LearningEntryEditSheetProps) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceType, setSourceType] = useState<LearningSourceTypeValue | "">("");
  const [sourceName, setSourceName] = useState("");
  const [category, setCategory] = useState<LearningCategoryValue | "">("");
  const [learnedAt, setLearnedAt] = useState("");
  const [importance, setImportance] = useState("3");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const titleId = useId();
  const summaryId = useId();
  const notesId = useId();

  useEffect(() => {
    if (!open || !entry) {
      return;
    }

    setTitle(entry.title);
    setSummary(entry.summary);
    setSourceType(entry.sourceType ?? "");
    setSourceName(entry.sourceName ?? "");
    setCategory(entry.category ?? "");
    setLearnedAt(entry.learnedAt);
    setImportance(String(entry.importance));
    setTags(formatLearningEntryTags(entry.tags));
    setNotes(entry.notes ?? "");
    setError(null);
  }, [open, entry]);

  const hasContent = Boolean(title.trim() || summary.trim() || notes.trim());

  function handleSave() {
    if (!entry || !hasContent) {
      return;
    }

    const input: UpdateLearningEntryInput = {
      title: title.trim() || null,
      summary: summary.trim() || null,
      sourceType: sourceType || null,
      sourceName: sourceName.trim() || null,
      category: category || null,
      learnedAt,
      importance: Number(importance),
      tags,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      const result = await updateLearningEntryAction(entry.id, input);

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
      title="Edit learning"
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

        <label htmlFor={summaryId} className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Summary</span>
          <textarea
            id={summaryId}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            disabled={isPending}
            rows={4}
            placeholder="What did you learn?"
            className="ui-textarea w-full resize-y text-base leading-relaxed"
            dir="auto"
            {...passwordManagerSafeControlProps}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Source type</span>
            <select
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as LearningSourceTypeValue | "")
              }
              disabled={isPending}
              className="ui-input w-full"
              {...passwordManagerSafeControlProps}
            >
              <option value="">None</option>
              {LEARNING_SOURCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {LEARNING_SOURCE_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Source name</span>
            <input
              type="text"
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              disabled={isPending}
              placeholder="Book title, museum, channel, person..."
              className="ui-input w-full"
              dir="auto"
              {...passwordManagerSafeControlProps}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Category</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as LearningCategoryValue | "")
              }
              disabled={isPending}
              className="ui-input w-full"
              {...passwordManagerSafeControlProps}
            >
              <option value="">None</option>
              {LEARNING_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {LEARNING_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Learned date</span>
            <input
              type="date"
              value={learnedAt}
              onChange={(event) => setLearnedAt(event.target.value)}
              disabled={isPending}
              className="ui-input w-full"
              {...passwordManagerSafeControlProps}
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Importance</span>
          <select
            value={importance}
            onChange={(event) => setImportance(event.target.value)}
            disabled={isPending}
            className="ui-input w-full"
            {...passwordManagerSafeControlProps}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} / 5
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Tags</span>
          <input
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            disabled={isPending}
            placeholder="museum, improv, career"
            className="ui-input w-full"
            dir="auto"
            {...passwordManagerSafeControlProps}
          />
        </label>

        <label htmlFor={notesId} className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Notes</span>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isPending}
            rows={3}
            placeholder="Optional extra context or follow-ups"
            className="ui-textarea w-full resize-y"
            dir="auto"
            {...passwordManagerSafeControlProps}
          />
        </label>

        {!hasContent ? (
          <p className="text-xs text-muted">
            Add at least a title, summary, or notes to save.
          </p>
        ) : null}
      </div>
    </SimpleSheet>
  );
}
