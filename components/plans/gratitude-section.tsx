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
  addPlanGratitudeAction,
  deletePlanGratitudeAction,
  updatePlanGratitudeAction,
} from "@/app/(app)/plans/actions";
import { PrivateEntryActionsMenu } from "@/components/plans/private-entry-actions-menu";
import { ChevronDownIcon, LockIcon, SparklesIcon } from "@/components/ui/action-icons";
import { ActionErrorBanner } from "@/components/ui/action-error-banner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { APP_TIMEZONE } from "@/config/time";
import { ACTION_LABELS } from "@/lib/action-labels";
import {
  getMutationError,
  invokeServerAction,
  unwrapMutationSuccess,
} from "@/lib/invoke-server-action";
import type { SerializedGratitude } from "@/lib/gratitude";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import {
  focusQuickAddInput,
  preventQuickAddButtonBlur,
  shouldSubmitTextareaOnEnter,
} from "@/lib/textarea-keydown";

type GratitudeSectionProps = {
  planId: string;
  gratitudes: SerializedGratitude[];
};

function formatGratitudeTime(value: string): string {
  const date = toZonedTime(new Date(value), APP_TIMEZONE);
  return format(date, "MMM d · h:mm a");
}

export function GratitudeSection({
  planId,
  gratitudes: initialGratitudes,
}: GratitudeSectionProps) {
  const router = useRouter();
  const panelId = useId();
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const [gratitudes, setGratitudes] =
    useState<SerializedGratitude[]>(initialGratitudes);
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [isSubmitting, startSubmit] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setGratitudes(initialGratitudes);
  }, [initialGratitudes]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile && initialGratitudes.length > 0) {
      setExpanded(true);
    }
  }, [initialGratitudes.length]);

  useEffect(() => {
    if (!editingId) {
      return;
    }

    requestAnimationFrame(() => {
      editInputRef.current?.focus();
    });
  }, [editingId]);

  const collapsedCount = String(gratitudes.length);

  function handleAdd(textOverride?: string) {
    const textToSubmit = (textOverride ?? body).trim();
    if (!textToSubmit) {
      return;
    }

    setError(null);

    startSubmit(async () => {
      const invoked = await invokeServerAction(() =>
        addPlanGratitudeAction(planId, textToSubmit),
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
      setGratitudes((current) => [...current, result.gratitude]);
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

  function startEdit(gratitude: SerializedGratitude) {
    setEditingId(gratitude.id);
    setEditBody(gratitude.body);
    setError(null);
    setExpanded(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
    setError(null);
  }

  function handleSaveEdit(gratitudeId: string, textOverride?: string) {
    const textToSubmit = (textOverride ?? editBody).trim();
    if (!textToSubmit) {
      return;
    }

    setError(null);

    startSubmit(async () => {
      const invoked = await invokeServerAction(() =>
        updatePlanGratitudeAction(gratitudeId, textToSubmit),
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

      setGratitudes((current) =>
        current.map((entry) =>
          entry.id === gratitudeId ? result.gratitude : entry,
        ),
      );
      setEditingId(null);
      setEditBody("");
      router.refresh();
    });
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    gratitudeId: string,
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

    handleSaveEdit(gratitudeId);
  }

  function handleDelete(gratitudeId: string) {
    setError(null);
    setDeletingId(gratitudeId);

    void invokeServerAction(() => deletePlanGratitudeAction(gratitudeId)).then(
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

        setGratitudes((current) =>
          current.filter((entry) => entry.id !== gratitudeId),
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
        aria-label={ACTION_LABELS.gratitude.ariaLabel}
        title={ACTION_LABELS.gratitude.title}
        onClick={() => setExpanded((current) => !current)}
        {...passwordManagerSafeControlProps}
        className="ui-observations-disclosure-summary flex w-full min-h-10 items-center justify-between gap-3 rounded-lg text-start transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <LockIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate text-sm text-foreground">Gratitude</span>
          <SparklesIcon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-muted">
          {gratitudes.length > 0 ? (
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
                id="gratitude-body"
                name="gratitudeBody"
                {...passwordManagerSafeControlProps}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleBodyKeyDown}
                placeholder="What are you grateful for?"
                rows={2}
                dir="auto"
                enterKeyHint="send"
                aria-label="What are you grateful for?"
                className="ui-input min-h-9 w-full resize-y py-2"
              />
              <p className="hidden text-xs text-muted-light sm:block">
                Enter to add · Shift+Enter for a new line
              </p>
            </div>
            <button
              type="button"
              onMouseDown={preventQuickAddButtonBlur}
              onClick={() => handleAdd()}
              disabled={isSubmitting || !body.trim()}
              aria-label="Add gratitude"
              {...passwordManagerSafeControlProps}
              className="ui-btn-secondary ui-btn-compact min-h-9 shrink-0 px-4"
            >
              Add
            </button>
          </div>

          {gratitudes.length > 0 ? (
            <ul className="divide-y divide-border-soft/70">
              {gratitudes.map((gratitude) =>
                editingId === gratitude.id ? (
                  <li key={gratitude.id} className="space-y-2 py-2.5">
                    <textarea
                      ref={editInputRef}
                      id={`gratitude-edit-body-${gratitude.id}`}
                      name={`gratitudeEditBody-${gratitude.id}`}
                      {...passwordManagerSafeControlProps}
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      onKeyDown={(event) => handleEditKeyDown(event, gratitude.id)}
                      rows={2}
                      dir="auto"
                      aria-label={ACTION_LABELS.editGratitude.ariaLabel}
                      className="ui-input min-h-9 w-full resize-y py-2"
                    />
                    <p className="hidden text-xs text-muted-light sm:block">
                      Enter to save · Shift+Enter for a new line
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(gratitude.id)}
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
                    key={gratitude.id}
                    className="flex items-start justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="whitespace-pre-wrap text-sm text-foreground"
                        dir="auto"
                      >
                        {gratitude.body}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-light">
                        {formatGratitudeTime(gratitude.createdAt)}
                      </p>
                    </div>
                    <PrivateEntryActionsMenu
                      onEdit={() => startEdit(gratitude)}
                      onDelete={() => setConfirmDeleteId(gratitude.id)}
                      more={ACTION_LABELS.moreGratitude}
                      edit={ACTION_LABELS.editGratitude}
                      delete={ACTION_LABELS.deleteGratitude}
                      deleting={deletingId === gratitude.id}
                    />
                  </li>
                ),
              )}
            </ul>
          ) : null}

          {error ? <ActionErrorBanner message={error} /> : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this gratitude?"
        confirmLabel={ACTION_LABELS.deleteGratitude.title}
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
