"use client";

import Link from "next/link";
import type { PlanItemView } from "@/app/generated/prisma/client";

import { AddItemForm } from "@/components/plans/add-item-form";
import { DeletePlanMenu } from "@/components/plans/delete-plan-menu";
import { OpenFullPlanShareLink } from "@/components/plans/open-full-plan-share-link";
import { PlanItemSections } from "@/components/plans/plan-item-sections";
import {
  PlanKudosSummary,
  type PlanKudosEntry,
} from "@/components/plans/plan-kudos-summary";
import { PrivateObservationsSection } from "@/components/plans/private-observations-section";
import { SharePlanPanel } from "@/components/plans/share-plan-panel";
import { ShareWithUserPanel } from "@/components/plans/share-with-user-panel";
import { formatDateRange } from "@/lib/dates";
import { getPlanTypeLabel } from "@/lib/plan-labels";
import type { SerializedObservation } from "@/lib/observations";
import type { SerializedPlan } from "@/lib/plan-serialize";

type PlanShareEntry = {
  id: string;
  sharedWithUser: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

type PlanEditorProps = {
  plan: SerializedPlan;
  showMeta?: boolean;
  showCopyExport?: boolean;
  fullPlanHref?: string;
  showPlatformShare?: boolean;
  platformShares?: PlanShareEntry[];
  kudos?: PlanKudosEntry[];
  itemView?: PlanItemView;
  showDeletePlan?: boolean;
  deleteRedirectTo?: string;
  periodSummaryHref?: string;
  periodSummaryLabel?: string;
  observations?: SerializedObservation[];
};

export function PlanEditor({
  plan,
  showMeta = true,
  showCopyExport = false,
  fullPlanHref,
  showPlatformShare = false,
  platformShares = [],
  kudos = [],
  itemView = "MINIMAL",
  showDeletePlan = false,
  deleteRedirectTo,
  periodSummaryHref,
  periodSummaryLabel,
  observations,
}: PlanEditorProps) {
  const dateStart = new Date(plan.dateStart);
  const dateEnd = new Date(plan.dateEnd);
  const itemCount = plan.items.length;

  const headerActions =
    showCopyExport ||
    fullPlanHref ||
    showDeletePlan ||
    periodSummaryHref ? (
      <div className="flex shrink-0 items-center gap-1">
        {periodSummaryHref ? (
          <Link href={periodSummaryHref} className="ui-text-link text-sm">
            {periodSummaryLabel ?? "Summary"}
          </Link>
        ) : null}
        {showCopyExport ? <SharePlanPanel plan={plan} /> : null}
        {fullPlanHref ? <OpenFullPlanShareLink href={fullPlanHref} /> : null}
        {showDeletePlan ? (
          <DeletePlanMenu
            planId={plan.id}
            redirectTo={deleteRedirectTo}
          />
        ) : null}
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {showMeta ? (
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <h2
                className="text-xl font-semibold tracking-tight text-foreground"
                dir="auto"
              >
                {plan.title}
              </h2>
              <p className="text-sm text-muted">
                {getPlanTypeLabel(plan.type)} ·{" "}
                {formatDateRange(dateStart, dateEnd)}
                {itemCount > 0
                  ? ` · ${itemCount} item${itemCount === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
            {headerActions}
          </div>
          {plan.summary ? (
            <p className="text-sm leading-relaxed text-muted" dir="auto">
              {plan.summary}
            </p>
          ) : null}
        </header>
      ) : (
        <header className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted">
            {formatDateRange(dateStart, dateEnd)}
            {itemCount > 0
              ? ` · ${itemCount} item${itemCount === 1 ? "" : "s"}`
              : ""}
          </p>
          {headerActions}
        </header>
      )}

      {showPlatformShare ? (
        <ShareWithUserPanel planId={plan.id} shares={platformShares} />
      ) : null}

      <PlanKudosSummary kudos={kudos} />

      {plan.items.length > 0 ? (
        <section>
          <PlanItemSections
            planId={plan.id}
            items={plan.items}
            itemView={itemView}
          />
        </section>
      ) : null}

      <section className={plan.items.length === 0 ? "mt-4" : undefined}>
        {plan.items.length === 0 ? (
          <p className="mb-2 text-xs text-muted-light">
            Start with a task, intention, or note.
          </p>
        ) : null}
        <AddItemForm planId={plan.id} />
      </section>

      {observations !== undefined ? (
        <PrivateObservationsSection
          planId={plan.id}
          observations={observations}
        />
      ) : null}
    </div>
  );
}
