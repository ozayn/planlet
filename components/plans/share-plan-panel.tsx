"use client";

import { useMemo, useRef, useState } from "react";

import { createShareExportAction } from "@/app/(app)/plans/actions";
import { ClipboardCopyIcon } from "@/components/ui/action-icons";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import { ACTION_LABELS } from "@/lib/action-labels";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";
import type { SerializedPlan } from "@/lib/plan-serialize";
import {
  generateShareText,
  serializedPlanToSharePlan,
  SHARE_UI_FORMAT_META,
  shareUiFormatToExportFormat,
  shareUiFormatToOptions,
  type ShareUiFormat,
} from "@/lib/share-plan";

type SharePlanPanelProps = {
  plan: SerializedPlan;
  /** When unset, uses the app default (completed items first). */
  moveCompletedToTop?: boolean;
};

const FORMAT_OPTIONS: ShareUiFormat[] = ["plan", "plain", "update"];

export function SharePlanPanel({
  plan,
  moveCompletedToTop,
}: SharePlanPanelProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ShareUiFormat>("plan");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sharePlan = useMemo(
    () => serializedPlanToSharePlan(plan, { moveCompletedToTop }),
    [plan, moveCompletedToTop],
  );

  const previewText = useMemo(
    () => generateShareText(sharePlan, shareUiFormatToOptions(format)),
    [sharePlan, format],
  );

  async function handleCopy() {
    setCopied(false);
    setCopyError(false);
    setSaveWarning(false);

    let copiedToClipboard = false;

    try {
      await navigator.clipboard.writeText(previewText);
      copiedToClipboard = true;
    } catch {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
      setCopyError(true);
    }

    if (copiedToClipboard) {
      setCopied(true);
      setIsSaving(true);

      try {
        await createShareExportAction(
          plan.id,
          shareUiFormatToExportFormat(format),
          previewText,
        );
      } catch {
        setSaveWarning(true);
      } finally {
        setIsSaving(false);
      }
    }
  }

  function openPanel() {
    setOpen(true);
    setCopied(false);
    setCopyError(false);
    setSaveWarning(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        {...passwordManagerSafeControlProps}
        aria-label={ACTION_LABELS.copy.ariaLabel}
        title={ACTION_LABELS.copy.title}
        className="ui-icon-action"
      >
        <ClipboardCopyIcon className="h-4 w-4" aria-hidden="true" />
        <span className="ui-tooltip-bubble" role="tooltip">
          {ACTION_LABELS.copy.title}
        </span>
      </button>

      <SimpleSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Copy as text"
        footer={
          <div className="space-y-2">
            {copyError ? (
              <p className="text-sm text-muted">
                Clipboard unavailable — select the text above and copy manually.
              </p>
            ) : null}
            {copied ? (
              <p className="text-sm text-muted" role="status" aria-live="polite">
                Copied to clipboard{isSaving ? "…" : ""}
              </p>
            ) : null}
            {saveWarning ? (
              <p className="text-sm text-muted">
                Copied, but export history was not saved.
              </p>
            ) : null}
            <button
              type="button"
              disabled={!previewText.trim() || isSaving}
              onClick={handleCopy}
              {...passwordManagerSafeControlProps}
              className="ui-btn-primary w-full"
            >
              {copied ? "Copied" : "Copy text"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            For messaging apps. Private items are excluded.
          </p>

          <fieldset className="space-y-3">
            <legend className="ui-label">Format</legend>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((option) => {
                const meta = SHARE_UI_FORMAT_META[option];

                return (
                  <label
                    key={option}
                    className={`flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm transition-colors ${
                      format === option ? "ui-segment-active" : "ui-segment"
                    }`}
                  >
                    <input
                      id={`share-format-${option}`}
                      type="radio"
                      name="share-format"
                      {...passwordManagerSafeControlProps}
                      value={option}
                      checked={format === option}
                      onChange={() => {
                        setFormat(option);
                        setCopied(false);
                        setCopyError(false);
                        setSaveWarning(false);
                      }}
                      className="sr-only"
                    />
                    {meta.label}
                  </label>
                );
              })}
            </div>
            <p className="text-sm text-muted">
              {SHARE_UI_FORMAT_META[format].description}
            </p>
          </fieldset>

          <label htmlFor="share-preview" className="block space-y-2">
            <span className="ui-label">Preview</span>
            <textarea
              ref={textareaRef}
              id="share-preview"
              name="sharePreview"
              {...passwordManagerSafeControlProps}
              readOnly
              dir="auto"
              value={previewText}
              rows={8}
              className="ui-textarea ui-share-preview-textarea bg-accent-cream/50 font-mono text-xs"
            />
          </label>
        </div>
      </SimpleSheet>
    </>
  );
}
