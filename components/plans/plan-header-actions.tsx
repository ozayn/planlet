"use client";

import type { SerializedPlan } from "@/lib/plan-serialize";

import { PlanMoreMenu } from "@/components/plans/plan-more-menu";
import { SharePlanPanel } from "@/components/plans/share-plan-panel";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type PlanHeaderActionsProps = {
  plan: SerializedPlan;
  showCopyExport?: boolean;
  showPlatformShare?: boolean;
  shareOpen?: boolean;
  onShareToggle?: () => void;
  showDeletePlan?: boolean;
  deleteRedirectTo?: string;
  periodSummaryHref?: string;
  periodSummaryLabel?: string;
};

export function PlanHeaderActions({
  plan,
  showCopyExport = false,
  showPlatformShare = false,
  shareOpen = false,
  onShareToggle,
  showDeletePlan = false,
  deleteRedirectTo,
  periodSummaryHref,
  periodSummaryLabel,
}: PlanHeaderActionsProps) {
  const showMore = showDeletePlan || Boolean(periodSummaryHref);

  if (!showCopyExport && !showPlatformShare && !showMore) {
    return null;
  }

  return (
    <div className="ui-plan-header-actions flex shrink-0 items-center gap-1">
      {showCopyExport ? <SharePlanPanel plan={plan} /> : null}
      {showPlatformShare && onShareToggle ? (
        <button
          type="button"
          {...passwordManagerSafeControlProps}
          aria-label="Share inside Planlet"
          title="Share inside Planlet"
          aria-expanded={shareOpen}
          onClick={onShareToggle}
          className="ui-icon-action"
        >
          <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
          <span className="ui-tooltip-bubble" role="tooltip">
            Share inside Planlet
          </span>
        </button>
      ) : null}
      {showMore ? (
        <PlanMoreMenu
          planId={plan.id}
          redirectTo={deleteRedirectTo}
          showDelete={showDeletePlan}
          periodSummaryHref={periodSummaryHref}
          periodSummaryLabel={periodSummaryLabel}
        />
      ) : null}
    </div>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}
