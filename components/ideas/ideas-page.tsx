"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createIdeaAction, deleteIdeaAction } from "@/app/(app)/ideas/actions";
import { IdeaCaptureForm } from "@/components/ideas/idea-capture-form";
import { IdeaEditSheet } from "@/components/ideas/idea-edit-sheet";
import { IdeaList } from "@/components/ideas/idea-list";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ACTION_LABELS } from "@/lib/action-labels";
import type {
  CreateIdeaInput,
  IdeasPageData,
  SerializedIdea,
} from "@/lib/ideas/constants";

type IdeasPageProps = {
  data: IdeasPageData;
};

export function IdeasPage({ data }: IdeasPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<SerializedIdea | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(input: CreateIdeaInput) {
    setError(null);

    startTransition(async () => {
      const result = await createIdeaAction(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleDelete(ideaId: string) {
    setError(null);

    startTransition(async () => {
      const result = await deleteIdeaAction(ideaId);

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
      <IdeaCaptureForm
        defaultIdeaDate={data.defaultIdeaDate}
        disabled={isPending}
        onSubmit={handleCreate}
      />

      {error ? (
        <p className="text-sm text-accent-red" role="alert">
          {error}
        </p>
      ) : null}

      <IdeaList
        ideas={data.ideas}
        disabled={isPending}
        onEdit={setEditingIdea}
        onDelete={setConfirmDeleteId}
      />

      <IdeaEditSheet
        idea={editingIdea}
        open={editingIdea !== null}
        onClose={() => {
          setEditingIdea(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this idea?"
        confirmLabel={ACTION_LABELS.deleteIdea.title}
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
