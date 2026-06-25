"use client";

import type { BodySymptomType } from "@/app/generated/prisma/client";
import { useTransition } from "react";

import { deleteBodyEntryAction } from "@/app/(app)/body/actions";
import { PencilIcon, Trash2Icon } from "@/components/ui/action-icons";
import {
  BODY_SYMPTOM_META,
  type SerializedBodyEntry,
} from "@/lib/body-journey/constants";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type BodyEntryListProps = {
  entries: SerializedBodyEntry[];
  onEdit: (entry: SerializedBodyEntry) => void;
};

function previewNotes(notes: string | null): string | null {
  if (!notes?.trim()) {
    return null;
  }

  const trimmed = notes.trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

export function BodyEntryList({ entries, onEdit }: BodyEntryListProps) {
  const [isPending, startTransition] = useTransition();

  if (entries.length === 0) {
    return (
      <section className="ui-card-padded space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Recent observations</h2>
        <p className="text-sm text-muted">No observations recorded yet.</p>
      </section>
    );
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      await deleteBodyEntryAction(entryId);
    });
  }

  return (
    <section className="ui-card-padded space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Recent observations</h2>
      <ul className="space-y-2">
        {entries.map((entry) => {
          const meta = BODY_SYMPTOM_META[entry.symptomType as BodySymptomType];
          const notePreview = previewNotes(entry.notes);

          return (
            <li
              key={entry.id}
              className="rounded-xl border border-border-soft px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted">{entry.entryDateLabel}</span>
                    <span className="text-foreground">{meta.label}</span>
                    <span className="tabular-nums text-muted">
                      {entry.intensity}/10
                    </span>
                  </div>
                  {notePreview ? (
                    <p className="text-sm leading-relaxed text-muted" dir="auto">
                      {notePreview}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onEdit(entry)}
                    {...passwordManagerSafeControlProps}
                    aria-label="Edit observation"
                    className="ui-icon-action-quiet"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(entry.id)}
                    {...passwordManagerSafeControlProps}
                    aria-label="Delete observation"
                    className="ui-icon-action-quiet text-accent-red"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
