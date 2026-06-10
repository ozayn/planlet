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
import type { SerializedObservation } from "@/lib/observations";

type PrivateObservationsSectionProps = {
  planId: string;
  observations: SerializedObservation[];
};

function formatObservationTime(value: string): string {
  const date = toZonedTime(new Date(value), APP_TIMEZONE);
  return format(date, "MMM d · h:mm a");
}

function formatObservationCount(count: number): string {
  return count === 1 ? "1 observation" : `${count} observations`;
}

function formatCategorySummary(observations: SerializedObservation[]): string {
  const labels = [
    ...new Set(
      observations.map((observation) =>
        getObservationCategoryLabel(observation.category),
      ),
    ),
  ];

  return labels.join(", ");
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

  const countLabel = formatObservationCount(observations.length);
  const categorySummary = formatCategorySummary(observations);
  const collapsedSummary =
    observations.length > 0 && categorySummary
      ? `${countLabel} · ${categorySummary}`
      : countLabel;

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
    <section className="border-t border-border-soft pt-5">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label="Toggle private observations"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-3 rounded-xl border border-border-soft/80 px-3 py-2.5 text-start transition-colors hover:bg-accent-cream/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            Private observations{" "}
            <span aria-hidden="true" className="text-muted-light">
              🔒
            </span>
          </p>
          {expanded ? (
            <p className="text-xs text-muted-light">Only you can see these.</p>
          ) : (
            <p className="text-xs text-muted">{collapsedSummary}</p>
          )}
        </div>
        <ChevronIcon
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded ? (
        <div id={panelId} className="mt-3 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <select
              id="observation-category"
              name="observationCategory"
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
              className="ui-btn-secondary ui-btn-compact min-h-9 shrink-0 px-4"
            >
              Add
            </button>
          </div>

          {observations.length === 0 ? (
            <p className="text-xs text-muted-light">
              Track anything you want to notice later.
            </p>
          ) : (
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
                        className="ui-btn-secondary ui-btn-compact min-h-8 px-3 text-xs"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
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
                        className="ui-btn-ghost min-h-8 px-2 text-xs"
                        aria-label="Edit observation"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(observation.id)}
                        disabled={deletingId === observation.id}
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
          )}

          {error ? <p className="text-sm text-accent-red">{error}</p> : null}
        </div>
      ) : null}
    </section>
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
