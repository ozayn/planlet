"use client";

import { shouldOfferReloadForMessage } from "@/lib/action-errors";

type ActionErrorBannerProps = {
  message: string;
  offerReload?: boolean;
};

export function ActionErrorBanner({
  message,
  offerReload,
}: ActionErrorBannerProps) {
  const showReload = offerReload ?? shouldOfferReloadForMessage(message);

  return (
    <div
      role="alert"
      className="rounded-lg border border-accent-red/25 bg-accent-red/5 px-3 py-2 text-sm text-accent-red"
    >
      <p>{message}</p>
      {showReload ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1.5 text-xs font-medium text-accent-red underline underline-offset-2 hover:opacity-80"
        >
          Reload
        </button>
      ) : null}
    </div>
  );
}
