"use client";

import { Check, Copy, Download, Maximize2 } from "lucide-react";
import type { RefObject } from "react";

import type { DiagramExportFormat } from "@/lib/life-lab/diagram-export";

type DiagramAssetToolbarProps = {
  onFullscreen: () => void;
  onDownload: (format: DiagramExportFormat) => void;
  onCopySource: () => void;
  copied?: boolean;
  busyFormat?: DiagramExportFormat | null;
  sourceLabel?: string;
  fullscreenButtonRef?: RefObject<HTMLButtonElement | null>;
  variant?: "overlay" | "dialog";
};

export function DiagramAssetToolbar({
  onFullscreen,
  onDownload,
  onCopySource,
  copied = false,
  busyFormat = null,
  sourceLabel = "Mermaid",
  fullscreenButtonRef,
  variant = "overlay",
}: DiagramAssetToolbarProps) {
  return (
    <div
      className={`ui-diagram-toolbar${variant === "dialog" ? " ui-diagram-toolbar-dialog" : ""}`}
      role="toolbar"
      aria-label="Diagram actions"
    >
      {variant === "overlay" ? (
        <button
          ref={fullscreenButtonRef}
          type="button"
          className="ui-diagram-action"
          onClick={onFullscreen}
          aria-label="Open fullscreen"
          title="Open fullscreen"
        >
          <Maximize2 className="size-3.5" aria-hidden="true" />
          <span>Fullscreen</span>
        </button>
      ) : null}
      {(["png", "svg"] as const).map((format) => (
        <button
          key={format}
          type="button"
          className="ui-diagram-action"
          onClick={() => onDownload(format)}
          disabled={busyFormat !== null}
          aria-label={`Download ${format.toUpperCase()}`}
          title={`Download ${format.toUpperCase()}`}
        >
          <Download className="size-3.5" aria-hidden="true" />
          <span>{busyFormat === format ? "Preparing…" : format.toUpperCase()}</span>
        </button>
      ))}
      <button
        type="button"
        className="ui-diagram-action"
        onClick={() => onDownload("source")}
        disabled={busyFormat !== null}
        aria-label={`Download ${sourceLabel} source`}
        title={`Download ${sourceLabel} source`}
      >
        <Download className="size-3.5" aria-hidden="true" />
        <span>{busyFormat === "source" ? "Preparing…" : `${sourceLabel} source`}</span>
      </button>
      <button
        type="button"
        className="ui-diagram-action"
        onClick={onCopySource}
        aria-label={`Copy ${sourceLabel} source`}
        title={`Copy ${sourceLabel} source`}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        <span>{copied ? "Copied" : "Copy source"}</span>
      </button>
    </div>
  );
}
