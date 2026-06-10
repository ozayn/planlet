"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  removePlanShareAction,
  sharePlanWithUserAction,
} from "@/app/(app)/plans/actions";
import { UserAvatar } from "@/components/user-avatar";
import { ACTION_LABELS } from "@/lib/action-labels";
import type { RecentShareRecipient } from "@/lib/plan-sharing";

type PlanShareEntry = {
  id: string;
  sharedWithUser: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

type ShareWithUserPanelProps = {
  planId: string;
  shares: PlanShareEntry[];
  recentRecipients?: RecentShareRecipient[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function recipientLabel(recipient: RecentShareRecipient): string {
  return recipient.name?.trim() || recipient.email || "User";
}

export function ShareWithUserPanel({
  planId,
  shares,
  recentRecipients = [],
  open = false,
}: ShareWithUserPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSharing, startShare] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const shareCountLabel =
    shares.length === 1
      ? "Shared with 1 person"
      : `Shared with ${shares.length} people`;

  function handleShare() {
    setError(null);

    startShare(async () => {
      const result = await sharePlanWithUserAction(planId, email);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setEmail("");
      router.refresh();
    });
  }

  function handleRemove(shareId: string) {
    setError(null);
    setRemovingId(shareId);

    startShare(async () => {
      const result = await removePlanShareAction(shareId);

      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }

      setRemovingId(null);
    });
  }

  return (
    <section
      className="ui-share-panel border-t border-border-soft pt-3"
      aria-label={ACTION_LABELS.shareInsidePlanlet.ariaLabel}
    >
      {shares.length > 0 ? (
        <p className="mb-2 text-xs text-muted">{shareCountLabel}</p>
      ) : null}

      <div className="ui-share-panel-body">
        <p className="text-xs text-muted">
          Give read-only access to another Planlet user.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="share-email"
            name="shareEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="user@example.com"
            autoComplete="email"
            className="ui-input ui-input-compact min-h-10 flex-1"
            aria-label="Planlet user email"
          />
          <button
            type="button"
            disabled={isSharing || !email.trim()}
            onClick={handleShare}
            className="ui-btn-secondary ui-btn-compact min-h-10 shrink-0 sm:min-w-20"
          >
            {isSharing ? "Sharing…" : "Share"}
          </button>
        </div>

        {recentRecipients.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">Recent</p>
            <div className="flex flex-wrap gap-2">
              {recentRecipients.map((recipient) => {
                const label = recipientLabel(recipient);
                const isSelected =
                  recipient.email &&
                  email.trim().toLowerCase() === recipient.email.toLowerCase();

                return (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEmail(recipient.email ?? "");
                    }}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent-cream/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40${
                      isSelected
                        ? " border-accent-blue/45 bg-accent-cream/55"
                        : " border-border-soft bg-surface"
                    }`}
                    aria-label={`Select ${label} to share with`}
                    title={
                      recipient.email
                        ? `${label} · ${recipient.email}`
                        : label
                    }
                  >
                    <UserAvatar
                      name={recipient.name}
                      email={recipient.email}
                      image={recipient.image}
                      size="xs"
                    />
                    <span className="max-w-[8rem] truncate" dir="auto">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-xs text-accent-red" role="alert">
            {error}
          </p>
        ) : null}

        {shares.length > 0 ? (
          <ul className="divide-y divide-border-soft">
            {shares.map((share) => (
              <SharedUserRow
                key={share.id}
                share={share}
                disabled={removingId === share.id || isSharing}
                isRemoving={removingId === share.id}
                onRemove={() => handleRemove(share.id)}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function SharedUserRow({
  share,
  disabled,
  isRemoving,
  onRemove,
}: {
  share: PlanShareEntry;
  disabled: boolean;
  isRemoving: boolean;
  onRemove: () => void;
}) {
  const { name, email } = share.sharedWithUser;

  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        {name ? (
          <p className="truncate text-sm text-foreground sm:hidden" dir="auto">
            {name}
          </p>
        ) : null}
        <p className="truncate text-xs text-muted sm:text-sm" dir="auto">
          <span className="hidden text-foreground sm:inline">
            {name ? `${name} · ` : ""}
          </span>
          {email ?? name}
          <span className="text-muted-light"> · Read-only</span>
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="ui-action-link min-h-10 shrink-0 px-1"
      >
        {isRemoving ? "Removing…" : "Remove"}
      </button>
    </li>
  );
}
