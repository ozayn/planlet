"use client";

import type { KudosType } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { sendPlanKudosAction } from "@/app/(app)/plans/actions";
import {
  getKudosTypeLabel,
  getKudosTypeShortLabel,
  KUDOS_TYPES,
} from "@/lib/kudos-labels";

type ViewerKudos = {
  type: KudosType;
} | null;

type SendKudosPanelProps = {
  planId: string;
  viewerKudos: ViewerKudos;
};

export function SendKudosPanel({ planId, viewerKudos }: SendKudosPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sentType, setSentType] = useState<KudosType | null>(
    viewerKudos?.type ?? null,
  );
  const [editing, setEditing] = useState(!viewerKudos);
  const [error, setError] = useState<string | null>(null);

  function handleSend(type: KudosType) {
    setError(null);

    startTransition(async () => {
      const result = await sendPlanKudosAction(planId, type);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSentType(type);
      setEditing(false);
      router.refresh();
    });
  }

  if (sentType && !editing) {
    return (
      <div className="rounded-xl border border-border-soft bg-surface-muted/40 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            Kudos sent · {getKudosTypeLabel(sentType)}
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border-soft bg-surface-muted/40 px-3 py-2.5">
      <p className="text-xs font-medium text-muted-light">Send kudos</p>
      <div className="flex flex-wrap gap-2">
        {KUDOS_TYPES.map((type) => {
          const selected = sentType === type;

          return (
            <button
              key={type}
              type="button"
              disabled={isPending}
              aria-pressed={selected}
              onClick={() => handleSend(type)}
              className={`min-h-10 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                selected
                  ? "border-border bg-accent-cream text-foreground"
                  : "border-border-soft bg-surface text-muted hover:border-border hover:bg-accent-cream/60 hover:text-foreground"
              }`}
            >
              {getKudosTypeShortLabel(type)}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs text-muted" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
