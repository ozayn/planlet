"use client";

import { useRef, useState } from "react";

import { PlanEditor } from "@/components/plans/plan-editor";
import { PlanHeaderActions } from "@/components/plans/plan-header-actions";
import { PlanOrganizeViewToggle } from "@/components/plans/plan-organize-view-toggle";
import { YearPlanNav } from "@/components/plans/year-plan-nav";
import type { PlanEditorProps } from "@/components/plans/plan-editor";
import {
  buildYearPlanPageSubtitle,
  buildYearPlanPageTitle,
} from "@/lib/year-plan-header";

type YearPlanContentProps = Omit<
  PlanEditorProps,
  "headerActionsPlacement" | "titleMode" | "showMeta"
> & {
  currentYearStart: string;
  headerAction?: React.ReactNode;
};

export function YearPlanContent({
  currentYearStart,
  headerAction,
  plan,
  showCopyExport = false,
  showPlatformShare = false,
  showDeletePlan = false,
  deleteRedirectTo,
  periodSummaryHref,
  periodSummaryLabel,
  canEdit = true,
  planOrganizeView = "LIST",
  ...planEditorProps
}: YearPlanContentProps) {
  const sharePanelRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [titleEditSignal, setTitleEditSignal] = useState(0);

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

  const headerActionProps = {
    plan,
    showCopyExport,
    showPlatformShare,
    shareOpen,
    onShareToggle: handleShareToggle,
    showDeletePlan,
    deleteRedirectTo,
    periodSummaryHref,
    periodSummaryLabel,
    showEditTitle: canEdit,
    onEditTitle: () => setTitleEditSignal((current) => current + 1),
  };

  const pageTitle = buildYearPlanPageTitle(currentYearStart);
  const pageSubtitle = buildYearPlanPageSubtitle(new Date(plan.updatedAt));

  return (
    <div className="ui-day-plan-content space-y-2 md:space-y-3">
      <header className="ui-page-header mb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className="text-[1.625rem] font-semibold tracking-tight text-foreground md:text-[1.625rem]"
              dir="auto"
            >
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-muted" dir="auto">
              {pageSubtitle}
            </p>
          </div>
          {headerAction ? (
            <div className="shrink-0 pt-0.5">{headerAction}</div>
          ) : null}
        </div>
      </header>

      <div className="ui-day-plan-toolbar">
        <div className="ui-day-plan-toolbar-actions">
          <PlanHeaderActions {...headerActionProps} />
        </div>
        <div className="flex flex-col gap-2 overflow-x-hidden sm:flex-row sm:flex-wrap sm:items-center">
          <YearPlanNav currentYearStart={currentYearStart} />
          <PlanOrganizeViewToggle value={planOrganizeView} />
        </div>
      </div>

      <PlanEditor
        plan={plan}
        showMeta={false}
        showCopyExport={showCopyExport}
        showPlatformShare={showPlatformShare}
        showDeletePlan={showDeletePlan}
        deleteRedirectTo={deleteRedirectTo}
        periodSummaryHref={periodSummaryHref}
        periodSummaryLabel={periodSummaryLabel}
        canEdit={canEdit}
        planOrganizeView={planOrganizeView}
        showOrganizeToggle={false}
        headerActionsPlacement="none"
        titleMode="custom-only"
        titleEditSignal={titleEditSignal}
        shareOpen={shareOpen}
        onShareOpenChange={setShareOpen}
        sharePanelRef={sharePanelRef}
        {...planEditorProps}
      />
    </div>
  );
}
