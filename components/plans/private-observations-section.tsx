"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

export function PrivateObservationsSection({
  planId,
  observations: initialObservations,
}: PrivateObservationsSectionProps) {
  const router = useRouter();
  const [observations, setObservations] =
    useState<SerializedObservation[]>(initialObservations);
  const [category, setCategory] = useState<ObservationCategory>("BODY");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] =
    useState<ObservationCategory>("BODY");
  const [editBody, setEditBody] = useState("");
  const [isSubmitting, startSubmit] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      setObservations((current) => [...current, result.observation]);
      router.refresh();
    });
  }

  function startEdit(observation: SerializedObservation) {
    setEditingId(observation.id);
    setEditCategory(observation.category);
    setEditBody(observation.body);
    setError(null);
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
    <section className="space-y-3 border-t border-border-soft pt-6">
      <div className="space-y-0.5">
        <h2 className="text-sm font-medium text-foreground">
          Private observations{" "}
          <span aria-hidden="true" className="text-muted-light">
            🔒
          </span>
        </h2>
        <p className="text-xs text-muted-light">Only you can see these.</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <select
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
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What did you notice?"
          rows={2}
          dir="auto"
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
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    rows={2}
                    dir="auto"
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
    </section>
  );
}
