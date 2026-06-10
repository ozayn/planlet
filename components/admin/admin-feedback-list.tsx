"use client";

import type {
  FeedbackArea,
  FeedbackPriority,
  FeedbackStatus,
} from "@/app/generated/prisma/client";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteFeedbackAction,
  updateFeedbackPriorityAction,
  updateFeedbackStatusAction,
} from "@/app/(app)/feedback/actions";
import { APP_TIMEZONE } from "@/config/time";
import {
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
} from "@/lib/feedback-constants";
import {
  getFeedbackAreaLabel,
  getFeedbackPriorityLabel,
  getFeedbackStatusLabel,
} from "@/lib/feedback-labels";
import type { SerializedFeedback } from "@/lib/feedback";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type AdminFeedbackListProps = {
  items: SerializedFeedback[];
};

function formatFeedbackDate(value: string): string {
  const date = toZonedTime(new Date(value), APP_TIMEZONE);
  return format(date, "MMM d, yyyy · h:mm a");
}

export function AdminFeedbackList({ items }: AdminFeedbackListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(feedbackId: string, status: FeedbackStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateFeedbackStatusAction(feedbackId, status);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handlePriorityChange(
    feedbackId: string,
    priority: FeedbackPriority,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await updateFeedbackPriorityAction(feedbackId, priority);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(feedbackId: string) {
    if (!window.confirm("Delete this feedback?")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteFeedbackAction(feedbackId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">No feedback yet.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border-soft bg-surface px-3 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground" dir="auto">
                  {item.title?.trim() || getFeedbackAreaLabel(item.area)}
                </p>
                <p className="text-xs text-muted" dir="auto">
                  {item.authorName?.trim() || item.authorEmail || "Unknown user"}
                  {" · "}
                  {formatFeedbackDate(item.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={item.status}
                  disabled={isPending}
                  onChange={(event) =>
                    handleStatusChange(
                      item.id,
                      event.target.value as FeedbackStatus,
                    )
                  }
                  {...passwordManagerSafeControlProps}
                  className="ui-input ui-input-compact min-h-8 text-xs"
                  aria-label="Feedback status"
                >
                  {FEEDBACK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {getFeedbackStatusLabel(status)}
                    </option>
                  ))}
                </select>
                <select
                  value={item.priority}
                  disabled={isPending}
                  onChange={(event) =>
                    handlePriorityChange(
                      item.id,
                      event.target.value as FeedbackPriority,
                    )
                  }
                  {...passwordManagerSafeControlProps}
                  className="ui-input ui-input-compact min-h-8 text-xs"
                  aria-label="Feedback priority"
                >
                  {FEEDBACK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {getFeedbackPriorityLabel(priority)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground" dir="auto">
              {item.body}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-light">
              <span>{getFeedbackAreaLabel(item.area)}</span>
              {item.pagePath ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span dir="ltr">{item.pagePath}</span>
                </>
              ) : null}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={isPending}
                {...passwordManagerSafeControlProps}
                className="ui-btn-ghost min-h-8 px-2 text-xs text-muted"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}
    </div>
  );
}
