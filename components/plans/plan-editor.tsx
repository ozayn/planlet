"use client";

import { useRef, useState } from "react";
import type { PlanItemView } from "@/app/generated/prisma/client";

import { AddItemForm } from "@/components/plans/add-item-form";
import { EditablePlanTitle } from "@/components/plans/editable-plan-title";
import { PlanHeaderActions } from "@/components/plans/plan-header-actions";
import { PlanMetadata } from "@/components/plans/plan-metadata";
import { PlanItemSections } from "@/components/plans/plan-item-sections";
import {
  PlanKudosSummary,
  type PlanKudosEntry,
} from "@/components/plans/plan-kudos-summary";
import { PrivateObservationsSection } from "@/components/plans/private-observations-section";
import { ShareWithUserPanel } from "@/components/plans/share-with-user-panel";
import { formatPlanActivityLabel } from "@/lib/plan-activity";
import type { SerializedObservation } from "@/lib/observations";
import type { SerializedPlan } from "@/lib/plan-serialize";
import type { RecentShareRecipient } from "@/lib/plan-sharing";

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
  showPlatformShare?: boolean;
  platformShares?: PlanShareEntry[];
  recentShareRecipients?: RecentShareRecipient[];
  kudos?: PlanKudosEntry[];
  itemView?: PlanItemView;
  showDeletePlan?: boolean;
  deleteRedirectTo?: string;
  periodSummaryHref?: string;
  periodSummaryLabel?: string;
  observations?: SerializedObservation[];
  canEdit?: boolean;
};

export function PlanEditor({
  plan,
  showMeta = true,
  canEdit = true,
  showCopyExport = false,
  showPlatformShare = false,
  platformShares = [],
  recentShareRecipients = [],
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
  const activityAt = new Date(plan.updatedAt);
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const headerActions = (
    <PlanHeaderActions
      plan={plan}
      showCopyExport={showCopyExport}
      showPlatformShare={showPlatformShare}
      shareOpen={shareOpen}
      onShareToggle={() => {
        setShareOpen((current) => {
          const next = !current;
          if (next) {
            requestAnimationFrame(() => {
              sharePanelRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            });
          }
          return next;
        });
      }}
      showDeletePlan={showDeletePlan}
      deleteRedirectTo={deleteRedirectTo}
      periodSummaryHref={periodSummaryHref}
      periodSummaryLabel={periodSummaryLabel}
    />
  );

  const metadata = (
    <PlanMetadata
      type={plan.type}
      dateStart={dateStart}
      dateEnd={dateEnd}
      itemCount={itemCount}
      activityLabel={formatPlanActivityLabel(activityAt)}
      compact={!showMeta}
    />
  );

  return (
    <div className="ui-plan-editor space-y-6">
      {showMeta ? (
        <header className="ui-plan-editor-header space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <EditablePlanTitle
                planId={plan.id}
                title={plan.title}
                canEdit={canEdit}
              />
              {metadata}
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
        <header className="ui-plan-editor-header space-y-2">
          <div className="flex items-start justify-between gap-3">
            <EditablePlanTitle
              planId={plan.id}
              title={plan.title}
              canEdit={canEdit}
            />
            {headerActions}
          </div>
          {metadata}
        </header>
      )}

      {showPlatformShare ? (
        <div ref={sharePanelRef}>
          <ShareWithUserPanel
            planId={plan.id}
            shares={platformShares}
            recentRecipients={recentShareRecipients}
            open={shareOpen}
            onOpenChange={setShareOpen}
          />
        </div>
      ) : null}

      <PlanKudosSummary kudos={kudos} />

      {plan.items.length > 0 ? (
        <section>
          <PlanItemSections
            planId={plan.id}
            items={plan.items}
            itemView={itemView}
            canEdit={canEdit}
          />
        </section>
      ) : null}

      <section className={plan.items.length === 0 ? "mt-4" : undefined}>
        {canEdit ? <AddItemForm planId={plan.id} /> : null}
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
