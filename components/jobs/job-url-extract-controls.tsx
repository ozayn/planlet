"use client";

import { useState } from "react";

import {
  extractJobFromTextAction,
  extractJobFromUrlAction,
  type JobTrackerExtractResult,
} from "@/app/(app)/jobs/actions";
import type { ExtractedJobDetails } from "@/lib/ai/extracted-job-details";
import { hasExtractedContent } from "@/lib/ai/extracted-job-details";
import { normalizeJobUrlForStorage } from "@/lib/job-url-normalization";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

function isPartialExtraction(details: ExtractedJobDetails): boolean {
  return (
    hasExtractedContent(details) &&
    !details.description?.trim() &&
    !details.summary?.trim()
  );
}

type JobUrlExtractControlsProps = {
  url: string;
  onUrlChange: (url: string) => void;
  onExtracted: (details: ExtractedJobDetails, canonicalUrl?: string) => void;
  disabled?: boolean;
  urlInputId: string;
  urlInputName: string;
  pasteInputId: string;
};

export function JobUrlExtractControls({
  url,
  onUrlChange,
  onExtracted,
  disabled = false,
  urlInputId,
  urlInputName,
  pasteInputId,
}: JobUrlExtractControlsProps) {
  const [fetchNotice, setFetchNotice] = useState<{
    tone: "error" | "success" | "info";
    message: string;
  } | null>(null);
  const [showPasteFallback, setShowPasteFallback] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isExtractingPaste, setIsExtractingPaste] = useState(false);

  function applyExtractResult(result: JobTrackerExtractResult) {
    if (!result.ok) {
      setFetchNotice({
        tone: result.code === "linkedin_blocked" ? "info" : "error",
        message: result.message,
      });
      if (result.suggestPasteFallback) {
        setShowPasteFallback(true);
      }
      if (result.canonicalUrl && result.canonicalUrl !== url.trim()) {
        onUrlChange(result.canonicalUrl);
      }
      if (result.details) {
        onExtracted(result.details, result.canonicalUrl);
      }
      return;
    }

    if (result.canonicalUrl && result.canonicalUrl !== url.trim()) {
      onUrlChange(result.canonicalUrl);
    }

    onExtracted(result.details, result.canonicalUrl);
    setFetchNotice({
      tone: isPartialExtraction(result.details) ? "info" : "success",
      message: isPartialExtraction(result.details)
        ? "Some information could not be extracted. You can edit it later."
        : "Details filled in. Review before saving.",
    });
    setShowPasteFallback(false);
  }

  async function handleFetchDetails() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || isFetchingUrl || disabled) {
      return;
    }

    setFetchNotice(null);
    setIsFetchingUrl(true);

    try {
      const normalizedUrl = normalizeJobUrlForStorage(trimmedUrl);
      if (normalizedUrl !== trimmedUrl) {
        onUrlChange(normalizedUrl);
      }

      const result = await extractJobFromUrlAction(normalizedUrl);
      applyExtractResult(result);
    } finally {
      setIsFetchingUrl(false);
    }
  }

  async function handleExtractFromPaste() {
    const trimmedPaste = pasteText.trim();
    if (!trimmedPaste || isExtractingPaste || disabled) {
      return;
    }

    setFetchNotice(null);
    setIsExtractingPaste(true);

    try {
      const result = await extractJobFromTextAction(trimmedPaste, url.trim() || undefined);
      applyExtractResult(result);
    } finally {
      setIsExtractingPaste(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={urlInputId}
          name={urlInputName}
          type="url"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://..."
          disabled={disabled || isFetchingUrl || isExtractingPaste}
          className="ui-input min-h-10 flex-1 px-3 text-sm"
          {...passwordManagerSafeControlProps}
        />
        <button
          type="button"
          disabled={disabled || isFetchingUrl || isExtractingPaste || !url.trim()}
          onClick={handleFetchDetails}
          className="ui-btn-secondary min-h-10 px-3 text-sm"
        >
          {isFetchingUrl ? "Fetching…" : "Fetch details"}
        </button>
      </div>

      {fetchNotice ? (
        <p
          className={`text-sm ${
            fetchNotice.tone === "error"
              ? "text-accent-yellow"
              : fetchNotice.tone === "info"
                ? "text-muted"
                : "text-muted"
          }`}
          role={fetchNotice.tone === "error" ? "alert" : "status"}
        >
          {fetchNotice.message}
        </p>
      ) : null}

      {showPasteFallback ? (
        <div className="space-y-2 rounded-xl border border-border-soft px-3 py-3">
          <label htmlFor={pasteInputId} className="block space-y-1.5">
            <span className="text-xs text-muted">Paste job description</span>
            <p className="text-xs text-muted">
              Copy the LinkedIn &ldquo;About the job&rdquo; section and paste it here.
            </p>
            <textarea
              id={pasteInputId}
              name={pasteInputId}
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              disabled={disabled || isFetchingUrl || isExtractingPaste}
              rows={5}
              placeholder="Paste the job description here…"
              className="ui-input w-full px-3 py-2 text-sm"
              {...passwordManagerSafeControlProps}
            />
          </label>
          <button
            type="button"
            disabled={
              disabled || isFetchingUrl || isExtractingPaste || !pasteText.trim()
            }
            onClick={handleExtractFromPaste}
            className="ui-btn-secondary min-h-10 px-3 text-sm"
          >
            {isExtractingPaste ? "Extracting…" : "Extract from pasted text"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
