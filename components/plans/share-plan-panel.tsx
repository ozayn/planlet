"use client";

import { useMemo, useRef, useState } from "react";

import { createShareExportAction } from "@/app/(app)/plans/actions";
import { SimpleSheet } from "@/components/ui/simple-sheet";
import type { SerializedPlan } from "@/lib/plan-serialize";
import {
  generateShareText,
  serializedPlanToSharePlan,
  shareUiFormatToExportFormat,
  shareUiFormatToOptions,
  type ShareUiFormat,
} from "@/lib/share-plan";

type SharePlanPanelProps = {
  plan: SerializedPlan;
};

const FORMAT_OPTIONS: { value: ShareUiFormat; label: string }[] = [
  { value: "plan", label: "Plan" },
  { value: "plain", label: "Plain text" },
  { value: "update", label: "Update" },
];

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
        Share
      </button>

      <SimpleSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Share plan"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted">
            Copy a calm snapshot to share. Non-shareable items are excluded.
          </p>

          <fieldset className="space-y-3">
            <legend className="ui-label">Format</legend>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm transition-colors ${
                    format === option.value
                      ? "ui-segment-active"
                      : "ui-segment"
                  }`}
                >
                  <input
                    type="radio"
                    name="share-format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={() => {
                      setFormat(option.value);
                      setCopied(false);
                      setCopyError(false);
                      setSaveWarning(false);
                    }}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-2">
            <span className="ui-label">Preview</span>
            <textarea
              ref={textareaRef}
              readOnly
              dir="auto"
              value={previewText}
              rows={14}
              className="ui-textarea bg-accent-cream/50 font-mono"
            />
          </label>

          {copyError ? (
            <p className="text-sm text-accent-yellow">
              Clipboard unavailable — select the text above and copy manually.
            </p>
          ) : null}

          {copied ? (
            <p className="text-sm text-accent-blue">
              Copied{isSaving ? "…" : ""}
            </p>
          ) : null}

          {saveWarning ? (
            <p className="text-sm text-accent-yellow">
              Copied, but export history was not saved.
            </p>
          ) : null}

          <button
            type="button"
            disabled={!previewText.trim() || isSaving}
            onClick={handleCopy}
            className="ui-btn-primary w-full"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </SimpleSheet>
    </>
  );
}
