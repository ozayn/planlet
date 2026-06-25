"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createLearningEntryAction,
  deleteLearningEntryAction,
} from "@/app/(app)/learning/actions";
import { LearningCaptureForm } from "@/components/learning/learning-capture-form";
import { LearningEntryCard } from "@/components/learning/learning-entry-card";
import { LearningEntryEditSheet } from "@/components/learning/learning-entry-edit-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ACTION_LABELS } from "@/lib/action-labels";
import type {
  CreateLearningEntryInput,
  LearningJourneyPageData,
  SerializedLearningEntry,
} from "@/lib/learning-journey/constants";

type LearningJourneyPageProps = {
  data: LearningJourneyPageData;
};

export function LearningJourneyPage({ data }: LearningJourneyPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<SerializedLearningEntry | null>(
    null,
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(input: CreateLearningEntryInput) {
    setError(null);

    startTransition(async () => {
      const result = await createLearningEntryAction(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleDelete(entryId: string) {
    setError(null);

    startTransition(async () => {
      const result = await deleteLearningEntryAction(entryId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setConfirmDeleteId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <LearningCaptureForm
        defaultLearnedAt={data.defaultLearnedAt}
        disabled={isPending}
        onSubmit={handleCreate}
      />

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Recent learnings
          </h2>
          <p className="text-xs text-muted-light">
            {data.entries.length === 0
              ? "Nothing captured yet"
              : `${data.entries.length} entr${data.entries.length === 1 ? "y" : "ies"}`}
          </p>
        </div>

        {data.entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-soft px-4 py-8 text-center">
            <p className="text-sm text-muted">
              Your learning timeline will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.entries.map((entry) => (
              <li key={entry.id}>
                <LearningEntryCard
                  entry={entry}
                  disabled={isPending}
                  onEdit={() => setEditingEntry(entry)}
                  onDelete={() => setConfirmDeleteId(entry.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <LearningEntryEditSheet
        entry={editingEntry}
        open={editingEntry !== null}
        onClose={() => {
          setEditingEntry(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this learning entry?"
        confirmLabel={ACTION_LABELS.deleteLearningEntry.title}
        onConfirm={() => {
          if (confirmDeleteId) {
            handleDelete(confirmDeleteId);
          }
        }}
        onCancel={() => {
          if (!isPending) {
            setConfirmDeleteId(null);
          }
        }}
        isConfirming={isPending && confirmDeleteId !== null}
        confirmDanger
      >
        <p>This cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
}
