"use client";

import { useId, useState } from "react";

import {
  LEARNING_CATEGORIES,
  LEARNING_CATEGORY_LABELS,
  LEARNING_SOURCE_TYPE_LABELS,
  LEARNING_SOURCE_TYPES,
  type CreateLearningEntryInput,
  type LearningCategoryValue,
  type LearningSourceTypeValue,
} from "@/lib/learning-journey/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type LearningCaptureFormProps = {
  defaultLearnedAt: string;
  disabled?: boolean;
  onSubmit: (input: CreateLearningEntryInput) => void;
};

export function LearningCaptureForm({
  defaultLearnedAt,
  disabled = false,
  onSubmit,
}: LearningCaptureFormProps) {
  const [summary, setSummary] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<LearningSourceTypeValue | "">("");
  const [sourceName, setSourceName] = useState("");
  const [category, setCategory] = useState<LearningCategoryValue | "">("");
  const [learnedAt, setLearnedAt] = useState(defaultLearnedAt);
  const [importance, setImportance] = useState("3");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const summaryId = useId();

  function resetForm() {
    setSummary("");
    setTitle("");
    setSourceType("");
    setSourceName("");
    setCategory("");
    setLearnedAt(defaultLearnedAt);
    setImportance("3");
    setTags("");
    setNotes("");
    setShowDetails(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onSubmit({
      summary,
      title: title.trim() || null,
      sourceType: sourceType || null,
      sourceName: sourceName.trim() || null,
      category: category || null,
      learnedAt,
      importance: Number(importance),
      tags,
      notes: notes.trim() || null,
    });

    resetForm();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border-soft bg-surface p-4 shadow-sm md:p-5"
    >
      <label htmlFor={summaryId} className="block text-sm font-medium text-foreground">
        What did you learn today?
      </label>
      <textarea
        id={summaryId}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        rows={5}
        required
        disabled={disabled}
        placeholder="A insight from a museum visit, podcast, conversation, book, or everyday life..."
        className="ui-textarea mt-3 min-h-[8rem] w-full resize-y text-base leading-relaxed"
        dir="auto"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDetails((current) => !current)}
          disabled={disabled}
          {...passwordManagerSafeControlProps}
          className="text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
        >
          {showDetails ? "Hide details" : "Add details"}
        </button>
      </div>

      {showDetails ? (
        <div className="mt-4 grid gap-4 border-t border-border-soft pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Title</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={disabled}
                placeholder="Optional short title"
                className="ui-input w-full"
                dir="auto"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">When</span>
              <input
                type="date"
                value={learnedAt}
                onChange={(event) => setLearnedAt(event.target.value)}
                disabled={disabled}
                className="ui-input w-full"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Source type</span>
              <select
                value={sourceType}
                onChange={(event) =>
                  setSourceType(event.target.value as LearningSourceTypeValue | "")
                }
                disabled={disabled}
                className="ui-input w-full"
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
                disabled={disabled}
                placeholder="Book title, museum, channel, person..."
                className="ui-input w-full"
                dir="auto"
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
                disabled={disabled}
                className="ui-input w-full"
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
              <span className="text-xs font-medium text-muted">Importance</span>
              <select
                value={importance}
                onChange={(event) => setImportance(event.target.value)}
                disabled={disabled}
                className="ui-input w-full"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} / 5
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Tags</span>
            <input
              type="text"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              disabled={disabled}
              placeholder="museum, improv, career"
              className="ui-input w-full"
              dir="auto"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={disabled}
              rows={3}
              placeholder="Optional extra context or follow-ups"
              className="ui-textarea w-full resize-y"
              dir="auto"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={disabled || !summary.trim()}
          className="ui-btn-primary min-h-11 px-5 disabled:opacity-50"
        >
          Save learning
        </button>
      </div>
    </form>
  );
}
