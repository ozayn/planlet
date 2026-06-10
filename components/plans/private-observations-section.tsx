"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import type { ObservationCategory } from "@/app/generated/prisma/client";
import {
  addPlanObservationAction,
  deletePlanObservationAction,
  updatePlanObservationAction,
} from "@/app/(app)/plans/actions";
import { APP_TIMEZONE } from "@/config/time";
import { OBSERVATION_CATEGORIES } from "@/lib/observation-constants";
import { getObservationCategoryLabel } from "@/lib/observation-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { SerializedObservation } from "@/lib/observations";

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

  useEffect(() => {
    setObservations(initialObservations);
  }, [initialObservations]);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile && initialObservations.length > 0) {
      setExpanded(true);
    }
  }, [initialObservations.length]);

  const collapsedCount = String(observations.length);

  function handleAdd() {
    setError(null);

    startSubmit(async () => {
      const result = await addPlanObservationAction(planId, {
        category,
        body,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBody("");
      setExpanded(true);
      setObservations((current) => [...current, result.observation]);
      router.refresh();
    });
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

  function handleSaveEdit(observationId: string) {
    setError(null);

    startSubmit(async () => {
      const result = await updatePlanObservationAction(observationId, {
        category: editCategory,
        body: editBody,
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

  function handleDelete(observationId: string) {
    if (!window.confirm("Delete this observation?")) {
      return;
    }

    setError(null);
    setDeletingId(observationId);

    void deletePlanObservationAction(observationId).then((result) => {
      setDeletingId(null);

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
        aria-label="Private observations"
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
          <ChevronIcon
            className={`h-4 w-4 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </span>
      </button>

      {expanded ? (
        <div id={panelId} className="mt-3 space-y-3">
          <p className="text-xs text-muted-light">
            Owner-only body, mood, and energy log. Not shared or exported.
          </p>
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
            <textarea
              id="observation-body"
              name="observationBody"
              {...passwordManagerSafeControlProps}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What did you notice?"
              rows={2}
              dir="auto"
              aria-label="What did you notice?"
              className="ui-input min-h-9 flex-1 resize-y py-2"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSubmitting || !body.trim()}
              {...passwordManagerSafeControlProps}
              className="ui-btn-secondary ui-btn-compact min-h-9 shrink-0 px-4"
            >
              Add
            </button>
          </div>

          {observations.length > 0 ? (
            <ul className="space-y-2">
              {observations.map((observation) =>
                editingId === observation.id ? (
                  <li
                    key={observation.id}
                    className="space-y-2 rounded-xl border border-border-soft bg-surface px-3 py-2.5"
                  >
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
                      <textarea
                        id={`observation-edit-body-${observation.id}`}
                        name={`observationEditBody-${observation.id}`}
                        {...passwordManagerSafeControlProps}
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        rows={2}
                        dir="auto"
                        aria-label="Edit observation"
                        className="ui-input min-h-9 flex-1 resize-y py-2"
                      />
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
                    className="group flex items-start justify-between gap-3 rounded-xl border border-border-soft/80 bg-surface/60 px-3 py-2.5"
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
                    <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEdit(observation)}
                        {...passwordManagerSafeControlProps}
                        className="ui-btn-ghost min-h-8 px-2 text-xs"
                        aria-label="Edit observation"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(observation.id)}
                        disabled={deletingId === observation.id}
                        {...passwordManagerSafeControlProps}
                        className="ui-btn-ghost min-h-8 px-2 text-xs text-muted"
                        aria-label="Delete observation"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          ) : null}

          {error ? <p className="text-sm text-accent-red">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
