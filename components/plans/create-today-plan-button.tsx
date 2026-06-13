"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createTodayPlanAction } from "@/app/(app)/plans/actions";
import { ActionErrorBanner } from "@/components/ui/action-error-banner";
import { invokeServerAction } from "@/lib/invoke-server-action";

export function CreateTodayPlanButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [offerReload, setOfferReload] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setOfferReload(false);

    startTransition(async () => {
      const invoked = await invokeServerAction(() => createTodayPlanAction());

      if (!invoked.ok) {
        setError(invoked.message);
        setOfferReload(invoked.offerReload);
        return;
      }

      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? (
        <ActionErrorBanner message={error} offerReload={offerReload} />
      ) : null}
      <button
        type="submit"
        className="ui-btn-primary w-full"
        disabled={isPending}
      >
        {isPending ? "Creating…" : "Create today\u2019s plan"}
      </button>
    </form>
  );
}
