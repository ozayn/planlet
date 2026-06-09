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
  const [expanded, setExpanded] = useState(shares.length > 0);
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
      setExpanded(true);
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
    <section className="border-t border-border-soft pt-6">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-4 text-start"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="ui-section-title">Share inside Planlet</h3>
          {shares.length > 0 && !expanded ? (
            <p className="mt-1 text-sm text-muted">
              Shared with {shares.length}.
            </p>
          ) : null}
        </div>
        <span className="shrink-0 pt-0.5 text-sm text-muted-light" aria-hidden="true">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted">
            Read-only. Recipient must already have signed in.
          </p>

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
              {isSharing ? "Inviting…" : "Invite"}
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground" dir="auto">
                      {share.sharedWithUser.name ?? share.sharedWithUser.email}
                    </p>
                    {share.sharedWithUser.name && share.sharedWithUser.email ? (
                      <p className="truncate text-xs text-muted" dir="auto">
                        {share.sharedWithUser.email}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-light">Read-only</p>
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
            <p className="text-sm text-muted-light">
              Not shared with anyone yet.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
