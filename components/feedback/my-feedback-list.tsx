"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { APP_TIMEZONE } from "@/config/time";
import {
  getFeedbackAreaLabel,
  getFeedbackPriorityLabel,
  getFeedbackStatusLabel,
} from "@/lib/feedback-labels";
import type { SerializedFeedback } from "@/lib/feedback";

type MyFeedbackListProps = {
  items: SerializedFeedback[];
};

function formatFeedbackDate(value: string): string {
  const date = toZonedTime(new Date(value), APP_TIMEZONE);
  return format(date, "MMM d, yyyy");
}

function previewText(item: SerializedFeedback): string {
  if (item.title?.trim()) {
    return item.title.trim();
  }

  const body = item.body.trim();
  if (body.length <= 120) {
    return body;
  }

  return `${body.slice(0, 117)}…`;
}

export function MyFeedbackList({ items }: MyFeedbackListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">No feedback yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-border-soft/80 bg-surface/60 px-3 py-2.5"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-light">
            <span>{getFeedbackStatusLabel(item.status)}</span>
            <span aria-hidden="true">·</span>
            <span>{getFeedbackAreaLabel(item.area)}</span>
            {item.priority === "HIGH" ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-accent-red">
                  {getFeedbackPriorityLabel(item.priority)}
                </span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{formatFeedbackDate(item.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-foreground" dir="auto">
            {previewText(item)}
          </p>
          {item.title?.trim() ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted" dir="auto">
              {item.body}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
