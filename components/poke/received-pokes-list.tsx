"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  acknowledgePokeAction,
  dismissPokeAction,
} from "@/app/(app)/poke/actions";
import { UserAvatar } from "@/components/user-avatar";
import { APP_TIMEZONE } from "@/config/time";
import {
  getPokeNotificationLine,
} from "@/lib/poke-labels";
import type { SerializedPoke } from "@/lib/poke";

type ReceivedPokesListProps = {
  pokes: SerializedPoke[];
  compact?: boolean;
};

function formatPokeTime(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(new Date(iso));
}

export function ReceivedPokesList({
  pokes,
  compact = false,
}: ReceivedPokesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (pokes.length === 0) {
    return compact ? null : (
      <p className="text-sm text-muted">No nudges right now.</p>
    );
  }

  function handleAcknowledge(pokeId: string) {
    startTransition(async () => {
      await acknowledgePokeAction(pokeId);
      router.refresh();
    });
  }

  function handleDismiss(pokeId: string) {
    startTransition(async () => {
      await dismissPokeAction(pokeId);
      router.refresh();
    });
  }

  return (
    <ul className={compact ? "space-y-2 p-2" : "space-y-2"}>
      {pokes.map((poke) => {
        const isUnread = !poke.seenAt;
        const line = getPokeNotificationLine({
          senderName: poke.sender.name,
          senderEmail: poke.sender.email,
          pokeType: poke.pokeType,
        });

        return (
          <li
            key={poke.id}
            className={`rounded-xl border border-border-soft/80 px-3 py-2.5 ${
              isUnread ? "bg-accent-cream/35" : "bg-surface/60"
            }`}
          >
            <div className="flex items-start gap-3">
              <UserAvatar
                name={poke.sender.name}
                email={poke.sender.email}
                image={poke.sender.image}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground" dir="auto">
                  {line}
                </p>
                {poke.message ? (
                  <p
                    className="mt-1 text-sm text-muted"
                    dir="auto"
                  >{`"${poke.message}"`}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-light">
                  {formatPokeTime(poke.createdAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending || Boolean(poke.acknowledgedAt)}
                    onClick={() => handleAcknowledge(poke.id)}
                    className="ui-btn-secondary ui-btn-compact min-h-8 px-2.5 text-xs disabled:opacity-50"
                  >
                    {poke.acknowledgedAt ? "Acknowledged ❤️" : "❤️ Acknowledge"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDismiss(poke.id)}
                    className="text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
