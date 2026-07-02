"use client";

import { useId, useState } from "react";

import { LearningThemesField } from "@/components/learning/learning-themes-field";
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
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [sourceType, setSourceType] = useState<LearningSourceTypeValue | "">("");
  const [sourceName, setSourceName] = useState("");
  const [category, setCategory] = useState<LearningCategoryValue | "">("");
  const [learnedAt, setLearnedAt] = useState(defaultLearnedAt);
  const [importance, setImportance] = useState("3");
  const [themes, setThemes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const titleId = useId();
  const summaryId = useId();

  const hasContent = Boolean(title.trim() || summary.trim() || notes.trim());

  function resetForm() {
    setTitle("");
    setSummary("");
    setSourceType("");
    setSourceName("");
    setCategory("");
    setLearnedAt(defaultLearnedAt);
    setImportance("3");
    setThemes([]);
    setNotes("");
    setShowDetails(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasContent) {
      return;
    }

    onSubmit({
      title: title.trim() || null,
      summary: summary.trim() || null,
      sourceType: sourceType || null,
      sourceName: sourceName.trim() || null,
      category: category || null,
      learnedAt,
      importance: Number(importance),
      themes,
      notes: notes.trim() || null,
    });

    resetForm();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border-soft bg-surface p-4 shadow-sm md:p-5"
    >
      <label htmlFor={titleId} className="block space-y-1.5">
        <span className="text-xs font-medium text-muted">Title</span>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={disabled}
          placeholder="Optional short title"
          className="ui-input w-full"
          dir="auto"
          {...passwordManagerSafeControlProps}
        />
      </label>

      <label htmlFor={summaryId} className="mt-4 block text-sm font-medium text-foreground">
        What did you learn today?
      </label>
      <textarea
        id={summaryId}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        rows={5}
        disabled={disabled}
        placeholder="An insight from a museum visit, podcast, conversation, book, or everyday life..."
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

          <LearningThemesField
            themes={themes}
            onThemesChange={setThemes}
            disabled={disabled}
          />

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

      {!hasContent ? (
        <p className="mt-3 text-xs text-muted">
          Add a title, learning text, or notes to save.
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={disabled || !hasContent}
          className="ui-btn-primary min-h-11 px-5 disabled:opacity-50"
        >
          Save learning
        </button>
      </div>
    </form>
  );
}
