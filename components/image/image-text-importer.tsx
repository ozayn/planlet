"use client";

import { useEffect, useRef, useState } from "react";

import type { ExtractImageTextResult } from "@/lib/ai/extract-image-text";
import {
  formatFileSize,
  MAX_IMAGE_UPLOAD_BYTES,
  PICKER_IMAGE_ACCEPT,
  PICKER_MAX_IMAGE_BYTES,
  SLOW_EXTRACTION_HINT_MS,
} from "@/lib/image/constants";
import { prepareImageForUpload } from "@/lib/image/prepare-image-upload";

export type ImageExtractionResult = Pick<
  ExtractImageTextResult,
  | "text"
  | "dateHint"
  | "removedHeaderLines"
  | "possibleTitle"
  | "itemHints"
  | "multipleDateSectionsDetected"
> & {
  language?: string;
};

type ImageTextImporterProps = {
  onExtracted: (result: ImageExtractionResult) => void;
};

type ImporterStatus =
  | "idle"
  | "ready"
  | "preparing"
  | "extracting"
  | "cleaning";

const CLIENT_FETCH_TIMEOUT_MS = 45_000;

const GENERIC_FAILURE_MESSAGE =
  "Couldn't extract this image cleanly. Try cropping closer to the writing or paste the text manually.";

function progressLabel(status: ImporterStatus): string | null {
  switch (status) {
    case "preparing":
      return "Preparing image…";
    case "extracting":
      return "Extracting handwriting…";
    case "cleaning":
      return "Cleaning text…";
    default:
      return null;
  }
}

export function ImageTextImporter({ onExtracted }: ImageTextImporterProps) {
  const [status, setStatus] = useState<ImporterStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [wasResized, setWasResized] = useState(false);
  const [showSlowHint, setShowSlowHint] = useState(false);

  const imageFileRef = useRef<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const slowHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSlowHintTimer() {
    if (slowHintTimerRef.current) {
      clearTimeout(slowHintTimerRef.current);
      slowHintTimerRef.current = null;
    }
  }

  function startSlowHintTimer() {
    clearSlowHintTimer();
    setShowSlowHint(false);
    slowHintTimerRef.current = setTimeout(() => {
      setShowSlowHint(true);
    }, SLOW_EXTRACTION_HINT_MS);
  }

  function resetImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    imageFileRef.current = null;
    setPreviewUrl(null);
    setFileName(null);
    setWasResized(false);
    setStatus("idle");
    setError(null);
    setSuccess(null);
    setWarning(null);
    setShowSlowHint(false);
    clearSlowHintTimer();

    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      clearSlowHintTimer();
    };
  }, [previewUrl]);

  const isBusy =
    status === "preparing" || status === "extracting" || status === "cleaning";

  function handleFileSelected(file: File | undefined) {
    setError(null);
    setSuccess(null);
    setWarning(null);
    setWasResized(false);

    if (!file) {
      return;
    }

    if (file.size === 0) {
      setError("Image file is empty.");
      return;
    }

    if (file.size > PICKER_MAX_IMAGE_BYTES) {
      setError(
        `Image is too large. Maximum size is ${formatFileSize(PICKER_MAX_IMAGE_BYTES)}.`,
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Unsupported file type. Choose a photo or image.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    imageFileRef.current = file;
    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name || "Selected image");
    setStatus("ready");
  }

  async function extractText() {
    const file = imageFileRef.current;

    if (!file) {
      setError("Choose an image before extracting text.");
      return;
    }

    setError(null);
    setSuccess(null);
    setWarning(null);
    setShowSlowHint(false);
    clearSlowHintTimer();

    const controller = new AbortController();
    const fetchTimeoutId = setTimeout(() => {
      controller.abort();
    }, CLIENT_FETCH_TIMEOUT_MS);

    try {
      setStatus("preparing");

      const prepared = await prepareImageForUpload(file);
      setWasResized(prepared.wasResized);

      if (prepared.file.size > MAX_IMAGE_UPLOAD_BYTES) {
        throw new Error(
          `Prepared image is still too large (${formatFileSize(prepared.file.size)}). Try cropping closer to the note.`,
        );
      }

      setStatus("extracting");
      startSlowHintTimer();

      const formData = new FormData();
      formData.append("image", prepared.file, prepared.file.name);

      const response = await fetch("/api/extract-image-text", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const data = (await response.json()) as ImageExtractionResult & {
        error?: string;
        imperfect?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? GENERIC_FAILURE_MESSAGE);
      }

      if (!data.text?.trim()) {
        throw new Error(GENERIC_FAILURE_MESSAGE);
      }

      setStatus("cleaning");

      await new Promise((resolve) => {
        setTimeout(resolve, 150);
      });

      onExtracted({
        text: data.text.trim(),
        language: data.language,
        dateHint: data.dateHint ?? { detected: false, confidence: "LOW" },
        removedHeaderLines: data.removedHeaderLines ?? [],
        possibleTitle: data.possibleTitle ?? undefined,
        itemHints: data.itemHints ?? [],
        multipleDateSectionsDetected: data.multipleDateSectionsDetected ?? false,
      });

      if (data.imperfect) {
        setWarning(
          "Extraction was imperfect. Please review before structuring.",
        );
      } else if (data.multipleDateSectionsDetected) {
        setWarning(
          "This image may contain multiple dates. Please review before saving.",
        );
      } else {
        const dateMessage = data.dateHint?.detected
          ? " Review the detected date before structuring."
          : "";
        setSuccess(`Text extracted.${dateMessage}`);
      }

      setStatus("ready");
    } catch (extractError) {
      if (extractError instanceof Error && extractError.name === "AbortError") {
        setError(
          "Extraction took too long. Try cropping the image closer to the note.",
        );
      } else {
        setError(
          extractError instanceof Error
            ? extractError.message
            : GENERIC_FAILURE_MESSAGE,
        );
      }

      setStatus("ready");
    } finally {
      clearTimeout(fetchTimeoutId);
      clearSlowHintTimer();
      setShowSlowHint(false);
    }
  }

  const progress = progressLabel(status);

  return (
    <div className="space-y-4 rounded-2xl border border-border-soft bg-accent-cream/30 p-4">
      <p className="text-sm font-medium text-foreground">Upload a notebook photo</p>

      <p className="text-xs text-muted-light">
        For handwriting, crop close to the note and avoid extra page margins.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={isBusy}
          className="ui-btn-secondary"
        >
          Choose image
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isBusy}
          className="ui-btn-secondary"
        >
          Take photo
        </button>
        {previewUrl ? (
          <>
            <button
              type="button"
              onClick={extractText}
              disabled={isBusy}
              className="ui-btn-primary"
            >
              {isBusy ? "Working…" : "Extract text"}
            </button>
            <button
              type="button"
              onClick={resetImage}
              disabled={isBusy}
              className="ui-btn-secondary"
            >
              Delete
            </button>
          </>
        ) : null}
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept={PICKER_IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => handleFileSelected(event.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => handleFileSelected(event.target.files?.[0])}
      />

      {previewUrl ? (
        <figure className="overflow-hidden rounded-xl border border-border-soft bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={fileName ? `Preview of ${fileName}` : "Selected notebook image"}
            className="max-h-64 w-full object-contain"
          />
          {fileName ? (
            <figcaption className="border-t border-border-soft px-3 py-2 text-xs text-muted">
              {fileName}
              {wasResized ? (
                <span className="block text-muted-light">
                  This image was resized before extraction.
                </span>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {progress ? <p className="text-sm text-muted">{progress}</p> : null}

      {showSlowHint ? (
        <p className="text-sm text-muted">
          Handwriting can take a little longer. Cropped, well-lit images work
          best.
        </p>
      ) : null}

      {success ? <p className="text-sm text-muted">{success}</p> : null}

      {warning ? (
        <p className="rounded-2xl border border-border-soft bg-accent-cream/35 px-4 py-3 text-sm text-foreground">
          {warning}
        </p>
      ) : null}

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <p className="text-xs text-muted-light">
        Large photos are resized automatically. Images are not stored.
      </p>
    </div>
  );
}
