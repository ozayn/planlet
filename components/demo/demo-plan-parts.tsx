import type { ReactNode } from "react";

import type { DemoSubtask, DemoTask } from "@/lib/demo/demo-data";
import { EXPRESSIVE_STATUS_ICONS } from "@/lib/plan-status";

export function DemoPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-2 shrink-0">
      <h1 className="text-[1.125rem] font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{subtitle}</p>
    </header>
  );
}

export function DemoSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="ui-section-label text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted-light">
      {children}
    </h2>
  );
}

export function DemoPeriodNav({ label }: { label: string }) {
  return (
    <nav
      className="ui-plan-date-nav mb-2 shrink-0"
      aria-label="Period navigation"
    >
      <div className="ui-plan-date-nav-controls">
        <span
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon text-muted-light"
          aria-hidden="true"
        >
          ‹
        </span>
        <span className="ui-plan-date-nav-btn ui-plan-date-nav-btn-today ui-plan-date-nav-btn-active flex min-w-[7.5rem] flex-1 items-center justify-center text-center text-sm font-medium">
          {label}
        </span>
        <span
          className="ui-plan-date-nav-btn ui-plan-date-nav-btn-icon text-muted-light"
          aria-hidden="true"
        >
          ›
        </span>
      </div>
    </nav>
  );
}

export function DemoTaskRow({
  task,
  nested = false,
  compact = false,
}: {
  task: DemoTask | DemoSubtask;
  nested?: boolean;
  compact?: boolean;
}) {
  const statusIcon = EXPRESSIVE_STATUS_ICONS[task.status];

  return (
    <article
      className={`ui-plan-item ${compact ? "px-2 py-1.5" : "px-2.5 py-2"} ${nested ? "shadow-none" : ""}`}
    >
      <div className="ui-plan-item-row flex items-start gap-1.5">
        <span
          className={`ui-plan-item-leading-icon text-[0.9375rem] ${compact ? "h-7 w-7" : "h-8 w-8"}`}
          aria-hidden="true"
        >
          {statusIcon}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p
            className={`ui-plan-item-title leading-snug ${
              compact ? "text-[0.75rem]" : "text-[0.8125rem]"
            } ${
              task.status === "DONE"
                ? "text-muted line-through decoration-border"
                : "text-foreground"
            }`}
          >
            {task.title}
          </p>
          {"themeLabel" in task && task.themeLabel ? (
            <span className="inline-block max-w-full truncate rounded-md bg-accent-cream/70 px-1.5 py-0.5 text-[0.625rem] text-muted">
              {task.themeLabel}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function DemoIntentionRow({
  title,
  compact = false,
}: {
  title: string;
  compact?: boolean;
}) {
  return (
    <article className="rounded-lg border border-dashed border-border-soft bg-accent-cream/25 px-2.5 py-2">
      <div className="flex items-start gap-1.5 ps-0.5">
        <span
          className="ui-plan-item-leading-icon h-7 w-7 text-base text-muted"
          aria-hidden="true"
        >
          ✨
        </span>
        <p
          className={`min-w-0 flex-1 leading-snug text-foreground ${
            compact ? "text-[0.75rem]" : "text-[0.8125rem]"
          }`}
        >
          {title}
        </p>
      </div>
    </article>
  );
}

export function DemoProgressSummary({
  done,
  total,
  label = "This week",
}: {
  done: number;
  total: number;
  label?: string;
}) {
  const ratio = total > 0 ? done / total : 0;

  return (
    <div className="rounded-lg border border-border-soft bg-surface px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-foreground">
          {done} / {total} tasks
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border-soft">
        <div
          className="h-full rounded-full bg-accent-blue/40"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function DemoPriorityCard({
  label,
  note,
  progress,
}: {
  label: string;
  note: string;
  progress: number;
}) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted">{note}</p>
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted">
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border-soft">
        <div
          className="h-full rounded-full bg-foreground/30"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
