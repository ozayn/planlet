"use client";

import { useRef, useState, type RefObject } from "react";
import type { PlanItemView, TaskOrganizationDisplay } from "@/app/generated/prisma/client";

import { AddItemForm } from "@/components/plans/add-item-form";
import { EditablePlanTitle } from "@/components/plans/editable-plan-title";
import { PlanHeaderActions } from "@/components/plans/plan-header-actions";
import { PlanMetadata } from "@/components/plans/plan-metadata";
import { PlanItemSections } from "@/components/plans/plan-item-sections";
import {
  PlanKudosSummary,
  type PlanKudosEntry,
} from "@/components/plans/plan-kudos-summary";
import { GratitudeSection } from "@/components/plans/gratitude-section";
import { PrivateObservationsSection } from "@/components/plans/private-observations-section";
import { TherapyThoughtsSection } from "@/components/plans/therapy-thoughts-section";
import { ShareWithUserPanel } from "@/components/plans/share-with-user-panel";
import { formatPlanActivityLabel } from "@/lib/plan-activity";
import { isDefaultPlanTitle } from "@/lib/plan-title";
import type { SerializedGratitude } from "@/lib/gratitude";
import type { SerializedObservation } from "@/lib/observations";
import type { SerializedTherapyThought } from "@/lib/therapy-thoughts";
import { formatDateString } from "@/lib/dates";
import type { SerializedPlan } from "@/lib/plan-serialize";
import type { RecentShareRecipient } from "@/lib/plan-sharing";
import type { ThemeProjectCatalog } from "@/lib/theme-project-types";
import { EMPTY_THEME_PROJECT_CATALOG } from "@/lib/theme-project-types";

type PlanShareEntry = {
  id: string;
  sharedWithUser: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export type PlanEditorProps = {
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
  gratitudes?: SerializedGratitude[];
  therapyThoughts?: SerializedTherapyThought[];
  canEdit?: boolean;
  themeProjectCatalog?: ThemeProjectCatalog;
  taskOrganizationDisplay?: TaskOrganizationDisplay;
  headerActionsPlacement?: "inline" | "desktop-only" | "none";
  titleMode?: "full" | "custom-only";
  titleEditSignal?: number;
  shareOpen?: boolean;
  onShareOpenChange?: (open: boolean) => void;
  sharePanelRef?: RefObject<HTMLDivElement | null>;
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
  gratitudes,
  therapyThoughts,
  themeProjectCatalog = EMPTY_THEME_PROJECT_CATALOG,
  taskOrganizationDisplay = "ASSIGNED_ONLY",
  headerActionsPlacement = "inline",
  titleMode = "full",
  titleEditSignal = 0,
  shareOpen: controlledShareOpen,
  onShareOpenChange,
  sharePanelRef: controlledSharePanelRef,
}: PlanEditorProps) {
  const dateStart = new Date(plan.dateStart);
  const sourcePlanDate =
    plan.type === "DAY" ? formatDateString(dateStart) : undefined;
  const dateEnd = new Date(plan.dateEnd);
  const itemCount = plan.items.length;
  const activityAt = new Date(plan.updatedAt);
  const internalSharePanelRef = useRef<HTMLDivElement>(null);
  const sharePanelRef = controlledSharePanelRef ?? internalSharePanelRef;
  const [internalShareOpen, setInternalShareOpen] = useState(false);
  const shareOpen = controlledShareOpen ?? internalShareOpen;

  function setShareOpen(next: boolean | ((current: boolean) => boolean)) {
    if (onShareOpenChange) {
      const resolved =
        typeof next === "function" ? next(controlledShareOpen ?? false) : next;
      onShareOpenChange(resolved);
      return;
    }

    setInternalShareOpen(next);
  }

  function handleShareToggle() {
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
  }

  const headerActions = (
    <PlanHeaderActions
      plan={plan}
      showCopyExport={showCopyExport}
      showPlatformShare={showPlatformShare}
      shareOpen={shareOpen}
      onShareToggle={handleShareToggle}
      showDeletePlan={showDeletePlan}
      deleteRedirectTo={deleteRedirectTo}
      periodSummaryHref={periodSummaryHref}
      periodSummaryLabel={periodSummaryLabel}
    />
  );

  const headerActionsNode =
    headerActionsPlacement === "none" ? null : headerActionsPlacement ===
      "desktop-only" ? (
      <div className="hidden shrink-0 md:flex">{headerActions}</div>
    ) : (
      headerActions
    );

  const hasCustomTitle = !isDefaultPlanTitle(
    plan.title,
    plan.type,
    dateStart,
    dateEnd,
  );
  const [titleEditing, setTitleEditing] = useState(false);

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

  const titleEditor = (
    <EditablePlanTitle
      planId={plan.id}
      title={plan.title}
      canEdit={canEdit}
      editRequestSignal={titleEditSignal}
      onEditingChange={setTitleEditing}
      className={
        titleMode === "custom-only"
          ? "text-lg font-semibold tracking-tight text-foreground"
          : "text-xl font-semibold tracking-tight text-foreground"
      }
    />
  );

  const hideTitleVisually =
    titleMode === "custom-only" && !hasCustomTitle && !titleEditing;

  return (
    <div
      className={`ui-plan-editor ${titleMode === "custom-only" ? "space-y-4" : "space-y-6"}`}
    >
      {showMeta ? (
        <header
          className={`ui-plan-editor-header space-y-3${hideTitleVisually ? " sr-only" : ""}`}
          aria-hidden={hideTitleVisually}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              {titleEditor}
              {titleMode === "full" ? metadata : null}
            </div>
            {headerActionsNode}
          </div>
          {plan.summary ? (
            <p className="text-sm leading-relaxed text-muted" dir="auto">
              {plan.summary}
            </p>
          ) : null}
        </header>
      ) : (
        <header
          className={`ui-plan-editor-header space-y-2${hideTitleVisually ? " sr-only" : ""}`}
          aria-hidden={hideTitleVisually}
        >
          <div className="flex items-start justify-between gap-3">
            {titleEditor}
            {headerActionsNode}
          </div>
          {titleMode === "full" ? metadata : null}
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

      {canEdit ? (
        <section>
          <AddItemForm planId={plan.id} />
        </section>
      ) : null}

      {plan.items.length > 0 ? (
        <section>
          <PlanItemSections
            planId={plan.id}
            items={plan.items}
            itemView={itemView}
            canEdit={canEdit}
            sourcePlanDate={sourcePlanDate}
            themeProjectCatalog={themeProjectCatalog}
            taskOrganizationDisplay={taskOrganizationDisplay}
          />
        </section>
      ) : null}

      {gratitudes !== undefined ? (
        <GratitudeSection planId={plan.id} gratitudes={gratitudes} />
      ) : null}

      {observations !== undefined ? (
        <PrivateObservationsSection
          planId={plan.id}
          observations={observations}
        />
      ) : null}

      {therapyThoughts !== undefined ? (
        <TherapyThoughtsSection
          planId={plan.id}
          thoughts={therapyThoughts}
        />
      ) : null}
    </div>
  );
}
