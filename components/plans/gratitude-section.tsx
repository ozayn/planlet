"use client";

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import {
  addPlanGratitudeAction,
  deletePlanGratitudeAction,
  updatePlanGratitudeAction,
} from "@/app/(app)/plans/actions";
import { ChevronDownIcon, LockIcon, SparklesIcon } from "@/components/ui/action-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { APP_TIMEZONE } from "@/config/time";
import { ACTION_LABELS } from "@/lib/action-labels";
import type { SerializedGratitude } from "@/lib/gratitude";
import { PRIVATE_SECTION_HELPER } from "@/lib/private-section-copy";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

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

  const collapsedCount = String(gratitudes.length);

  function handleAdd() {
    setError(null);

    startSubmit(async () => {
      const result = await addPlanGratitudeAction(planId, body);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setBody("");
      setExpanded(true);
      setGratitudes((current) => [...current, result.gratitude]);
      router.refresh();
    });
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

  function handleSaveEdit(gratitudeId: string) {
    setError(null);

    startSubmit(async () => {
      const result = await updatePlanGratitudeAction(gratitudeId, editBody);

      if (!result.success) {
        setError(result.error);
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

  function handleDelete(gratitudeId: string) {
    setError(null);
    setDeletingId(gratitudeId);

    void deletePlanGratitudeAction(gratitudeId).then((result) => {
      setDeletingId(null);
      setConfirmDeleteId(null);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setGratitudes((current) =>
        current.filter((entry) => entry.id !== gratitudeId),
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
        <div id={panelId} className="mt-3 space-y-3">
          <p className="text-xs text-muted-light">{PRIVATE_SECTION_HELPER}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <textarea
              id="gratitude-body"
              name="gratitudeBody"
              {...passwordManagerSafeControlProps}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What are you grateful for?"
              rows={2}
              dir="auto"
              aria-label="What are you grateful for?"
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

          {gratitudes.length > 0 ? (
            <ul className="space-y-2">
              {gratitudes.map((gratitude) =>
                editingId === gratitude.id ? (
                  <li
                    key={gratitude.id}
                    className="space-y-2 rounded-xl border border-border-soft bg-surface px-3 py-2.5"
                  >
                    <textarea
                      id={`gratitude-edit-body-${gratitude.id}`}
                      name={`gratitudeEditBody-${gratitude.id}`}
                      {...passwordManagerSafeControlProps}
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={2}
                      dir="auto"
                      aria-label="Edit gratitude"
                      className="ui-input min-h-9 w-full resize-y py-2"
                    />
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
                    className="group flex items-start justify-between gap-3 rounded-xl border border-border-soft/80 bg-surface/60 px-3 py-2.5"
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
                    <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEdit(gratitude)}
                        {...passwordManagerSafeControlProps}
                        className="ui-btn-ghost min-h-8 px-2 text-xs"
                        aria-label="Edit gratitude"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(gratitude.id)}
                        disabled={deletingId === gratitude.id}
                        {...passwordManagerSafeControlProps}
                        className="ui-btn-ghost min-h-8 px-2 text-xs text-muted"
                        aria-label="Delete gratitude"
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

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete gratitude?"
        confirmLabel="Delete"
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
