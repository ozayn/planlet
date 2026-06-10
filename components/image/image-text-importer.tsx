"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatFileSize,
  MAX_IMAGE_UPLOAD_BYTES,
  PICKER_IMAGE_ACCEPT,
} from "@/lib/image/constants";

type ImageTextImporterProps = {
  onExtracted: (text: string) => void;
};

type ImporterStatus = "idle" | "ready" | "extracting";

export function ImageTextImporter({ onExtracted }: ImageTextImporterProps) {
  const [status, setStatus] = useState<ImporterStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const imageFileRef = useRef<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function resetImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    imageFileRef.current = null;
    setPreviewUrl(null);
    setFileName(null);
    setStatus("idle");
    setError(null);
    setSuccess(null);

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
    };
  }, [previewUrl]);

  function handleFileSelected(file: File | undefined) {
    setError(null);
    setSuccess(null);

    if (!file) {
      return;
    }

    if (file.size === 0) {
      setError("Image file is empty.");
      return;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(
        `Image is too large. Maximum size is ${formatFileSize(MAX_IMAGE_UPLOAD_BYTES)}.`,
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
    setStatus("extracting");

    const formData = new FormData();
    formData.append("image", file, file.name || "notebook.jpg");

    try {
      const response = await fetch("/api/extract-image-text", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        text?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Text extraction failed.");
      }

      if (!data.text?.trim()) {
        throw new Error("No text could be extracted from the image.");
      }

      onExtracted(data.text.trim());
      setSuccess("Text extracted. You can edit it before structuring.");
      setStatus("ready");
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Text extraction failed.",
      );
      setStatus("ready");
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border-soft bg-accent-cream/30 p-4">
      <p className="text-sm font-medium text-foreground">Upload a notebook photo</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={status === "extracting"}
          className="ui-btn-secondary"
        >
          Choose image
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={status === "extracting"}
          className="ui-btn-secondary"
        >
          Take photo
        </button>
        {previewUrl ? (
          <>
            <button
              type="button"
              onClick={extractText}
              disabled={status === "extracting"}
              className="ui-btn-primary"
            >
              {status === "extracting" ? "Extracting…" : "Extract text"}
            </button>
            <button
              type="button"
              onClick={resetImage}
              disabled={status === "extracting"}
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
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {status === "extracting" ? (
        <p className="text-sm text-muted">Extracting text from image…</p>
      ) : null}

      {success ? <p className="text-sm text-muted">{success}</p> : null}

      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      <p className="text-xs text-muted-light">
        JPEG, PNG, or WebP up to {formatFileSize(MAX_IMAGE_UPLOAD_BYTES)}. Images
        are not stored.
      </p>
    </div>
  );
}
