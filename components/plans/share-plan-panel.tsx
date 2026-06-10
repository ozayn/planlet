"use client";

import { useMemo, useRef, useState } from "react";

import { createShareExportAction } from "@/app/(app)/plans/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
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
};

const FORMAT_OPTIONS: ShareUiFormat[] = ["plan", "plain", "update"];
const COPY_TOOLTIP = "Copy as text";
const COPY_ARIA_LABEL = "Copy plan as text";

export function SharePlanPanel({ plan }: SharePlanPanelProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ShareUiFormat>("plan");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sharePlan = useMemo(() => serializedPlanToSharePlan(plan), [plan]);

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
        aria-label={COPY_ARIA_LABEL}
        title={COPY_TOOLTIP}
        className="ui-icon-action"
      >
        <ClipboardCopyIcon className="h-4 w-4" aria-hidden="true" />
        <span className="ui-tooltip-bubble" role="tooltip">
          {COPY_TOOLTIP}
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
              {copied ? "Copied" : "Copy to clipboard"}
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
              className="ui-textarea max-h-48 bg-accent-cream/50 font-mono text-xs sm:max-h-64"
            />
          </label>
        </div>
      </SimpleSheet>
    </>
  );
}

function ClipboardCopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
      />
      <path strokeLinecap="round" d="M12 11h4" />
      <path strokeLinecap="round" d="M12 16h4" />
      <path strokeLinecap="round" d="M8 11h.01" />
      <path strokeLinecap="round" d="M8 16h.01" />
    </svg>
  );
}
