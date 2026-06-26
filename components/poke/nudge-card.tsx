"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { acknowledgePokeAction } from "@/app/(app)/poke/actions";
import { formatCompactActivityTime } from "@/lib/plan-activity";
import type { PokeContact, SerializedPoke } from "@/lib/poke";
import {
  getPokeTypeEmoji,
  getReceivedPokeHistoryLine,
  getSentPokeHistoryLine,
} from "@/lib/poke-labels";

type NudgeCardProps = {
  poke: SerializedPoke;
  direction: "received" | "sent";
  onPokeBack?: (contact: PokeContact) => void;
};

function senderToContact(poke: SerializedPoke): PokeContact {
  return {
    id: poke.sender.id,
    name: poke.sender.name,
    email: poke.sender.email,
    image: poke.sender.image,
    lastConnectedAt: poke.createdAt,
  };
}

export function NudgeCard({ poke, direction, onPokeBack }: NudgeCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isReceived = direction === "received";
  const isUnseen = isReceived && !poke.seenAt && !poke.dismissedAt;
  const line = isReceived
    ? getReceivedPokeHistoryLine(poke)
    : getSentPokeHistoryLine(poke);

  function runAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <li
      className={`rounded-xl border border-border-soft/80 px-3 py-2.5 ${
        isUnseen ? "bg-accent-cream/25" : "bg-surface/60"
      }`}
    >
      <div className="flex items-start gap-2">
        {isUnseen ? (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-blue"
            aria-label="Unread"
          />
        ) : (
          <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground" dir="auto">
            <span className="me-1.5" aria-hidden="true">
              {getPokeTypeEmoji(poke.pokeType)}
            </span>
            {line}
          </p>
          {poke.message ? (
            <p className="mt-1 text-sm text-muted" dir="auto">{`"${poke.message}"`}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs text-muted-light">
              {formatCompactActivityTime(new Date(poke.createdAt))}
            </p>
            {!isReceived ? (
              <span className="text-xs text-muted-light">· Sent</span>
            ) : poke.seenAt ? (
              <span className="text-xs text-muted-light">· Seen</span>
            ) : null}
          </div>
          {isReceived ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {onPokeBack ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onPokeBack(senderToContact(poke))}
                  className="ui-btn-secondary ui-btn-compact min-h-8 px-2.5 text-xs disabled:opacity-50"
                >
                  Poke back
                </button>
              ) : null}
              <button
                type="button"
                disabled={isPending || Boolean(poke.acknowledgedAt)}
                onClick={() => runAction(() => acknowledgePokeAction(poke.id))}
                className="text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                {poke.acknowledgedAt ? "Acknowledged ❤️" : "Acknowledge"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
