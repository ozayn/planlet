"use client";

import { useMemo, useRef, useState } from "react";

import { createShareExportAction } from "@/app/(app)/plans/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setCopied(false);
          setCopyError(false);
          setSaveWarning(false);
        }}
        className="ui-btn-secondary min-h-10"
      >
        Copy as text
      </button>

      <SimpleSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Copy as text"
      >
        <div className="space-y-5">
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
              readOnly
              dir="auto"
              value={previewText}
              rows={14}
              className="ui-textarea bg-accent-cream/50 font-mono text-xs"
            />
          </label>

          {copyError ? (
            <p className="text-sm text-muted">
              Clipboard unavailable — select the text above and copy manually.
            </p>
          ) : null}

          {copied ? (
            <p className="text-sm text-muted">Copied{isSaving ? "…" : ""}</p>
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
            className="ui-btn-primary w-full"
          >
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
        </div>
      </SimpleSheet>
    </>
  );
}
