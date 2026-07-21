"use client";

import { useState, type RefObject } from "react";

import { DiagramAssetToolbar } from "@/components/life-lab/diagram-asset-toolbar";
import { DiagramExpandDialog } from "@/components/life-lab/diagram-expand-dialog";
import { useLifeLabDiagramAsset } from "@/components/life-lab/life-lab-diagram-assets";
import { useMermaidRender } from "@/components/life-lab/use-mermaid-render";
import { usePreferredDiagramSvg } from "@/components/life-lab/use-preferred-diagram-svg";
import {
  copyDiagramSource,
  downloadDiagramExport,
  type DiagramExportFormat,
} from "@/lib/life-lab/diagram-export";

type MermaidDiagramDialogProps = {
  open: boolean;
  onClose: () => void;
  code: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  title?: string;
  subtitle?: string;
};

export function MermaidDiagramDialog({
  open,
  onClose,
  code,
  returnFocusRef,
  title = "Learning map",
  subtitle,
}: MermaidDiagramDialogProps) {
  const { preparedSvg, failed } = useMermaidRender(code, {
    sizeProfile: "dialog",
    enabled: open && Boolean(code.trim()),
    renderKey: "diagram-dialog",
  });
  const diagramAsset = useLifeLabDiagramAsset(code);
  const { preferredSvg, preferredSvgChecked } = usePreferredDiagramSvg(
    diagramAsset.savedAssetUrls.svg,
  );
  const displaySvg = preferredSvg ?? preparedSvg;
  const [busyFormat, setBusyFormat] = useState<DiagramExportFormat | null>(null);
  const [copied, setCopied] = useState(false);

  async function download(format: DiagramExportFormat): Promise<void> {
    if (!displaySvg || busyFormat) {
      return;
    }

    setBusyFormat(format);

    try {
      await downloadDiagramExport(
        {
          provider: "mermaid",
          title,
          source: code,
          sourceExtension: "mmd",
          svg: displaySvg.html,
          preferredAssetUrls: diagramAsset.savedAssetUrls,
        },
        format,
      );
    } finally {
      setBusyFormat(null);
    }
  }

  async function copySource(): Promise<void> {
    await copyDiagramSource(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const toolbar = displaySvg ? (
    <DiagramAssetToolbar
      variant="dialog"
      onFullscreen={() => undefined}
      onDownload={(format) => void download(format)}
      onCopySource={() => void copySource()}
      copied={copied}
      busyFormat={busyFormat}
      exportSource={preferredSvg ? "saved" : diagramAsset.exportSource}
    />
  ) : null;

  return (
    <DiagramExpandDialog
      open={open}
      onClose={onClose}
      svgHtml={displaySvg?.html ?? null}
      returnFocusRef={returnFocusRef}
      title={title}
      subtitle={subtitle}
      toolbar={toolbar}
      errorMessage={
        (failed && preferredSvgChecked && !preferredSvg) || !code.trim()
          ? "This diagram could not be rendered."
          : null
      }
    />
  );
}
