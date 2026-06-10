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

import type { ObservationCategory } from "@/app/generated/prisma/client";
import {
  addPlanObservationAction,
  deletePlanObservationAction,
  updatePlanObservationAction,
} from "@/app/(app)/plans/actions";
import { PrivateEntryActionsMenu } from "@/components/plans/private-entry-actions-menu";
import { ChevronDownIcon, LockIcon } from "@/components/ui/action-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { APP_TIMEZONE } from "@/config/time";
import { ACTION_LABELS } from "@/lib/action-labels";
import { OBSERVATION_CATEGORIES } from "@/lib/observation-constants";
import { getObservationCategoryLabel } from "@/lib/observation-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { SerializedObservation } from "@/lib/observations";
import { shouldSubmitTextareaOnEnter } from "@/lib/textarea-keydown";

type PrivateObservationsSectionProps = {
  planId: string;
  observations: SerializedObservation[];
};

function formatObservationTime(value: string): string {
  const date = toZonedTime(new Date(value), APP_TIMEZONE);
  return format(date, "MMM d · h:mm a");
}

export function PrivateObservationsSection({
  planId,
  observations: initialObservations,
}: PrivateObservationsSectionProps) {
  const router = useRouter();
  const panelId = useId();
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const [observations, setObservations] =
    useState<SerializedObservation[]>(initialObservations);
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<ObservationCategory>("BODY");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] =
    useState<ObservationCategory>("BODY");
  const [editBody, setEditBody] = useState("");
  const [isSubmitting, startSubmit] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setObservations(initialObservations);
  }, [initialObservations]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile && initialObservations.length > 0) {
      setExpanded(true);
    }
  }, [initialObservations.length]);

  useEffect(() => {
    if (!editingId) {
      return;
    }

    requestAnimationFrame(() => {
      editInputRef.current?.focus();
    });
  }, [editingId]);

  const collapsedCount = String(observations.length);

  function handleAdd(textOverride?: string) {
    const textToSubmit = (textOverride ?? body).trim();
    if (!textToSubmit) {
      return;
    }

    setError(null);

    startSubmit(async () => {
      const result = await addPlanObservationAction(planId, {
        category,
        body: textToSubmit,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBody("");
      setExpanded(true);
      setObservations((current) => [...current, result.observation]);
      router.refresh();
      requestAnimationFrame(() => {
        bodyInputRef.current?.focus();
      });
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

  function startEdit(observation: SerializedObservation) {
    setEditingId(observation.id);
    setEditCategory(observation.category);
    setEditBody(observation.body);
    setError(null);
    setExpanded(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
    setError(null);
  }

  function handleSaveEdit(observationId: string, textOverride?: string) {
    const textToSubmit = (textOverride ?? editBody).trim();
    if (!textToSubmit) {
      return;
    }

    setError(null);

    startSubmit(async () => {
      const result = await updatePlanObservationAction(observationId, {
        category: editCategory,
        body: textToSubmit,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setObservations((current) =>
        current.map((entry) =>
          entry.id === observationId ? result.observation : entry,
        ),
      );
      setEditingId(null);
      setEditBody("");
      router.refresh();
    });
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    observationId: string,
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

    handleSaveEdit(observationId);
  }

  function handleDelete(observationId: string) {
    setError(null);
    setDeletingId(observationId);

    void deletePlanObservationAction(observationId).then((result) => {
      setDeletingId(null);
      setConfirmDeleteId(null);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setObservations((current) =>
        current.filter((entry) => entry.id !== observationId),
      );
      router.refresh();
    });
  }

  return (
    <section className="ui-observations-disclosure border-t border-border-soft pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={ACTION_LABELS.privateObservations.ariaLabel}
        title={ACTION_LABELS.privateObservations.title}
        onClick={() => setExpanded((current) => !current)}
        {...passwordManagerSafeControlProps}
        className="ui-observations-disclosure-summary flex w-full min-h-10 items-center justify-between gap-3 rounded-lg text-start transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <LockIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="truncate text-sm text-foreground">
            Private observations
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-muted">
          {observations.length > 0 ? (
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
            <select
              id="observation-category"
              name="observationCategory"
              {...passwordManagerSafeControlProps}
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as ObservationCategory)
              }
              className="ui-input ui-input-compact min-h-9 w-full sm:w-36"
              aria-label="Observation category"
            >
              {OBSERVATION_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {getObservationCategoryLabel(value)}
                </option>
              ))}
            </select>
            <div className="min-w-0 flex-1 space-y-1">
              <textarea
                ref={bodyInputRef}
                id="observation-body"
                name="observationBody"
                {...passwordManagerSafeControlProps}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleBodyKeyDown}
                placeholder="What did you notice?"
                rows={2}
                dir="auto"
                aria-label="What did you notice?"
                className="ui-input min-h-9 w-full resize-y py-2"
              />
              <p className="text-xs text-muted-light">
                Enter to add · Shift+Enter for a new line
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAdd()}
              disabled={isSubmitting || !body.trim()}
              {...passwordManagerSafeControlProps}
              className="ui-btn-secondary ui-btn-compact min-h-9 shrink-0 px-4"
            >
              Add
            </button>
          </div>

          {observations.length > 0 ? (
            <ul className="divide-y divide-border-soft/70">
              {observations.map((observation) =>
                editingId === observation.id ? (
                  <li key={observation.id} className="space-y-2 py-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        id={`observation-edit-category-${observation.id}`}
                        name={`observationEditCategory-${observation.id}`}
                        {...passwordManagerSafeControlProps}
                        value={editCategory}
                        onChange={(event) =>
                          setEditCategory(
                            event.target.value as ObservationCategory,
                          )
                        }
                        className="ui-input ui-input-compact min-h-9 w-full sm:w-36"
                        aria-label="Edit observation category"
                      >
                        {OBSERVATION_CATEGORIES.map((value) => (
                          <option key={value} value={value}>
                            {getObservationCategoryLabel(value)}
                          </option>
                        ))}
                      </select>
                      <div className="min-w-0 flex-1 space-y-1">
                        <textarea
                          ref={editInputRef}
                          id={`observation-edit-body-${observation.id}`}
                          name={`observationEditBody-${observation.id}`}
                          {...passwordManagerSafeControlProps}
                          value={editBody}
                          onChange={(event) => setEditBody(event.target.value)}
                          onKeyDown={(event) =>
                            handleEditKeyDown(event, observation.id)
                          }
                          rows={2}
                          dir="auto"
                          aria-label={ACTION_LABELS.editObservation.ariaLabel}
                          className="ui-input min-h-9 w-full resize-y py-2"
                        />
                        <p className="text-xs text-muted-light">
                          Enter to save · Shift+Enter for a new line
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(observation.id)}
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
                    key={observation.id}
                    className="flex items-start justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground" dir="auto">
                        <span className="text-muted-light">
                          {getObservationCategoryLabel(observation.category)}
                        </span>
                        <span className="text-muted-light"> · </span>
                        <span className="whitespace-pre-wrap">
                          {observation.body}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-light">
                        {formatObservationTime(observation.createdAt)}
                      </p>
                    </div>
                    <PrivateEntryActionsMenu
                      onEdit={() => startEdit(observation)}
                      onDelete={() => setConfirmDeleteId(observation.id)}
                      more={ACTION_LABELS.moreObservation}
                      edit={ACTION_LABELS.editObservation}
                      delete={ACTION_LABELS.deleteObservation}
                      deleting={deletingId === observation.id}
                    />
                  </li>
                ),
              )}
            </ul>
          ) : null}

          {error ? <p className="text-sm text-accent-red">{error}</p> : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this observation?"
        confirmLabel={ACTION_LABELS.deleteObservation.title}
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
