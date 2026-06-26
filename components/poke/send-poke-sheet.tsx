"use client";

import type { PokeType } from "@/app/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { sendPokeAction } from "@/app/(app)/poke/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import { UserAvatar } from "@/components/user-avatar";
import { MAX_POKE_MESSAGE_LENGTH, POKE_TYPES } from "@/lib/poke-constants";
import {
  formatPokeUserLabel,
  getPokeTypeEmoji,
  getPokeTypeLabel,
} from "@/lib/poke-labels";
import type { PokeContact } from "@/lib/poke";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type SendPokeSheetProps = {
  contact: PokeContact | null;
  open: boolean;
  onClose: () => void;
};

export function SendPokeSheet({ contact, open, onClose }: SendPokeSheetProps) {
  const router = useRouter();
  const [pokeType, setPokeType] = useState<PokeType>("ENCOURAGE");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (isPending) {
      return;
    }

    setError(null);
    setMessage("");
    setPokeType("ENCOURAGE");
    onClose();
  }

  function handleSend() {
    if (!contact) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await sendPokeAction({
        recipientId: contact.id,
        pokeType,
        message,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setError(null);
      setMessage("");
      setPokeType("ENCOURAGE");
      onClose();
      router.refresh();
    });
  }

  if (!contact) {
    return null;
  }

  const contactLabel = formatPokeUserLabel(contact);

  return (
    <SimpleSheet
      open={open}
      onClose={handleClose}
      title={`Poke ${contactLabel}`}
      footer={
        <div className="flex flex-col gap-2">
          {error ? (
            <p className="text-sm text-accent-red" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={isPending}
            onClick={handleSend}
            {...passwordManagerSafeControlProps}
            className="ui-btn-primary ui-btn-compact min-h-10 w-full"
          >
            {isPending ? "Sending…" : "Send nudge"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-accent-cream/30 px-3 py-2.5">
          <UserAvatar
            name={contact.name}
            email={contact.email}
            image={contact.image}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground" dir="auto">
              {contactLabel}
            </p>
            <p className="text-xs text-muted-light">A quick, playful nudge — not a chat.</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-light">Choose a nudge</p>
          <div className="flex flex-wrap gap-2">
            {POKE_TYPES.map((type) => {
              const selected = pokeType === type;

              return (
                <button
                  key={type}
                  type="button"
                  disabled={isPending}
                  aria-pressed={selected}
                  onClick={() => setPokeType(type)}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-subtle)] disabled:opacity-50 ${
                    selected
                      ? "border-border bg-accent-cream text-foreground"
                      : "border-border-soft bg-surface text-muted hover:border-border hover:bg-accent-cream/60 hover:text-foreground"
                  }`}
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {getPokeTypeEmoji(type)}
                  </span>
                  <span>{getPokeTypeLabel(type)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted">Optional message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MAX_POKE_MESSAGE_LENGTH}
            rows={3}
            dir="auto"
            placeholder='e.g. "Small steps count."'
            className="ui-input min-h-20 w-full resize-y py-2"
            aria-label="Optional poke message"
          />
        </label>
      </div>
    </SimpleSheet>
  );
}
