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
        className="min-h-10 rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300"
      >
        Share
      </button>

      <SimpleSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Share plan"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Copy a calm snapshot to share. Non-shareable items are excluded.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Format
            </legend>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-11 cursor-pointer items-center rounded-xl border px-4 text-sm transition-colors ${
                    format === option.value
                      ? "border-teal-700 bg-teal-50 text-teal-900"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
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
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Preview
            </span>
            <textarea
              ref={textareaRef}
              readOnly
              dir="auto"
              value={previewText}
              rows={14}
              className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-sm leading-relaxed text-stone-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </label>

          {copyError ? (
            <p className="text-sm text-amber-700">
              Clipboard unavailable — select the text above and copy manually.
            </p>
          ) : null}

          {copied ? (
            <p className="text-sm text-teal-800">
              Copied{isSaving ? "…" : ""}
            </p>
          ) : null}

          {saveWarning ? (
            <p className="text-sm text-amber-700">
              Copied, but export history was not saved.
            </p>
          ) : null}

          <button
            type="button"
            disabled={!previewText.trim() || isSaving}
            onClick={handleCopy}
            className="min-h-12 w-full rounded-xl bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </SimpleSheet>
    </>
  );
}
