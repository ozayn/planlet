"use client";

import { useId, useRef, useState } from "react";

import {
  IDEA_CATEGORIES,
  IDEA_CATEGORY_LABELS,
  parseIdeaTagsInput,
  type CreateIdeaInput,
  type IdeaCategoryValue,
} from "@/lib/ideas/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type IdeaCaptureFormProps = {
  defaultIdeaDate: string;
  disabled?: boolean;
  onSubmit: (input: CreateIdeaInput) => void;
};

export function IdeaCaptureForm({
  defaultIdeaDate,
  disabled = false,
  onSubmit,
}: IdeaCaptureFormProps) {
  const [content, setContent] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [title, setTitle] = useState("");
  const [ideaDate, setIdeaDate] = useState(defaultIdeaDate);
  const [category, setCategory] = useState<IdeaCategoryValue | "">("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const contentId = useId();

  const hasContent = Boolean(content.trim() || title.trim() || notes.trim());

  function resetForm() {
    setContent("");
    setTitle("");
    setIdeaDate(defaultIdeaDate);
    setCategory("");
    setTagsInput("");
    setNotes("");
    setShowDetails(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasContent) {
      return;
    }

    onSubmit({
      content: content.trim() || null,
      title: title.trim() || null,
      category: category || null,
      tags: parseIdeaTagsInput(tagsInput),
      notes: notes.trim() || null,
      ideaDate,
    });

    resetForm();
    contentRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border-soft bg-surface p-4 shadow-sm md:p-5"
    >
      <label htmlFor={contentId} className="sr-only">
        What idea is on your mind?
      </label>
      <textarea
        id={contentId}
        ref={contentRef}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={5}
        disabled={disabled}
        placeholder="What idea is on your mind?"
        className="ui-textarea min-h-[8rem] w-full resize-y text-base leading-relaxed"
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
            <span className="text-xs font-medium text-muted">Title</span>
            <input
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

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Date</span>
              <input
                type="date"
                value={ideaDate}
                onChange={(event) => setIdeaDate(event.target.value)}
                disabled={disabled}
                className="ui-input w-full"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Category</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as IdeaCategoryValue | "")
                }
                disabled={disabled}
                className="ui-input w-full"
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

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Tags</span>
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              disabled={disabled}
              placeholder="Comma-separated, e.g. side-project, ai"
              className="ui-input w-full"
              dir="auto"
              {...passwordManagerSafeControlProps}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={disabled}
              rows={3}
              placeholder="Optional extra context or next steps"
              className="ui-textarea w-full resize-y"
              dir="auto"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={disabled || !hasContent}
          className="ui-btn-primary min-h-11 px-5 disabled:opacity-50"
        >
          Save idea
        </button>
      </div>
    </form>
  );
}
