"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  addItemCommentAction,
  deleteItemCommentAction,
  getItemCommentsAction,
  type SerializedItemComment,
} from "@/app/(app)/plans/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import { UserAvatar } from "@/components/user-avatar";
import { APP_TIMEZONE } from "@/config/time";
import { MAX_ITEM_COMMENT_LENGTH } from "@/lib/item-comment-constants";

type ItemCommentsPanelProps = {
  itemId: string;
  itemTitle: string;
  open: boolean;
  onClose: () => void;
};

function formatCommentTime(value: string): string {
  const date = toZonedTime(new Date(value), APP_TIMEZONE);
  return format(date, "MMM d, yyyy · h:mm a");
}

function authorLabel(comment: SerializedItemComment): string {
  return comment.author.name?.trim() || comment.author.email?.trim() || "User";
}

export function ItemCommentsPanel({
  itemId,
  itemTitle,
  open,
  onClose,
}: ItemCommentsPanelProps) {
  const router = useRouter();
  const [comments, setComments] = useState<SerializedItemComment[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBody("");
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void getItemCommentsAction(itemId).then((result) => {
      if (cancelled) return;

      if (!result.success) {
        setError(result.error);
        setComments([]);
      } else {
        setComments(result.comments);
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, itemId]);

  function handleAddComment() {
    setError(null);

    startSubmit(async () => {
      const result = await addItemCommentAction(itemId, body);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBody("");
      setComments((current) => [...current, result.comment]);
      router.refresh();
    });
  }

  function handleDelete(commentId: string) {
    setError(null);
    setDeletingId(commentId);

    void deleteItemCommentAction(commentId).then((result) => {
      setDeletingId(null);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setComments((current) =>
        current.filter((comment) => comment.id !== commentId),
      );
      router.refresh();
    });
  }

  return (
    <SimpleSheet
      open={open}
      onClose={onClose}
      title="Comments"
      footer={
        <div className="space-y-2">
          <label htmlFor={`comment-${itemId}`} className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Add a comment</span>
            <textarea
              id={`comment-${itemId}`}
              name={`comment-${itemId}`}
              value={body}
              dir="auto"
              rows={2}
              maxLength={MAX_ITEM_COMMENT_LENGTH}
              placeholder="Add a comment…"
              onChange={(event) => setBody(event.target.value)}
              className="ui-textarea min-h-16"
            />
          </label>
          {error ? (
            <p className="text-sm text-accent-red" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={isSubmitting || !body.trim()}
            onClick={handleAddComment}
            className="ui-btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? "Adding…" : "Add comment"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted" dir="auto">
          {itemTitle}
        </p>

        {isLoading ? (
          <p className="text-sm text-muted">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-xl border border-border-soft bg-accent-cream/20 px-3 py-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <UserAvatar
                    name={comment.author.name}
                    email={comment.author.email}
                    image={comment.author.image}
                    size="xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-medium text-foreground"
                          dir="auto"
                        >
                          {authorLabel(comment)}
                        </p>
                        <p className="text-[0.6875rem] text-muted-light">
                          {formatCommentTime(comment.createdAt)}
                        </p>
                      </div>
                      {comment.canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          disabled={deletingId === comment.id}
                          className="ui-btn-ghost min-h-10 min-w-10 px-2 text-xs"
                          aria-label="Delete comment"
                        >
                          {deletingId === comment.id ? "…" : "Delete"}
                        </button>
                      ) : null}
                    </div>
                    <p
                      className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                      dir="auto"
                    >
                      {comment.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SimpleSheet>
  );
}
