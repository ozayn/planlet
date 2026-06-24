"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { ActionErrorBanner } from "@/components/ui/action-error-banner";
import { shiftDateString } from "@/lib/dates";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type MoveToDateSuccess = {
  targetDateLabel: string;
  targetPlanHref: string;
  movedOpenSubtasksOnly: boolean;
};

type MoveToDateDialogProps = {
  open: boolean;
  itemTitle: string;
  sourcePlanDate?: string;
  hasSubtasks?: boolean;
  movableSubtaskCount?: number;
  onMove: (targetDate: string, keepCopy: boolean) => void;
  onClose: () => void;
  isPending?: boolean;
  error?: string | null;
  success?: MoveToDateSuccess | null;
};

function defaultTargetDate(sourcePlanDate?: string): string {
  if (sourcePlanDate) {
    return shiftDateString(sourcePlanDate, 1);
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return shiftDateString(`${yyyy}-${mm}-${dd}`, 1);
}

export function MoveToDateDialog({
  open,
  itemTitle,
  sourcePlanDate,
  hasSubtasks = false,
  movableSubtaskCount = 0,
  onMove,
  onClose,
  isPending = false,
  error = null,
  success = null,
}: MoveToDateDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dateInputId = useId();
  const keepCopyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [targetDate, setTargetDate] = useState(() =>
    defaultTargetDate(sourcePlanDate),
  );
  const [keepCopy, setKeepCopy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTargetDate(defaultTargetDate(sourcePlanDate));
    setKeepCopy(false);
  }, [open, sourcePlanDate]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose, isPending]);

  if (!open) {
    return null;
  }

  const noMovableSubtasks = hasSubtasks && movableSubtaskCount === 0;
  const canMove = Boolean(targetDate) && !noMovableSubtasks;

  return (
    <div className="ui-dialog-overlay">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={() => {
          if (!isPending) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="ui-dialog-panel"
      >
        <div className="ui-dialog-body space-y-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              Move to date
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted">
              Move &ldquo;{itemTitle}&rdquo; to another daily plan.
            </p>
          </div>

          {success ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                {success.movedOpenSubtasksOnly
                  ? `Moved open subtasks to ${success.targetDateLabel}.`
                  : `Moved to ${success.targetDateLabel}.`}
              </p>
              <Link
                href={success.targetPlanHref}
                className="inline-flex min-h-10 items-center text-sm font-medium text-foreground underline underline-offset-2"
              >
                Open plan for {success.targetDateLabel}
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={dateInputId}
                    className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted-light"
                  >
                    Date
                  </label>
                  <input
                    id={dateInputId}
                    type="date"
                    value={targetDate}
                    disabled={isPending}
                    onChange={(event) => setTargetDate(event.target.value)}
                    {...passwordManagerSafeControlProps}
                    className="ui-input w-full min-h-11"
                  />
                </div>

                <label
                  htmlFor={keepCopyId}
                  className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-foreground"
                >
                  <input
                    id={keepCopyId}
                    type="checkbox"
                    checked={keepCopy}
                    disabled={isPending}
                    onChange={(event) => setKeepCopy(event.target.checked)}
                    className="h-4 w-4 rounded border-border-soft"
                  />
                  <span>Keep a copy here</span>
                </label>

                {hasSubtasks ? (
                  <p className="text-sm text-muted">
                    Only open subtasks will move. Done subtasks stay here.
                  </p>
                ) : null}

                {noMovableSubtasks ? (
                  <p className="text-sm text-muted">No open subtasks to move.</p>
                ) : null}
              </div>

              {error ? <ActionErrorBanner message={error} /> : null}
            </>
          )}
        </div>

        <div className="ui-dialog-footer flex justify-end gap-2">
          {success ? (
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-secondary ui-btn-compact min-h-10 px-4"
            >
              Close
            </button>
          ) : (
            <>
              <button
                ref={cancelRef}
                type="button"
                disabled={isPending}
                onClick={onClose}
                className="ui-btn-secondary ui-btn-compact min-h-10 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !canMove}
                onClick={() => onMove(targetDate, keepCopy)}
                className="ui-btn-primary ui-btn-compact min-h-10 px-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Moving…" : "Move"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
