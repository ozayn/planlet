"use client";

import { useRef, useState } from "react";

import { DiagramAssetToolbar } from "@/components/life-lab/diagram-asset-toolbar";
import { useLifeLabDiagramAsset } from "@/components/life-lab/life-lab-diagram-assets";
import { MermaidDiagramDialog } from "@/components/life-lab/mermaid-diagram-dialog";
import { useMermaidRender } from "@/components/life-lab/use-mermaid-render";
import { useMermaidViewport } from "@/components/life-lab/use-mermaid-viewport";
import { usePreferredDiagramSvg } from "@/components/life-lab/use-preferred-diagram-svg";
import {
  copyDiagramSource,
  downloadDiagramExport,
  type DiagramExportFormat,
} from "@/lib/life-lab/diagram-export";

type MermaidBlockProps = {
  code: string;
};

export function MermaidBlock({ code }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [busyFormat, setBusyFormat] = useState<DiagramExportFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const diagramAsset = useLifeLabDiagramAsset(code);
  const { preferredSvg, preferredSvgChecked } = usePreferredDiagramSvg(
    diagramAsset.savedAssetUrls.svg,
  );
  const { sizeProfile, scrollable, isMobile } = useMermaidViewport(containerRef, {
    variant: "inline",
    contentReady: Boolean(code.trim()),
  });
  const { preparedSvg, failed } = useMermaidRender(code, {
    sizeProfile,
    renderKey: sizeProfile,
  });
  const displaySvg = preferredSvg ?? preparedSvg;

  if (failed && preferredSvgChecked && !preferredSvg) {
    return (
      <pre className="ui-mermaid-fallback">
        <code>{code}</code>
      </pre>
    );
  }

  function openViewer(): void {
    setExpanded(true);
  }

  async function download(format: DiagramExportFormat): Promise<void> {
    if (!displaySvg || busyFormat) {
      return;
    }

    setBusyFormat(format);

    try {
      await downloadDiagramExport(
        {
          provider: "mermaid",
          title: diagramAsset.diagramId ?? "life-lab-diagram",
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

  return (
    <>
      <div
        ref={containerRef}
        className="ui-mermaid ui-mermaid-responsive ui-mermaid-with-expand"
        data-profile={sizeProfile}
        aria-busy={!displaySvg}
      >
        {displaySvg ? (
          <>
            <div className="ui-mermaid-affordances">
              {scrollable ? (
                <p className="ui-mermaid-affordance ui-mermaid-affordance-scroll">
                  Scroll sideways
                </p>
              ) : null}
            </div>
            <div
              className={`ui-mermaid-scroll${isMobile ? " ui-mermaid-scroll-tappable" : ""}`}
              onClick={isMobile ? openViewer : undefined}
              onKeyDown={
                isMobile
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openViewer();
                      }
                    }
                  : undefined
              }
              role={isMobile ? "button" : undefined}
              tabIndex={isMobile ? 0 : undefined}
              aria-label={isMobile ? "Open diagram viewer" : undefined}
            >
              <div
                className="ui-mermaid-svg"
                dangerouslySetInnerHTML={{ __html: displaySvg.html }}
              />
            </div>
            <DiagramAssetToolbar
              onFullscreen={openViewer}
              onDownload={(format) => void download(format)}
              onCopySource={() => void copySource()}
              copied={copied}
              busyFormat={busyFormat}
              fullscreenButtonRef={expandButtonRef}
              exportSource={
                preferredSvg
                  ? "saved"
                  : diagramAsset.exportSource === "none"
                    ? "none"
                    : "browser"
              }
            />
          </>
        ) : (
          <p className="ui-mermaid-loading">Rendering diagram…</p>
        )}
      </div>
      <MermaidDiagramDialog
        open={expanded}
        onClose={() => setExpanded(false)}
        code={code}
        returnFocusRef={expandButtonRef}
        title="Learning map"
      />
    </>
  );
}
