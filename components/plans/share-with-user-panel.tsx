"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  removePlanShareAction,
  sharePlanWithUserAction,
} from "@/app/(app)/plans/actions";

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
};

export function ShareWithUserPanel({ planId, shares }: ShareWithUserPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSharing, startShare] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

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
    <section className="ui-card-padded space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Share inside Planlet
        </h3>
        <p className="mt-1 text-sm text-muted">
          Let another Planlet user view this plan. They need to have signed in
          at least once.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="friend@example.com"
          className="ui-input min-h-11 flex-1"
          aria-label="Planlet user email"
        />
        <button
          type="button"
          disabled={isSharing || !email.trim()}
          onClick={handleShare}
          className="ui-btn-secondary min-h-11 shrink-0"
        >
          {isSharing ? "Sharing…" : "Share"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-accent-red">{error}</p>
      ) : null}

      {shares.length > 0 ? (
        <ul className="space-y-2 border-t border-border-soft pt-4">
          {shares.map((share) => (
            <li
              key={share.id}
              className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-accent-cream/40 px-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground" dir="auto">
                  {share.sharedWithUser.name ?? share.sharedWithUser.email}
                </p>
                {share.sharedWithUser.name && share.sharedWithUser.email ? (
                  <p className="truncate text-xs text-muted" dir="auto">
                    {share.sharedWithUser.email}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={removingId === share.id || isSharing}
                onClick={() => handleRemove(share.id)}
                className="ui-btn-ghost shrink-0"
              >
                {removingId === share.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-light">Not shared with anyone yet.</p>
      )}
    </section>
  );
}
