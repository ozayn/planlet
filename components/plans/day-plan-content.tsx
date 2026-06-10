"use client";

import { useRef, useState } from "react";

import { DayPlanNav } from "@/components/plans/day-plan-nav";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PlanHeaderActions } from "@/components/plans/plan-header-actions";
import type { PlanEditorProps } from "@/components/plans/plan-editor";
import {
  buildDayPlanPageSubtitle,
  buildDayPlanPageTitle,
  type DayPlanPageVariant,
} from "@/lib/day-plan-header";

type DayPlanContentProps = Omit<
  PlanEditorProps,
  "headerActionsPlacement" | "titleMode" | "showMeta"
> & {
  currentDate: string;
  pageVariant: DayPlanPageVariant;
  userFirstName?: string | null;
  headerAction?: React.ReactNode;
};

export function DayPlanContent({
  currentDate,
  pageVariant,
  userFirstName,
  headerAction,
  plan,
  showCopyExport = false,
  showPlatformShare = false,
  showDeletePlan = false,
  deleteRedirectTo,
  periodSummaryHref,
  periodSummaryLabel,
  canEdit = true,
  ...planEditorProps
}: DayPlanContentProps) {
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

  const pageTitle = buildDayPlanPageTitle(
    currentDate,
    pageVariant,
    userFirstName,
  );
  const pageSubtitle = buildDayPlanPageSubtitle(
    currentDate,
    new Date(plan.updatedAt),
    pageVariant,
  );

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
        <DayPlanNav currentDate={currentDate} />
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
