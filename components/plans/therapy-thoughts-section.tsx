"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

import {
  addTherapyThoughtAction,
  deleteTherapyThoughtAction,
  updateTherapyThoughtAction,
} from "@/app/(app)/plans/actions";
import { PrivateEntryActionsMenu } from "@/components/plans/private-entry-actions-menu";
import { ChevronDownIcon, LockIcon } from "@/components/ui/action-icons";
import { ActionErrorBanner } from "@/components/ui/action-error-banner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { APP_TIMEZONE } from "@/config/time";
import { ACTION_LABELS } from "@/lib/action-labels";
import {
  getMutationError,
  invokeServerAction,
  unwrapMutationSuccess,
} from "@/lib/invoke-server-action";
import type { SerializedTherapyThought } from "@/lib/therapy-thoughts";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import {
  focusQuickAddInput,
  preventQuickAddButtonBlur,
  shouldSubmitTextareaOnEnter,
} from "@/lib/textarea-keydown";

type TherapyThoughtsSectionProps = {
  planId: string;
  thoughts: SerializedTherapyThought[];
};

function formatThoughtTime(value: string): string {
  const date = toZonedTime(new Date(value), APP_TIMEZONE);
  return format(date, "MMM d · h:mm a");
}

export function TherapyThoughtsSection({
  planId,
  thoughts: initialThoughts,
}: TherapyThoughtsSectionProps) {
  const router = useRouter();
  const panelId = useId();
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const [thoughts, setThoughts] =
    useState<SerializedTherapyThought[]>(initialThoughts);
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [isSubmitting, startSubmit] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setThoughts(initialThoughts);
  }, [initialThoughts]);

  useEffect(() => {
    if (!editingId) {
      return;
    }

    requestAnimationFrame(() => {
      editInputRef.current?.focus();
    });
  }, [editingId]);

  const collapsedCount = String(thoughts.length);

  function handleAdd(textOverride?: string) {
    const textToSubmit = (textOverride ?? body).trim();
    if (!textToSubmit) {
      return;
    }

    setError(null);

    startSubmit(async () => {
      const invoked = await invokeServerAction(() =>
        addTherapyThoughtAction(planId, textToSubmit),
      );
      const mutationError = getMutationError(invoked);
      if (mutationError) {
        setError(mutationError.message);
        return;
      }
      const result = unwrapMutationSuccess(invoked);
      if (!result) {
        return;
      }

      setBody("");
      setExpanded(true);
      setThoughts((current) => [...current, result.thought]);
      router.refresh();
      focusQuickAddInput(bodyInputRef);
    });
  }

  function handleBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!shouldSubmitTextareaOnEnter(event)) {
      return;
    }

    event.preventDefault();

    if (!body.trim() || isSubmitting) {
      return;
    }

    handleAdd();
  }

  function startEdit(thought: SerializedTherapyThought) {
    setEditingId(thought.id);
    setEditBody(thought.body);
    setError(null);
    setExpanded(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
    setError(null);
  }

  function handleSaveEdit(thoughtId: string, textOverride?: string) {
    const textToSubmit = (textOverride ?? editBody).trim();
    if (!textToSubmit) {
      return;
    }

    setError(null);

    startSubmit(async () => {
      const invoked = await invokeServerAction(() =>
        updateTherapyThoughtAction(thoughtId, textToSubmit),
      );
      const mutationError = getMutationError(invoked);
      if (mutationError) {
        setError(mutationError.message);
        return;
      }
      const result = unwrapMutationSuccess(invoked);
      if (!result) {
        return;
      }

      setThoughts((current) =>
        current.map((entry) =>
          entry.id === thoughtId ? result.thought : entry,
        ),
      );
      setEditingId(null);
      setEditBody("");
      router.refresh();
    });
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    thoughtId: string,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }

    if (!shouldSubmitTextareaOnEnter(event)) {
      return;
    }

    event.preventDefault();

    if (!editBody.trim() || isSubmitting) {
      return;
    }

    handleSaveEdit(thoughtId);
  }

  function handleDelete(thoughtId: string) {
    setError(null);
    setDeletingId(thoughtId);

    void invokeServerAction(() => deleteTherapyThoughtAction(thoughtId)).then(
      (invoked) => {
        setDeletingId(null);
        setConfirmDeleteId(null);

        const mutationError = getMutationError(invoked);
        if (mutationError) {
          setError(mutationError.message);
          return;
        }
        if (!unwrapMutationSuccess(invoked)) {
          return;
        }

        setThoughts((current) =>
          current.filter((entry) => entry.id !== thoughtId),
        );
        router.refresh();
      },
    );
  }

  return (
    <section className="ui-observations-disclosure border-t border-border-soft pt-2 md:pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={ACTION_LABELS.therapyThoughts.ariaLabel}
        title={ACTION_LABELS.therapyThoughts.title}
        onClick={() => setExpanded((current) => !current)}
        {...passwordManagerSafeControlProps}
        className="ui-observations-disclosure-summary flex w-full min-h-10 items-center justify-between gap-3 rounded-lg text-start transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <LockIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate text-sm text-foreground">
            <span aria-hidden="true">🧠 </span>
            Therapy thoughts
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-muted">
          {thoughts.length > 0 ? (
            <span className="text-xs tabular-nums">{collapsedCount}</span>
          ) : null}
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      {expanded ? (
        <div id={panelId} className="mt-2 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 space-y-1">
              <textarea
                ref={bodyInputRef}
                id="therapy-thought-body"
                name="therapyThoughtBody"
                {...passwordManagerSafeControlProps}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleBodyKeyDown}
                placeholder="Topic, insight, question, dream, or experience…"
                rows={2}
                dir="auto"
                enterKeyHint="send"
                aria-label="Add a therapy thought"
                className="ui-input min-h-9 w-full resize-y py-2"
              />
            </div>
            <button
              type="button"
              onMouseDown={preventQuickAddButtonBlur}
              onClick={() => handleAdd()}
              disabled={isSubmitting || !body.trim()}
              aria-label="Add therapy thought"
              {...passwordManagerSafeControlProps}
              className="ui-btn-secondary ui-btn-compact min-h-9 shrink-0 px-4"
            >
              Add
            </button>
          </div>

          {thoughts.length > 0 ? (
            <ul className="divide-y divide-border-soft/70">
              {thoughts.map((thought) =>
                editingId === thought.id ? (
                  <li key={thought.id} className="space-y-2 py-2.5">
                    <textarea
                      ref={editInputRef}
                      id={`therapy-thought-edit-${thought.id}`}
                      name={`therapyThoughtEdit-${thought.id}`}
                      {...passwordManagerSafeControlProps}
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      onKeyDown={(event) =>
                        handleEditKeyDown(event, thought.id)
                      }
                      rows={2}
                      dir="auto"
                      aria-label={ACTION_LABELS.editTherapyThought.ariaLabel}
                      className="ui-input min-h-9 w-full resize-y py-2"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(thought.id)}
                        disabled={isSubmitting || !editBody.trim()}
                        {...passwordManagerSafeControlProps}
                        className="ui-btn-secondary ui-btn-compact min-h-8 px-3 text-xs"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        {...passwordManagerSafeControlProps}
                        className="ui-btn-ghost ui-btn-compact min-h-8 px-3 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </li>
                ) : (
                  <li
                    key={thought.id}
                    className="flex items-start justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => startEdit(thought)}
                        {...passwordManagerSafeControlProps}
                        className="w-full rounded-md text-start transition-colors hover:bg-accent-cream/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        aria-label={ACTION_LABELS.editTherapyThought.ariaLabel}
                      >
                        <p
                          className="whitespace-pre-wrap text-sm text-foreground"
                          dir="auto"
                        >
                          {thought.body}
                        </p>
                      </button>
                      <p className="mt-0.5 text-xs text-muted-light">
                        {formatThoughtTime(thought.createdAt)}
                      </p>
                    </div>
                    <PrivateEntryActionsMenu
                      onEdit={() => startEdit(thought)}
                      onDelete={() => setConfirmDeleteId(thought.id)}
                      more={ACTION_LABELS.moreTherapyThought}
                      edit={ACTION_LABELS.editTherapyThought}
                      delete={ACTION_LABELS.deleteTherapyThought}
                      deleting={deletingId === thought.id}
                    />
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted">No therapy thoughts yet.</p>
          )}

          {error ? <ActionErrorBanner message={error} /> : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this therapy thought?"
        confirmLabel={ACTION_LABELS.deleteTherapyThought.title}
        onConfirm={() => {
          if (confirmDeleteId) {
            handleDelete(confirmDeleteId);
          }
        }}
        onCancel={() => {
          if (!deletingId) {
            setConfirmDeleteId(null);
          }
        }}
        isConfirming={deletingId !== null}
        confirmDanger
      >
        <p>This cannot be undone.</p>
      </ConfirmDialog>
    </section>
  );
}
