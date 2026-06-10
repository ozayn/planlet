"use client";

import type { SerializedPlan } from "@/lib/plan-serialize";

import { PlanMoreMenu } from "@/components/plans/plan-more-menu";
import { SharePlanPanel } from "@/components/plans/share-plan-panel";
import { UserPlusIcon } from "@/components/ui/action-icons";
import { ACTION_LABELS } from "@/lib/action-labels";
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
          aria-label={ACTION_LABELS.shareInsidePlanlet.ariaLabel}
          title={ACTION_LABELS.shareInsidePlanlet.title}
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
