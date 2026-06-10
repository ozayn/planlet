"use client";

import type {
  FeedbackArea,
  FeedbackPriority,
} from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitFeedbackAction } from "@/app/(app)/feedback/actions";
import {
  FEEDBACK_AREAS,
  FEEDBACK_PRIORITIES,
} from "@/lib/feedback-constants";
import {
  getFeedbackAreaLabel,
  getFeedbackPriorityLabel,
} from "@/lib/feedback-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type FeedbackFormProps = {
  initialPagePath?: string | null;
};

export function FeedbackForm({ initialPagePath }: FeedbackFormProps) {
  const router = useRouter();
  const [area, setArea] = useState<FeedbackArea>("UI");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<FeedbackPriority>("NORMAL");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  function handleSubmit() {
    setError(null);

    startSubmit(async () => {
      const result = await submitFeedbackAction({
        area,
        body,
        title: title.trim() || null,
        pagePath: initialPagePath ?? null,
        priority,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setTitle("");
      setBody("");
      setPriority("NORMAL");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-muted">Area</span>
          <select
            id="feedback-area"
            name="feedbackArea"
            {...passwordManagerSafeControlProps}
            value={area}
            onChange={(event) => setArea(event.target.value as FeedbackArea)}
            className="ui-input ui-input-compact min-h-9 w-full"
            aria-label="Feedback area"
          >
            {FEEDBACK_AREAS.map((value) => (
              <option key={value} value={value}>
                {getFeedbackAreaLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Priority</span>
          <select
            id="feedback-priority"
            name="feedbackPriority"
            {...passwordManagerSafeControlProps}
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as FeedbackPriority)
            }
            className="ui-input ui-input-compact min-h-9 w-full"
            aria-label="Feedback priority"
          >
            {FEEDBACK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {getFeedbackPriorityLabel(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Title (optional)</span>
        <input
          id="feedback-title"
          name="feedbackTitle"
          {...passwordManagerSafeControlProps}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="ui-input ui-input-compact min-h-9 w-full"
          aria-label="Feedback title"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Feedback</span>
        <textarea
          id="feedback-body"
          name="feedbackBody"
          {...passwordManagerSafeControlProps}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What should be improved?"
          rows={4}
          dir="auto"
          aria-label="What should be improved?"
          className="ui-input min-h-24 w-full resize-y py-2"
        />
      </label>

      {initialPagePath ? (
        <p className="text-xs text-muted-light">
          From page: <span dir="ltr">{initialPagePath}</span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !body.trim()}
        {...passwordManagerSafeControlProps}
        className="ui-btn-secondary ui-btn-compact min-h-9 px-4"
      >
        Save feedback
      </button>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
    </div>
  );
}
